#!/usr/bin/env node
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { render, Box, useApp, useInput } from 'ink';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { EventBus } from './core/events.js';
import { runClaudeCode } from './core/claudeCode.js';
import { isJarvisLoggedIn, runJarvisLogin, clearJarvisToken } from './auth/jarvisAuth.js';
import { App } from './ui/App.js';
import { Header } from './ui/Header.js';

export interface SlashActions {
  login: () => void;
  logout: () => void;
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
    case 'logout':
      actions.logout();
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

function Root({ onRequestLogin, onRequestClear }: { onRequestLogin: () => void; onRequestClear: () => void }) {
  const bus = useMemo(() => new EventBus(), []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Checking your Jarvis sign-in…');
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const { exit } = useApp();

  useEffect(() => {
    const ok = isJarvisLoggedIn();
    setLoggedIn(ok);
    setNotice(
      ok
        ? 'Ready — signed in to Jarvis. Describe what to build, or /help.'
        : 'Welcome to Jarvis. Type /login to sign in.',
    );
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
      logout: () => {
        clearJarvisToken();
        setLoggedIn(false);
        setNotice('Signed out. Type /login to sign back in.');
      },
      help: () => setNotice('Commands: /login, /logout, /help, /clear. Otherwise, just describe what to build.'),
      clear: () => onRequestClear(),
    });
    if (handled !== 'passthrough') {
      if (handled === 'unknown') setNotice(`Unknown command: ${text}`);
      return;
    }
    if (loggedIn === false) {
      setNotice('Not signed in. Type /login first.');
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
      <App bus={bus} onUserSubmit={onSubmit} busy={busy} online={loggedIn === true} />
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

if (isEntrypoint()) {
  mount();
}
