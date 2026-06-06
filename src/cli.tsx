import React, { useMemo, useRef, useState } from 'react';
import { render, Box, Text } from 'ink';
import { EventBus } from './core/events.js';
import type { AgentId } from './core/events.js';
import type { Tool } from './core/tools/types.js';
import { runOrchestrator } from './core/orchestrator.js';
import { RealAnthropic } from './core/anthropic.js';
import { getCredentials, isAuthenticated } from './auth/credentials.js';
import { login } from './auth/login.js';
import { App } from './ui/App.js';
import { PermissionPrompt } from './ui/PermissionPrompt.js';

export interface SlashActions {
  login: () => void | Promise<void>;
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
    case 'login': await actions.login(); return 'handled';
    case 'help': actions.help(); return 'handled';
    case 'clear': actions.clear(); return 'handled';
    default: return 'unknown';
  }
}

function describeInput(input: unknown): string {
  if (input && typeof input === 'object') {
    const o = input as Record<string, unknown>;
    if (typeof o.path === 'string') return o.path;
    if (typeof o.command === 'string') return o.command;
    return JSON.stringify(input);
  }
  return String(input);
}

interface Pending {
  agent: AgentId;
  tool: string;
  detail: string;
  resolve: (allow: boolean) => void;
}

function Root() {
  const bus = useMemo(() => new EventBus(), []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Type a request, or /login, /help.');
  const [pending, setPending] = useState<Pending | null>(null);
  const queue = useRef<Pending[]>([]);

  const canUseTool = (agent: AgentId, tool: Tool, input: unknown, _id: string) =>
    new Promise<boolean>((resolve) => {
      const item: Pending = { agent, tool: tool.name, detail: describeInput(input), resolve };
      queue.current.push(item);
      // If nothing is currently being shown, promote this one.
      setPending((cur) => cur ?? item);
    });

  function resolvePermission(allow: boolean) {
    const head = queue.current.shift();
    head?.resolve(allow);
    setPending(queue.current[0] ?? null);
  }

  async function onSubmit(text: string) {
    const handled = await routeSlashCommand(text, {
      login: async () => {
        const r = await login();
        setNotice(
          r.kind === 'browser'
            ? 'Logged in via browser.'
            : r.kind === 'needsApiKey'
            ? 'No browser flow found. Set ANTHROPIC_API_KEY and restart.'
            : 'Login failed.',
        );
      },
      help: () => setNotice('Commands: /login, /help, /clear. Otherwise, describe what to build.'),
      clear: () => setNotice('Cleared.'),
    });
    if (handled !== 'passthrough') {
      if (handled === 'unknown') setNotice(`Unknown command: ${text}`);
      return;
    }
    if (!isAuthenticated()) {
      setNotice('Not logged in. Run /login or set ANTHROPIC_API_KEY.');
      return;
    }
    setBusy(true);
    const creds = getCredentials()!;
    const client = new RealAnthropic(creds);
    const controller = new AbortController();
    try {
      await runOrchestrator({
        userText: text,
        client,
        bus,
        cwd: process.cwd(),
        canUseTool,
        signal: controller.signal,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box flexDirection="column">
      <Text color="magenta">🛡️  Jarvis</Text>
      <Text dimColor>{notice}</Text>
      <App bus={bus} onUserSubmit={onSubmit} busy={busy} />
      {pending ? (
        <PermissionPrompt
          agent={pending.agent}
          tool={pending.tool}
          detail={pending.detail}
          onResolve={resolvePermission}
        />
      ) : null}
    </Box>
  );
}

// Mount only when run as a binary, not when imported by tests.
if (process.argv[1] && process.argv[1].endsWith('cli.js')) {
  render(<Root />);
}
