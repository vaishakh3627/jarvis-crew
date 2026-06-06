import { afterEach, beforeEach, expect, test } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runOrchestrator } from '../../src/core/orchestrator.js';
import { EventBus } from '../../src/core/events.js';
import type { AnthropicLike, StreamEvent, StreamParams } from '../../src/core/anthropic.js';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'jarvis-e2e-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

// Atlas delegates to volt and forge in one turn; each writes a file; Atlas synthesizes.
function fakeModel(): AnthropicLike {
  const turns = new Map<string, number>();
  return {
    async *streamMessage(p: StreamParams): AsyncIterable<StreamEvent> {
      const who = p.system.includes('orchestrator') ? 'atlas'
        : p.system.includes('frontend') ? 'volt'
        : p.system.includes('backend') ? 'forge' : 'other';
      const n = turns.get(who) ?? 0;
      turns.set(who, n + 1);

      if (who === 'atlas' && n === 0) {
        yield { type: 'tool_use', id: 'd1', name: 'delegate', input: { agent: 'volt', task: 'make LoginForm.tsx' } };
        yield { type: 'tool_use', id: 'd2', name: 'delegate', input: { agent: 'forge', task: 'make auth.ts' } };
        yield { type: 'end', stopReason: 'tool_use' };
      } else if (who === 'atlas') {
        yield { type: 'text_delta', text: 'Login page built.' };
        yield { type: 'end', stopReason: 'end_turn' };
      } else if (who === 'volt' && n === 0) {
        yield { type: 'tool_use', id: 'w1', name: 'write', input: { path: 'LoginForm.tsx', content: 'export const LoginForm = () => null;' } };
        yield { type: 'end', stopReason: 'tool_use' };
      } else if (who === 'forge' && n === 0) {
        yield { type: 'tool_use', id: 'w2', name: 'write', input: { path: 'auth.ts', content: 'export const login = () => true;' } };
        yield { type: 'end', stopReason: 'tool_use' };
      } else {
        yield { type: 'text_delta', text: 'done' };
        yield { type: 'end', stopReason: 'end_turn' };
      }
    },
  };
}

test('end-to-end: orchestrator plans, specialists write files in parallel, Atlas synthesizes', async () => {
  const bus = new EventBus();
  const result = await runOrchestrator({
    userText: 'build a login page',
    client: fakeModel(),
    bus,
    cwd: dir,
    canUseTool: async () => true, // auto-approve in the test
    signal: new AbortController().signal,
  });

  expect(result.ok).toBe(true);
  expect(result.text).toBe('Login page built.');
  expect(await readFile(join(dir, 'LoginForm.tsx'), 'utf8')).toContain('LoginForm');
  expect(await readFile(join(dir, 'auth.ts'), 'utf8')).toContain('login');
});
