import { expect, test } from 'vitest';
import { normalizeSdkStream } from '../../src/core/anthropic.js';
import type { StreamEvent } from '../../src/core/anthropic.js';

// Simulate the @anthropic-ai/sdk raw event sequence.
async function* fakeSdkEvents() {
  yield { type: 'content_block_start', index: 0, content_block: { type: 'thinking' } };
  yield { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'plan...' } };
  yield { type: 'content_block_start', index: 1, content_block: { type: 'text' } };
  yield { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Hello' } };
  yield {
    type: 'content_block_start',
    index: 2,
    content_block: { type: 'tool_use', id: 'tu_1', name: 'write', input: {} },
  };
  yield { type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '{"path":"a.txt"}' } };
  yield { type: 'content_block_stop', index: 2 };
  yield { type: 'message_delta', delta: { stop_reason: 'tool_use' } };
  yield { type: 'message_stop' };
}

test('normalizeSdkStream emits thinking/text/tool_use and a final end event', async () => {
  const out: StreamEvent[] = [];
  for await (const e of normalizeSdkStream(fakeSdkEvents())) out.push(e);
  expect(out).toEqual([
    { type: 'thinking_delta', text: 'plan...' },
    { type: 'text_delta', text: 'Hello' },
    { type: 'tool_use', id: 'tu_1', name: 'write', input: { path: 'a.txt' } },
    { type: 'end', stopReason: 'tool_use' },
  ]);
});
