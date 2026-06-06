import { spawn } from 'node:child_process';

export type LoginResult =
  | { kind: 'browser' }       // browser OAuth completed; SDK will auto-detect the profile
  | { kind: 'needsApiKey' }   // no browser flow available; caller should prompt for a key
  | { kind: 'failed'; code: number };

export interface LoginDeps {
  hasAnt: () => Promise<boolean>;
  runAnt: (args: string[]) => Promise<{ code: number }>;
}

function defaultHasAnt(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('ant', ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

function defaultRunAnt(args: string[]): Promise<{ code: number }> {
  return new Promise((resolve) => {
    const child = spawn('ant', args, { stdio: 'inherit' });
    child.on('error', () => resolve({ code: 1 }));
    child.on('close', (code) => resolve({ code: code ?? 1 }));
  });
}

/**
 * Opens the browser OAuth flow against the Anthropic developer platform.
 * Note: this authenticates a platform account (billed per-token), not a
 * Claude.ai Pro/Max subscription.
 */
export async function login(deps: LoginDeps = { hasAnt: defaultHasAnt, runAnt: defaultRunAnt }): Promise<LoginResult> {
  if (!(await deps.hasAnt())) return { kind: 'needsApiKey' };
  const { code } = await deps.runAnt(['auth', 'login']);
  return code === 0 ? { kind: 'browser' } : { kind: 'failed', code };
}

/**
 * True when there is an active `ant` OAuth session (the user has run
 * `ant auth login`). The Anthropic SDK auto-detects that profile, so when this
 * is true we can construct the client with no explicit key.
 */
export async function hasAntSession(
  deps: { runAntStatus?: () => Promise<{ code: number }> } = {},
): Promise<boolean> {
  const run =
    deps.runAntStatus ??
    (() =>
      new Promise<{ code: number }>((resolve) => {
        const child = spawn('ant', ['auth', 'status'], { stdio: 'ignore' });
        child.on('error', () => resolve({ code: 1 }));
        child.on('close', (code) => resolve({ code: code ?? 1 }));
      }));
  const { code } = await run();
  return code === 0;
}
