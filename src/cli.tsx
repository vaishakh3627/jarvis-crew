#!/usr/bin/env node
import React, { useMemo, useRef, useState } from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import { EventBus } from './core/events.js';
import { runClaudeCode } from './core/claudeCode.js';
import { App } from './ui/App.js';

export interface SlashActions {
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

function Root() {
  const bus = useMemo(() => new EventBus(), []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Type a request. Runs on your Claude Code (Max) login.');
  const [clearNonce, setClearNonce] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const { exit } = useApp();

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
      help: () => setNotice('Commands: /help, /clear. Otherwise, just describe what to build.'),
      clear: () => {
        setClearNonce((n) => n + 1);
        setNotice('Cleared.');
      },
    });
    if (handled !== 'passthrough') {
      if (handled === 'unknown') setNotice(`Unknown command: ${text}`);
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

  return (
    <Box flexDirection="column">
      <Text color="magenta">🛡️  Jarvis</Text>
      <Text dimColor>{notice}</Text>
      <App bus={bus} onUserSubmit={onSubmit} busy={busy} clearNonce={clearNonce} />
    </Box>
  );
}

// Mount only when run as the entry point (node dist/cli.js or tsx src/cli.tsx).
const entry = process.argv[1] ?? '';
if (/[\\/]cli\.(js|tsx)$/.test(entry)) {
  render(<Root />, { exitOnCtrlC: false });
}
