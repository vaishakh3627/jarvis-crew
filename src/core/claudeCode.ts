import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { AgentId, EventBus, JarvisEvent } from './events.js';
import { skillPacks } from './skills/packs.js';

/** Crew members that map to Claude Code subagents (Atlas is the main session). */
const SUBAGENTS: AgentId[] = ['iris', 'volt', 'edith', 'friday'];

function toAgentId(name: string | undefined): AgentId | null {
  if (!name) return null;
  const n = name.toLowerCase();
  return (SUBAGENTS as string[]).includes(n) ? (n as AgentId) : null;
}

/** A short, human-readable detail for a tool call (path, command, pattern…). */
export function describeTool(name: string, input: any): string {
  if (input && typeof input === 'object') {
    if (typeof input.file_path === 'string') return input.file_path;
    if (typeof input.command === 'string') return input.command;
    if (typeof input.pattern === 'string') return input.pattern;
    if (typeof input.path === 'string') return input.path;
    if (typeof input.description === 'string') return input.description;
  }
  return name;
}

/** tool_result content may be a string or an array of text blocks. */
function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((b: any) => (typeof b === 'string' ? b : typeof b?.text === 'string' ? b.text : ''))
      .join('');
  }
  return '';
}

/**
 * Translates `claude -p --output-format stream-json` events into Jarvis events.
 * Pure and stateful (tracks which subagent owns which tool_use id), so it can be
 * unit-tested by feeding it parsed JSON objects.
 */
export class StreamParser {
  private agentByParent = new Map<string, AgentId>();
  private toolNameById = new Map<string, string>();
  private started = new Set<AgentId>();

  handle(obj: any): JarvisEvent[] {
    const out: JarvisEvent[] = [];
    const type = obj?.type;

    if (type === 'assistant' && obj.message?.content) {
      const agent = this.agentFor(obj.parent_tool_use_id);
      this.ensureStarted(agent, out);
      for (const block of obj.message.content) {
        if (block.type === 'thinking') {
          if (block.thinking) out.push({ type: 'thinking', agent, text: block.thinking });
        } else if (block.type === 'text') {
          if (block.text) out.push({ type: 'text', agent, text: block.text });
        } else if (block.type === 'tool_use') {
          if (block.name === 'Task' || block.name === 'Agent') {
            const sub = toAgentId(block.input?.subagent_type);
            if (sub) {
              this.agentByParent.set(block.id, sub);
              this.ensureStarted(sub, out);
              out.push({
                type: 'activity',
                activity: { id: sub, status: 'working', progress: 0.3, action: block.input?.description ?? 'working' },
              });
            }
          } else {
            this.toolNameById.set(block.id, block.name);
            out.push({ type: 'toolStart', agent, tool: block.name, input: block.input, id: block.id });
            out.push({
              type: 'activity',
              activity: { id: agent, status: 'working', progress: 0.5, action: describeTool(block.name, block.input) },
            });
          }
        }
      }
    } else if (type === 'user' && obj.message?.content) {
      const agent = this.agentFor(obj.parent_tool_use_id);
      for (const block of obj.message.content) {
        if (block.type === 'tool_result') {
          const id = block.tool_use_id ?? '';
          out.push({
            type: 'toolResult',
            agent,
            tool: this.toolNameById.get(id) ?? 'tool',
            id,
            ok: !block.is_error,
            output: extractText(block.content),
          });
        }
      }
    } else if (type === 'result') {
      const ok = obj.subtype === 'success';
      for (const a of this.started) out.push({ type: 'agentFinished', agent: a, ok });
    }

    return out;
  }

  private agentFor(parent: string | null | undefined): AgentId {
    if (parent && this.agentByParent.has(parent)) return this.agentByParent.get(parent)!;
    return 'atlas';
  }

  private ensureStarted(agent: AgentId, out: JarvisEvent[]): void {
    if (!this.started.has(agent)) {
      this.started.add(agent);
      out.push({ type: 'agentStarted', agent, task: '' });
    }
  }
}

/** Build the `--agents` JSON defining the four specialist subagents. */
export function buildCrewAgents(): Record<string, unknown> {
  const tools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'];
  const def = (id: AgentId, description: string) => ({
    description,
    prompt: skillPacks[id],
    tools,
    model: 'sonnet',
  });
  return {
    iris: def(
      'iris',
      'Principal product designer (UI/UX). Use for any design, layout, visual hierarchy, design-system, motion, or accessibility work.',
    ),
    volt: def(
      'volt',
      'Principal frontend engineer (React/TypeScript). Use to build or refactor UI components, client state, styling, and browser logic.',
    ),
    edith: def(
      'edith',
      'Principal backend engineer. Use for APIs, data models, auth, databases, server logic, security, and performance.',
    ),
    friday: def(
      'friday',
      'Principal QA engineer/SDET. Use to design and RUN tests, hunt edge cases, and verify any change before it is considered done.',
    ),
  };
}

export const ATLAS_SYSTEM = `${skillPacks.atlas}
You orchestrate four elite specialist subagents via the Task tool: iris (UI/UX), volt (frontend), edith (backend), and friday (QA). Delegate independent pieces of work in the SAME turn so they run in parallel. Always route a verification pass through friday for non-trivial work, and only report completion once it is verified. Then synthesize a concise, high-signal final answer.`;

export interface RunClaudeCodeOptions {
  userText: string;
  bus: EventBus;
  cwd: string;
  signal: AbortSignal;
  /** Override the binary (tests). Defaults to "claude". */
  command?: string;
}

export interface RunResult {
  ok: boolean;
  error?: string;
}

/**
 * Runs Claude Code headless on the user's Max login and streams its activity
 * onto the Jarvis event bus. No API key required.
 */
export function runClaudeCode(opts: RunClaudeCodeOptions): Promise<RunResult> {
  const { userText, bus, cwd, signal } = opts;
  const args = [
    '-p',
    userText,
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    'Read',
    'Edit',
    'Write',
    'Bash',
    'Glob',
    'Grep',
    'Task',
    'WebSearch',
    'WebFetch',
    '--append-system-prompt',
    ATLAS_SYSTEM,
    '--model',
    'opus',
    '--agents',
    JSON.stringify(buildCrewAgents()),
  ];

  // Show Atlas immediately; the parser emits agentStarted on the first message.
  bus.emit({ type: 'activity', activity: { id: 'atlas', status: 'thinking', progress: 0.1 } });

  return new Promise<RunResult>((resolve) => {
    const child = spawn(opts.command ?? 'claude', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const parser = new StreamParser();
    let stderr = '';
    let sawError = false;

    const onAbort = () => child.kill('SIGTERM');
    signal.addEventListener('abort', onAbort, { once: true });

    const rl = createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('{')) return; // skip warnings / non-JSON
      let obj: any;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        return;
      }
      for (const event of parser.handle(obj)) bus.emit(event);
      if (obj?.type === 'result' && obj.subtype && obj.subtype !== 'success') sawError = true;
    });

    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('error', (err) => {
      signal.removeEventListener('abort', onAbort);
      bus.emit({ type: 'agentFinished', agent: 'atlas', ok: false });
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
    });

    child.on('close', (code) => {
      signal.removeEventListener('abort', onAbort);
      const ok = code === 0 && !sawError;
      if (!ok) bus.emit({ type: 'agentFinished', agent: 'atlas', ok: false });
      resolve({ ok, error: ok ? undefined : stderr.trim() || `claude exited with code ${code}` });
    });
  });
}
