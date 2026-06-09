#!/usr/bin/env node
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { render, Box, useApp, useInput } from 'ink';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { EventBus } from './core/events.js';
import { runClaudeCode, compactSession } from './core/claudeCode.js';
import { createInterface } from 'node:readline';
import { isJarvisLoggedIn, runJarvisLogin, clearJarvisToken } from './auth/jarvisAuth.js';
import {
  configExists,
  getDisplayName,
  validateName,
  writeConfig,
  isDevopsEnabled,
  setDevopsEnabled,
  getSpeakMode,
  setSpeakMode as persistSpeakMode,
  cycleSpeakMode,
  type SpeakMode,
} from './core/config.js';
import { planAlias, createAlias, aliasInstructions } from './core/setup.js';
import { Dictation, hearAvailable } from './core/dictation.js';
import { App } from './ui/App.js';
import { Header } from './ui/Header.js';

export interface SlashActions {
  login: () => void;
  logout: () => void;
  help: () => void;
  clear: () => void;
  compact: () => void;
  devops: () => void;
  btw: (note: string) => void;
  speak: () => void;
}

export async function routeSlashCommand(
  input: string,
  actions: SlashActions,
): Promise<'handled' | 'unknown' | 'passthrough'> {
  if (!input.startsWith('/')) return 'passthrough';
  const cmd = input.slice(1).split(/\s+/)[0];
  const rest = input.slice(1 + cmd.length).trim();
  switch (cmd) {
    case 'login':
      actions.login();
      return 'handled';
    case 'logout':
      actions.logout();
      return 'handled';
    case 'help':
      actions.help();
      return 'handled';
    case 'clear':
      actions.clear();
      return 'handled';
    case 'compact':
      actions.compact();
      return 'handled';
    case 'devops':
      actions.devops();
      return 'handled';
    case 'btw':
      actions.btw(rest);
      return 'handled';
    case 'speak':
      actions.speak();
      return 'handled';
    default:
      return 'unknown';
  }
}

