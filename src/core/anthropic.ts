import Anthropic from '@anthropic-ai/sdk';

export interface MessageParam {
  role: 'user' | 'assistant';
  content: unknown;
}

export interface StreamParams {
  model: string;
  system: string;
  messages: MessageParam[];
  tools: { name: string; description: string; input_schema: Record<string, unknown> }[];
  maxTokens?: number;
}

export type StreamEvent =
  | { type: 'thinking_delta'; text: string }
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'end'; stopReason: string };

/** Minimal surface the agent loop depends on — real SDK or a fake in tests. */
export interface AnthropicLike {
  streamMessage(params: StreamParams): AsyncIterable<StreamEvent>;
}

/** Convert the raw @anthropic-ai/sdk event iterator into normalized StreamEvents. */
export async function* normalizeSdkStream(
  raw: AsyncIterable<any>,
): AsyncIterable<StreamEvent> {
  // Accumulate partial tool-use input JSON keyed by block index.
  const toolBlocks = new Map<number, { id: string; name: string; json: string }>();
  for await (const ev of raw) {
    if (ev.type === 'content_block_start' && ev.content_block?.type === 'tool_use') {
      toolBlocks.set(ev.index, { id: ev.content_block.id, name: ev.content_block.name, json: '' });
    } else if (ev.type === 'content_block_delta') {
      if (ev.delta?.type === 'thinking_delta') {
        yield { type: 'thinking_delta', text: ev.delta.thinking };
      } else if (ev.delta?.type === 'text_delta') {
        yield { type: 'text_delta', text: ev.delta.text };
      } else if (ev.delta?.type === 'input_json_delta') {
        const block = toolBlocks.get(ev.index);
        if (block) block.json += ev.delta.partial_json ?? '';
      }
    } else if (ev.type === 'content_block_stop') {
      const block = toolBlocks.get(ev.index);
      if (block) {
        let input: unknown = {};
        try { input = block.json ? JSON.parse(block.json) : {}; } catch { input = {}; }
        yield { type: 'tool_use', id: block.id, name: block.name, input };
        toolBlocks.delete(ev.index);
      }
    } else if (ev.type === 'message_delta' && ev.delta?.stop_reason) {
      // hold; final stop_reason emitted at message_stop via captured value
      (raw as any).__stopReason = ev.delta.stop_reason;
    } else if (ev.type === 'message_stop') {
      yield { type: 'end', stopReason: (raw as any).__stopReason ?? 'end_turn' };
    }
  }
}

/** Real adapter backed by @anthropic-ai/sdk. */
export class RealAnthropic implements AnthropicLike {
  private client: Anthropic;
  constructor(opts: { apiKey?: string; authToken?: string } = {}) {
    this.client = new Anthropic(opts);
  }

  async *streamMessage(params: StreamParams): AsyncIterable<StreamEvent> {
    const stream = this.client.messages.stream({
      model: params.model,
      max_tokens: params.maxTokens ?? 16000,
      system: params.system,
      thinking: { type: 'adaptive', display: 'summarized' } as any,
      tools: params.tools as any,
      messages: params.messages as any,
    });
    yield* normalizeSdkStream(stream as AsyncIterable<any>);
  }
}
