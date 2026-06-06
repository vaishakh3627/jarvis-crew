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
 * Returns the current `ant` OAuth access token, or null if the user is not
 * logged in via `ant`. We pass this explicitly as the SDK's authToken because
 * the pinned SDK does not auto-detect the ant profile. The token is short-lived,
 * so fetch it fresh per run.
 */
export async function getAntToken(
  deps: { run?: () => Promise<{ code: number; stdout: string }> } = {},
): Promise<string | null> {
  const run =
    deps.run ??
    (() =>
      new Promise<{ code: number; stdout: string }>((resolve) => {
        const child = spawn('ant', ['auth', 'print-credentials', '--access-token'], {
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        let out = '';
        child.stdout?.on('data', (d) => (out += d.toString()));
        child.on('error', () => resolve({ code: 1, stdout: '' }));
        child.on('close', (code) => resolve({ code: code ?? 1, stdout: out }));
      }));
  const { code, stdout } = await run();
  const token = stdout.trim();
  return code === 0 && token ? token : null;
}
