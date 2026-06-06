#!/usr/bin/env node
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { render, Box, useApp, useInput } from 'ink';
import { EventBus } from './core/events.js';
import { runClaudeCode } from './core/claudeCode.js';
import { isClaudeLoggedIn, runClaudeLogin } from './auth/claudeAuth.js';
import { App } from './ui/App.js';
import { Header } from './ui/Header.js';

export interface SlashActions {
  login: () => void;
  help: () => void;
  clear: () => void;
}

export async function routeSlashCommand(
  input: string,
  actions: SlashActions,
): Promise<'handled' | 'unknown' | 'passthrough'> {
  if (!input.startsWith('/')) return 'passthrough';
  const cmd = input.slice(1).split(/\s+/)[0];
  switch (cmd) {
    case 'login':
      actions.login();
      return 'handled';
    case 'help':
      actions.help();
      return 'handled';
    case 'clear':
      actions.clear();
      return 'handled';
    default:
      return 'unknown';
  }
}

function Root({ onRequestLogin }: { onRequestLogin: () => void }) {
  const bus = useMemo(() => new EventBus(), []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Checking your Claude Code login…');
  const [clearNonce, setClearNonce] = useState(0);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const { exit } = useApp();

  useEffect(() => {
    isClaudeLoggedIn().then((ok) => {
      setLoggedIn(ok);
      setNotice(
        ok
          ? 'Ready — running on your Claude Code (Max) login. Describe what to build, or /help.'
          : 'Not signed in to Claude Code. Type /login to sign in.',
      );
    });
  }, []);

  // Ctrl-C: interrupt the active run if busy, otherwise quit.
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (busy && controllerRef.current) {
        controllerRef.current.abort();
        setNotice('Interrupted.');
      } else {
        exit();
      }
    }
  });

  async function onSubmit(text: string) {
    const handled = await routeSlashCommand(text, {
      login: () => onRequestLogin(),
      help: () => setNotice('Commands: /login, /help, /clear. Otherwise, just describe what to build.'),
      clear: () => {
        setClearNonce((n) => n + 1);
        setNotice('Cleared.');
      },
    });
    if (handled !== 'passthrough') {
      if (handled === 'unknown') setNotice(`Unknown command: ${text}`);
      return;
    }
    if (loggedIn === false) {
      setNotice('Not signed in to Claude Code. Type /login first.');
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
      });
      if (!result.ok) {
        setNotice(result.error ? `Error: ${result.error}` : 'The run failed.');
      }
    } finally {
      setBusy(false);
      controllerRef.current = null;
    }
  }

  const status = loggedIn === null ? '…' : loggedIn ? 'MAX' : 'OFFLINE';

  return (
    <Box flexDirection="column">
      <Header notice={notice} status={status} />
      <App bus={bus} onUserSubmit={onSubmit} busy={busy} clearNonce={clearNonce} online={loggedIn === true} />
    </Box>
  );
}

let currentInstance: ReturnType<typeof render> | null = null;

function mount(): void {
  currentInstance = render(<Root onRequestLogin={handleLogin} />, { exitOnCtrlC: false });
}

/** Release the terminal, run Claude Code's interactive login, then remount. */
async function handleLogin(): Promise<void> {
  currentInstance?.unmount();
  currentInstance = null;
  process.stdout.write('\n');
  await runClaudeLogin();
  mount();
}

// Mount only when run as the entry point (node dist/cli.js or tsx src/cli.tsx).
const entry = process.argv[1] ?? '';
if (/[\\/]cli\.(js|tsx)$/.test(entry)) {
  mount();
}
