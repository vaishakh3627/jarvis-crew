import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { AgentId, EventBus, JarvisEvent } from './events.js';
import { skillPacks } from './skills/packs.js';
import { jarvisAuthEnv } from '../auth/jarvisAuth.js';

/** Crew members that map to Claude Code subagents (Atlas is the main session). */
const SUBAGENTS: AgentId[] = ['iris', 'volt', 'edith', 'friday', 'vision', 'sentry', 'forge'];

/**
 * The model the whole crew runs on. Defaults to the top model via the `opus`
 * alias — Claude Code resolves it to the latest Opus (4.8 today) automatically,
 * so it stays current with no code change. Override with the JARVIS_MODEL env.
 */
const TOP_MODEL = process.env.JARVIS_MODEL || 'opus';

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
  private outputTokens = 0;

  handle(obj: any): JarvisEvent[] {
    const out: JarvisEvent[] = [];
    const type = obj?.type;

    if (type === 'assistant' && obj.message?.content) {
      const agent = this.agentFor(obj.parent_tool_use_id);
      this.ensureStarted(agent, out);
      const generated = obj.message?.usage?.output_tokens;
      if (typeof generated === 'number') {
        this.outputTokens += generated;
        out.push({ type: 'stats', outputTokens: this.outputTokens });
      }
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

/** Build the `--agents` JSON defining the specialist subagents. Forge (DevOps)
 *  is opt-in — included only when the user has enabled it via /devops. */
export function buildCrewAgents(devops = false): Record<string, unknown> {
  const tools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'];
  // Reviewers are read-only — they inspect and report, never edit.
  const reviewTools = ['Read', 'Grep', 'Glob', 'Bash'];
  const def = (id: AgentId, description: string, agentTools: string[] = tools) => ({
    description,
    prompt: skillPacks[id],
    tools: agentTools,
    model: TOP_MODEL,
  });
  const agents: Record<string, unknown> = {
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
    vision: def(
      'vision',
      'Principal frontend code reviewer (read-only). Use to review frontend/UI code for modern React/TS idioms, accessibility, performance, and design fidelity. Reports findings; does not edit.',
      reviewTools,
    ),
    sentry: def(
      'sentry',
      'Principal backend code reviewer & security auditor (read-only). Use to review backend code for security, contract correctness, data/concurrency, and performance. Reports findings; does not edit.',
      reviewTools,
    ),
  };
  if (devops) {
    agents.forge = def(
      'forge',
      'Principal DevOps/release engineer. Use for CI/CD, Docker, infrastructure-as-code, cloud config, environments/secrets, observability, and safe deploys/rollbacks.',
    );
  }
  return agents;
}

export const ATLAS_SYSTEM = `${skillPacks.atlas}
You orchestrate six elite specialist subagents via the Task tool: iris (UI/UX design), volt (frontend), edith (backend), friday (QA), vision (frontend code review, read-only), and sentry (backend code review & security, read-only). USE THEM WITH JUDGMENT — match the crew to the task, never add ceremony a task doesn't need. Delegate to a specialist ONLY when their expertise genuinely raises the quality of the result; for a trivial, self-contained, or low-risk change (a quick fix, a tiny tweak, a question), just handle it directly instead of spinning up the crew. When you do delegate, run independent pieces in the SAME turn so they work in parallel. Scale the quality gate to the work: for substantial or risky changes, after volt writes frontend code route a vision review and after edith writes backend code route a sentry review, then have the original author fix every BLOCKER and MAJOR finding, and route a friday verification pass — but skip these passes when the change is small and low-risk. Report completion only once the result is actually verified to the appropriate depth. Optimize for the best possible outcome — correctness, robustness, security, and polish — and never trade quality for speed. Keep only your FINAL answer concise.`;

const FORGE_CLAUSE =
  ' A seventh specialist, forge (DevOps/release — CI/CD, Docker, infrastructure-as-code, cloud config, environments/secrets, observability, safe deploys/rollbacks), is also enabled: delegate infrastructure, build, and deployment work to forge when it raises quality.';

/** The orchestrator system prompt, with the Forge clause when DevOps is on. */
export function atlasSystem(devops: boolean): string {
  return devops ? ATLAS_SYSTEM + FORGE_CLAUSE : ATLAS_SYSTEM;
}

export interface RunClaudeCodeOptions {
  userText: string;
  bus: EventBus;
  cwd: string;
  signal: AbortSignal;
  /** Stable conversation id so the crew keeps context across turns. */
  sessionId: string;
  /** False on the first turn (creates the session), true after (resumes it). */
  resume: boolean;
  /** Whether the opt-in Forge (DevOps) agent is on the crew. */
  devops: boolean;
  /** Override the binary (tests). Defaults to "claude". */
  command?: string;
}

export interface RunResult {
  ok: boolean;
  error?: string;
}

/**
 * The full `claude` argument list for one turn. The first turn creates the
 * session (`--session-id`); later turns resume it (`--resume`) so the crew
 * remembers the conversation. Pure, so it's unit-testable.
 */
export function buildRunArgs(userText: string, sessionId: string, resume: boolean, devops = false): string[] {
  return [
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
    atlasSystem(devops),
    '--model',
    TOP_MODEL,
    '--agents',
    JSON.stringify(buildCrewAgents(devops)),
    // Self-contained: run ONLY the Jarvis crew and their charters. Ignore the
    // host project's settings, CLAUDE.md, skills, plugins, MCP servers, and any
    // local subagents — so behavior is identical in every project.
    '--setting-sources',
    '',
    '--strict-mcp-config',
    '--disable-slash-commands',
    ...(resume ? ['--resume', sessionId] : ['--session-id', sessionId]),
  ];
}

/**
 * Runs Claude Code headless on the user's Max login and streams its activity
 * onto the Jarvis event bus. No API key required.
 */
export function runClaudeCode(opts: RunClaudeCodeOptions): Promise<RunResult> {
  const { userText, bus, cwd, signal } = opts;
  const args = buildRunArgs(userText, opts.sessionId, opts.resume, opts.devops);

  // Show Atlas immediately; the parser emits agentStarted on the first message.
  bus.emit({ type: 'activity', activity: { id: 'atlas', status: 'thinking', progress: 0.1 } });

  return new Promise<RunResult>((resolve) => {
    const child = spawn(opts.command ?? 'claude', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Authenticate as Jarvis (its own OAuth token), not the host's ~/.claude
      // login. CLAUDE_CODE_OAUTH_TOKEN overrides keychain/config credentials.
      env: jarvisAuthEnv(),
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

export interface CompactResult {
  ok: boolean;
  message: string;
}

/**
 * Args to compact a session via Claude's native `/compact`. Slash commands are
 * deliberately NOT disabled here (unlike a normal turn) so the command runs.
 */
export function buildCompactArgs(sessionId: string): string[] {
  return [
    '-p',
    '/compact',
    '--resume',
    sessionId,
    '--output-format',
    'json',
    '--setting-sources',
    '',
    '--strict-mcp-config',
  ];
}

/**
 * Compacts a conversation's context using Claude's built-in `/compact`, in
 * place on the same session — subsequent resumed turns continue from the
 * shorter context. The runner is injectable for tests.
 */
export function compactSession(
  sessionId: string,
  deps: { run?: (args: string[]) => Promise<{ code: number; stdout: string }> } = {},
): Promise<CompactResult> {
  const args = buildCompactArgs(sessionId);
  const run =
    deps.run ??
    ((a: string[]) =>
      new Promise<{ code: number; stdout: string }>((resolve) => {
        const child = spawn('claude', a, { stdio: ['ignore', 'pipe', 'pipe'], env: jarvisAuthEnv() });
        let out = '';
        child.stdout?.on('data', (d) => (out += d.toString()));
        child.on('error', () => resolve({ code: 1, stdout: '' }));
        child.on('close', (code) => resolve({ code: code ?? 1, stdout: out }));
      }));

  return run(args).then(({ code, stdout }) => {
    try {
      const obj = JSON.parse(stdout);
      const ok = code === 0 && obj?.is_error !== true;
      const message = typeof obj?.result === 'string' && obj.result ? obj.result : ok ? 'Compacted.' : 'Compaction failed.';
      return { ok, message };
    } catch {
      return { ok: false, message: 'Compaction failed.' };
    }
  });
}
