import { runAgent } from './agentLoop.js';
import { getAgent, SPECIALISTS } from './crew.js';
import { fsTools } from './tools/fsTools.js';
import { bashTool } from './tools/bash.js';
import { ToolRegistry } from './tools/registry.js';
import type { Tool } from './tools/types.js';
import type { AnthropicLike } from './anthropic.js';
import type { EventBus, AgentId } from './events.js';

export interface OrchestratorOptions {
  userText: string;
  client: AnthropicLike;
  bus: EventBus;
  cwd: string;
  canUseTool: (agent: AgentId, tool: Tool, input: unknown, id: string) => Promise<boolean>;
  signal: AbortSignal;
}

const allSpecialistTools = new ToolRegistry([...fsTools, bashTool]);

/** Build the `delegate` tool bound to this run's context. */
function makeDelegateTool(opts: OrchestratorOptions): Tool<{ agent: AgentId; task: string }> {
  return {
    name: 'delegate',
    description:
      'Delegate a self-contained task to a specialist agent. Valid agents: ' +
      SPECIALISTS.join(', ') + '. Call delegate multiple times in one turn to run them in parallel.',
    destructive: false,
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', enum: SPECIALISTS },
        task: { type: 'string', description: 'A clear, self-contained instruction.' },
      },
      required: ['agent', 'task'],
    },
    run: async (input) => {
      if (!SPECIALISTS.includes(input.agent)) {
        return `Unknown agent "${input.agent}". Choose one of: ${SPECIALISTS.join(', ')}`;
      }
      const def = getAgent(input.agent);
      const result = await runAgent({
        agent: def,
        client: opts.client,
        tools: allSpecialistTools.pick(def.toolNames),
        bus: opts.bus,
        cwd: opts.cwd,
        canUseTool: opts.canUseTool,
        signal: opts.signal,
        initialUserText: input.task,
      });
      return result.ok ? result.text : `Specialist ${def.name} failed: ${result.text}`;
    },
  };
}

export async function runOrchestrator(opts: OrchestratorOptions) {
  const atlas = getAgent('atlas');
  const delegate = makeDelegateTool(opts);
  // Atlas's read-only inspection tools + delegate.
  const atlasTools = new ToolRegistry([...fsTools, bashTool, delegate]).pick(atlas.toolNames);

  return runAgent({
    agent: atlas,
    client: opts.client,
    tools: atlasTools,
    bus: opts.bus,
    cwd: opts.cwd,
    canUseTool: opts.canUseTool,
    signal: opts.signal,
    initialUserText: opts.userText,
  });
}
