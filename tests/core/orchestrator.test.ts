import { expect, test } from 'vitest';
import { runOrchestrator } from '../../src/core/orchestrator.js';
import { EventBus } from '../../src/core/events.js';
import type { AnthropicLike, StreamEvent, StreamParams } from '../../src/core/anthropic.js';

// Atlas delegates to two specialists in one turn, then synthesizes.
function makeAtlasFake(): AnthropicLike {
  let turn = 0;
  return {
    async *streamMessage(p: StreamParams): AsyncIterable<StreamEvent> {
      const isAtlas = p.system.includes('orchestrator');
      if (isAtlas && turn++ === 0) {
        yield { type: 'thinking_delta', text: 'split into two' };
        yield { type: 'tool_use', id: 'd1', name: 'delegate', input: { agent: 'iris', task: 'design' } };
        yield { type: 'tool_use', id: 'd2', name: 'delegate', input: { agent: 'volt', task: 'build' } };
        yield { type: 'end', stopReason: 'tool_use' };
      } else if (isAtlas) {
        yield { type: 'text_delta', text: 'All done.' };
        yield { type: 'end', stopReason: 'end_turn' };
      } else {
        // any specialist: finish immediately
        yield { type: 'text_delta', text: `done:${p.system.slice(8, 12)}` };
        yield { type: 'end', stopReason: 'end_turn' };
      }
    },
  };
}

test('orchestrator delegates to specialists and they run (parallel) before synthesis', async () => {
  const bus = new EventBus();
  const started: string[] = [];
  bus.subscribe((e) => { if (e.type === 'agentStarted') started.push(e.agent); });

  const result = await runOrchestrator({
    userText: 'build a login page',
    client: makeAtlasFake(),
    bus,
    cwd: '/tmp',
    canUseTool: async () => true,
    signal: new AbortController().signal,
  });

  expect(result.text).toBe('All done.');
  expect(started).toContain('atlas');
  expect(started).toContain('iris');
  expect(started).toContain('volt');
});
