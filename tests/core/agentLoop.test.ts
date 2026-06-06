import { expect, test } from 'vitest';
import { runAgent } from '../../src/core/agentLoop.js';
import { EventBus } from '../../src/core/events.js';
import type { AnthropicLike, StreamEvent, StreamParams } from '../../src/core/anthropic.js';
import type { Tool } from '../../src/core/tools/types.js';
import type { AgentDefinition } from '../../src/core/crew.js';

const agentDef: AgentDefinition = {
  id: 'volt', name: 'Volt', emoji: '⚡', color: 'yellow', role: 'frontend',
  model: 'claude-sonnet-4-6', systemPrompt: 'be elite', toolNames: ['write'],
};

const writeCalls: any[] = [];
const writeTool: Tool = {
  name: 'write', description: 'w', destructive: true,
  inputSchema: { type: 'object', properties: {}, required: [] },
  run: async (input) => { writeCalls.push(input); return 'ok'; },
};

// Fake model: first turn streams thinking + a tool_use; second turn ends with text.
function makeFake(): AnthropicLike {
  let turn = 0;
  return {
    async *streamMessage(_p: StreamParams): AsyncIterable<StreamEvent> {
      if (turn++ === 0) {
        yield { type: 'thinking_delta', text: 'I will write' };
        yield { type: 'tool_use', id: 't1', name: 'write', input: { path: 'x.ts' } };
        yield { type: 'end', stopReason: 'tool_use' };
      } else {
        yield { type: 'text_delta', text: 'done!' };
        yield { type: 'end', stopReason: 'end_turn' };
      }
    },
  };
}

test('runAgent streams thinking, executes a permitted tool, and returns final text', async () => {
  writeCalls.length = 0;
  const bus = new EventBus();
  const events: string[] = [];
  bus.subscribe((e) => events.push(e.type));
  const result = await runAgent({
    agent: agentDef,
    client: makeFake(),
    tools: [writeTool],
    bus,
    cwd: '/tmp',
    canUseTool: async () => true,
    signal: new AbortController().signal,
    initialUserText: 'build x',
  });
  expect(result.ok).toBe(true);
  expect(result.text).toBe('done!');
  expect(writeCalls).toEqual([{ path: 'x.ts' }]);
  expect(events).toContain('thinking');
  expect(events).toContain('toolStart');
  expect(events).toContain('toolResult');
  expect(events).toContain('agentFinished');
});

test('runAgent skips a denied destructive tool and feeds back a denial result', async () => {
  writeCalls.length = 0;
  const bus = new EventBus();
  const result = await runAgent({
    agent: agentDef,
    client: makeFake(),
    tools: [writeTool],
    bus,
    cwd: '/tmp',
    canUseTool: async () => false,
    signal: new AbortController().signal,
    initialUserText: 'build x',
  });
  expect(writeCalls).toEqual([]); // never executed
  expect(result.ok).toBe(true);
});

test('runAgent stops and returns ok:false when the signal is already aborted', async () => {
  writeCalls.length = 0;
  const bus = new EventBus();
  const events: string[] = [];
  bus.subscribe((e) => events.push(e.type));
  const controller = new AbortController();
  controller.abort();
  const result = await runAgent({
    agent: agentDef,
    client: makeFake(),
    tools: [writeTool],
    bus,
    cwd: '/tmp',
    canUseTool: async () => true,
    signal: controller.signal,
    initialUserText: 'build x',
  });
  expect(result.ok).toBe(false);
  expect(writeCalls).toEqual([]); // never executed
  expect(events).toContain('agentFinished');
});
