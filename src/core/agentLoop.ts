import type { AnthropicLike, MessageParam } from './anthropic.js';
import type { EventBus, AgentId } from './events.js';
import type { Tool } from './tools/types.js';
import type { AgentDefinition } from './crew.js';

export interface RunAgentOptions {
  agent: AgentDefinition;
  client: AnthropicLike;
  tools: Tool[];
  bus: EventBus;
  cwd: string;
  canUseTool: (agent: AgentId, tool: Tool, input: unknown, id: string) => Promise<boolean>;
  signal: AbortSignal;
  /** Either a starting user message, or a pre-built message history. */
  initialUserText?: string;
  messages?: MessageParam[];
  maxTurns?: number;
}

export interface RunAgentResult {
  text: string;
  ok: boolean;
}

export async function runAgent(opts: RunAgentOptions): Promise<RunAgentResult> {
  const { agent, client, tools, bus, cwd, canUseTool, signal } = opts;
  const toolByName = new Map(tools.map((t) => [t.name, t]));
  const messages: MessageParam[] =
    opts.messages ?? [{ role: 'user', content: opts.initialUserText ?? '' }];

  bus.emit({ type: 'agentStarted', agent: agent.id, task: opts.initialUserText ?? '' });

  const apiTools = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  let finalText = '';
  const maxTurns = opts.maxTurns ?? 12;

  try {
    for (let turn = 0; turn < maxTurns; turn++) {
      if (signal.aborted) throw new Error('aborted');

      const assistantContent: any[] = [];
      const toolUses: { id: string; name: string; input: unknown }[] = [];
      let turnText = '';

      bus.emit({ type: 'activity', activity: { id: agent.id, status: 'thinking', progress: 0.1 } });

      for await (const ev of client.streamMessage({
        model: agent.model,
        system: agent.systemPrompt,
        messages,
        tools: apiTools,
      })) {
        if (signal.aborted) throw new Error('aborted');
        if (ev.type === 'thinking_delta') {
          bus.emit({ type: 'thinking', agent: agent.id, text: ev.text });
        } else if (ev.type === 'text_delta') {
          turnText += ev.text;
          bus.emit({ type: 'text', agent: agent.id, text: ev.text });
        } else if (ev.type === 'tool_use') {
          toolUses.push({ id: ev.id, name: ev.name, input: ev.input });
          assistantContent.push({ type: 'tool_use', id: ev.id, name: ev.name, input: ev.input });
        }
      }

      if (turnText) assistantContent.unshift({ type: 'text', text: turnText });
      finalText = turnText || finalText;

      if (toolUses.length === 0) {
        bus.emit({ type: 'agentFinished', agent: agent.id, ok: true });
        return { text: finalText, ok: true };
      }

      messages.push({ role: 'assistant', content: assistantContent });

      // Execute this turn's tool calls concurrently (this is where parallelism happens).
      const results = await Promise.all(
        toolUses.map(async (tu) => {
          const tool = toolByName.get(tu.name);
          if (!tool) {
            return { type: 'tool_result', tool_use_id: tu.id, content: `Unknown tool: ${tu.name}`, is_error: true };
          }
          bus.emit({ type: 'activity', activity: { id: agent.id, status: 'working', progress: 0.5, action: tu.name } });
          if (tool.destructive) {
            const allowed = await canUseTool(agent.id, tool, tu.input, tu.id);
            if (!allowed) {
              bus.emit({ type: 'toolResult', agent: agent.id, tool: tu.name, id: tu.id, ok: false, output: 'denied' });
              return { type: 'tool_result', tool_use_id: tu.id, content: 'User denied this action.', is_error: true };
            }
          }
          bus.emit({ type: 'toolStart', agent: agent.id, tool: tu.name, input: tu.input, id: tu.id });
          try {
            const output = await tool.run(tu.input, { cwd, signal });
            bus.emit({ type: 'toolResult', agent: agent.id, tool: tu.name, id: tu.id, ok: true, output });
            return { type: 'tool_result', tool_use_id: tu.id, content: output };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            bus.emit({ type: 'toolResult', agent: agent.id, tool: tu.name, id: tu.id, ok: false, output: msg });
            return { type: 'tool_result', tool_use_id: tu.id, content: `Error: ${msg}`, is_error: true };
          }
        }),
      );

      messages.push({ role: 'user', content: results });
    }
    bus.emit({ type: 'agentFinished', agent: agent.id, ok: true });
    return { text: finalText, ok: true };
  } catch (err) {
    bus.emit({ type: 'agentFinished', agent: agent.id, ok: false });
    return { text: finalText, ok: false };
  }
}