function Root({ onRequestLogin, onRequestClear }: { onRequestLogin: () => void; onRequestClear: () => void }) {
  const bus = useMemo(() => new EventBus(), []);
  const name = useMemo(() => getDisplayName(), []);
  // One conversation per mount. /clear remounts, which mints a fresh id and
  // resets `started` — so the crew starts over with no memory.
  const sessionId = useMemo(() => randomUUID(), []);
  const startedRef = useRef(false);
  const [devops, setDevops] = useState(() => isDevopsEnabled());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Checking your Jarvis sign-in…');
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  // /btw notes dropped while the crew is busy, delivered when Atlas is free.
  const btwQueueRef = useRef<string[]>([]);
  // Voice: read-aloud mode + push-to-talk dictation.
  const [speakMode, setSpeakMode] = useState<SpeakMode>(() => getSpeakMode());
  const [injectText, setInjectText] = useState('');
  const [injectNonce, setInjectNonce] = useState(0);
  const dictationRef = useRef(new Dictation());
  const { exit } = useApp();

  // ⌃T — push-to-talk: start the mic, then drop the transcript into the box.
  function toggleDictation() {
    if (dictationRef.current.active) {
      const text = dictationRef.current.stop().trim();
      if (text) {
        setInjectText(text);
        setInjectNonce((n) => n + 1);
        setNotice('🎤 Transcribed — review and press Enter to send.');
      } else {
        setNotice('🎤 Didn’t catch anything. ⌃T to try again.');
      }
      return;
    }
    if (!hearAvailable()) {
      setNotice('Dictation needs the `hear` CLI — run: brew install hear');
      return;
    }
    dictationRef.current.start();
    setNotice('🎤 Listening… speak, then ⌃T to stop.');
  }

  // A /btw turn: a direct line to Atlas (no crew), on the same session.
  async function runBtw(note: string) {
    setBusy(true);
    setNotice('Atlas is on your note…');
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await runClaudeCode({
        userText: note,
        bus,
        cwd: process.cwd(),
        signal: controller.signal,
        sessionId,
        resume: startedRef.current,
        devops,
        direct: true,
      });
      if (!result.ok) setNotice(result.error ? `Error: ${result.error}` : 'The note failed.');
    } finally {
      startedRef.current = true;
      setBusy(false);
      controllerRef.current = null;
      drainBtw();
    }
  }

  // Run the next queued /btw once Atlas is free.
  function drainBtw() {
    const next = btwQueueRef.current.shift();
    if (next) void runBtw(next);
  }

  async function handleCompact() {
    if (loggedIn === false) {
      setNotice('Not signed in. Type /login first.');
      return;
    }
    if (!startedRef.current) {
      setNotice('Nothing to compact yet — start a conversation first.');
      return;
    }
    setBusy(true);
    setNotice('Compacting the conversation…');
    try {
      const { ok, message } = await compactSession(sessionId);
      setNotice(ok ? `✔ ${message}` : `Compaction: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const ok = isJarvisLoggedIn();
    setLoggedIn(ok);
    setNotice(
      ok
        ? 'Ready — signed in to Jarvis. Describe what to build, or /help.'
        : 'Welcome to Jarvis. Type /login to sign in.',
    );
  }, []);

  // ⌃C interrupts/quits; ⌃T toggles push-to-talk dictation.
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (busy && controllerRef.current) {
        controllerRef.current.abort();
        setNotice('Interrupted.');
      } else {
        exit();
      }
    } else if (key.ctrl && input === 't') {
      toggleDictation();
    }
  });

  async function onSubmit(text: string) {
    const handled = await routeSlashCommand(text, {
      login: () => onRequestLogin(),
      logout: () => {
        clearJarvisToken();
        setLoggedIn(false);
        setNotice('Signed out. Type /login to sign back in.');
      },
      help: () =>
        setNotice(
          'Commands: /login, /logout, /btw <note>, /speak, /compact, /devops, /clear, /help · ⌃T to dictate.',
        ),
      speak: () => {
        const next = cycleSpeakMode(speakMode);
        persistSpeakMode(next);
        setSpeakMode(next);
        setNotice(
          next === 'off'
            ? '🔈 Read-aloud off.'
            : next === 'final'
              ? '🔊 Read-aloud: final summary only.'
              : '🔊 Read-aloud: everything.',
        );
      },
      clear: () => onRequestClear(),
      compact: () => {
        void handleCompact();
      },
      btw: (note: string) => {
        if (loggedIn === false) {
          setNotice('Not signed in. Type /login first.');
          return;
        }
        const text = note.trim();
        if (!text) {
          setNotice('Usage: /btw <a quick note or question for Atlas>');
          return;
        }
        if (busy) {
          btwQueueRef.current.push(text);
          setNotice(`📝 Noted — Atlas will pick it up when free (${btwQueueRef.current.length} queued).`);
        } else {
          void runBtw(text);
        }
      },
      devops: () => {
        const next = !devops;
        setDevopsEnabled(next);
        setDevops(next);
        setNotice(
          next
            ? '🛠 Forge (DevOps) joined the crew — Atlas can now delegate CI/CD, Docker, and deploys.'
            : 'Forge (DevOps) stood down.',
        );
      },
    });
    if (handled !== 'passthrough') {
      if (handled === 'unknown') setNotice(`Unknown command: ${text}`);
      return;
    }
    if (loggedIn === false) {
      setNotice('Not signed in. Type /login first.');
      return;
    }
    if (busy) {
      // A run is already in flight — don't start a second on the same session.
      setNotice('Atlas is busy — drop a /btw note, or wait for the current task.');
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await runClaudeCode({
        userText: text,
        bus,
        cwd: process.cwd(),
        signal: controller.signal,
        sessionId,
        resume: startedRef.current,
        devops,
      });
      if (!result.ok) {
        setNotice(result.error ? `Error: ${result.error}` : 'The run failed.');
      }
    } finally {
      // The session now exists, so every later turn resumes it.
      startedRef.current = true;
      setBusy(false);
      controllerRef.current = null;
      drainBtw();
    }
  }

  const status = loggedIn === null ? '…' : loggedIn ? 'MAX' : 'OFFLINE';

  return (
    <Box flexDirection="column">
      <Header notice={notice} status={status} name={name} />
      <App
        bus={bus}
        onUserSubmit={onSubmit}
        busy={busy}
        online={loggedIn === true}
        speakMode={speakMode}
        injectText={injectText}
        injectNonce={injectNonce}
      />
    </Box>
  );
}

let currentInstance: ReturnType<typeof render> | null = null;

function mount(): void {
  currentInstance = render(<Root onRequestLogin={handleLogin} onRequestClear={handleClear} />, {
    exitOnCtrlC: false,
  });
}

/** Release the terminal, run Jarvis's browser sign-in, then remount. */
async function handleLogin(): Promise<void> {
  currentInstance?.unmount();
  currentInstance = null;
  process.stdout.write('\nSigning in to Jarvis — your browser will open…\n');
  const { ok } = await runJarvisLogin();
  process.stdout.write(ok ? '\nSigned in to Jarvis.\n' : '\nSign-in did not complete. Try /login again.\n');
  mount();
}

/**
 * Remount on /clear. <Static> output (the transcript) lives in the terminal
 * scrollback and can't be un-printed within a running Ink instance, so a fresh
 * instance + a screen+scrollback clear is the clean way to start over.
 */
function handleClear(): void {
  currentInstance?.unmount();
  currentInstance = null;
  process.stdout.write('\x1B[2J\x1B[3J\x1B[H'); // clear screen, scrollback, home cursor
  mount();
}

/**
 * One-time naming wizard. Runs before the Ink app mounts (so it can prompt on a
 * real terminal), stores the chosen name, and — for a custom name — adds a
 * command alias so typing that name launches Jarvis too.
 */
async function runSetup(): Promise<void> {
  // Non-interactive (piped / CI): take the default silently rather than hang.
  if (!process.stdin.isTTY) {
    writeConfig({ name: 'jarvis' });
    return;
  }
  process.stdout.write('\n  Welcome to Jarvis — your multi-agent coding crew.\n\n');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));

  let name = 'jarvis';
  for (;;) {
    const raw = await ask("  Name this assistant — press Enter for 'jarvis', or type a custom name: ");
    const v = validateName(raw);
    if (v.ok) {
      name = v.name;
      break;
    }
    process.stdout.write(`  ${v.error}\n`);
  }
  rl.close();
  writeConfig({ name });

  if (name === 'jarvis') {
    process.stdout.write('\n  ✓ All set. Launching…\n\n');
    return;
  }
  const plan = planAlias(name, process.argv[1]);
  if (createAlias(plan)) {
    process.stdout.write(`\n  ✓ Run \`${name}\` (or \`jarvis\`) anytime to launch.\n\n`);
  } else {
    process.stdout.write('\n' + aliasInstructions(plan, name).replace(/^/gm, '  ') + '\n\n');
  }
}

// Mount only when this file is the entry point — works for `node dist/cli.js`,
// `tsx src/cli.tsx`, AND the global `jarvis` symlink (which we resolve via
// realpath). Stays false when imported by tests.
function isEntrypoint(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return realpathSync(argv1) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  // `jarvis setup` re-runs the wizard; otherwise run it once on first launch.
  if (process.argv[2] === 'setup' || !configExists()) {
    await runSetup();
  }
  mount();
}

if (isEntrypoint()) {
  void main();
}
