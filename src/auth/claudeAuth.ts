import { spawn } from 'node:child_process';

/**
 * Whether the user is signed into Claude Code (which is what Jarvis runs on).
 * Reads `claude auth status` (JSON with a `loggedIn` field).
 */
export async function isClaudeLoggedIn(
  deps: { run?: () => Promise<{ code: number; stdout: string }> } = {},
): Promise<boolean> {
  const run =
    deps.run ??
    (() =>
      new Promise<{ code: number; stdout: string }>((resolve) => {
        const child = spawn('claude', ['auth', 'status'], { stdio: ['ignore', 'pipe', 'ignore'] });
        let out = '';
        child.stdout?.on('data', (d) => (out += d.toString()));
        child.on('error', () => resolve({ code: 1, stdout: '' }));
        child.on('close', (code) => resolve({ code: code ?? 1, stdout: out }));
      }));
  const { code, stdout } = await run();
  if (code !== 0) return false;
  try {
    if (JSON.parse(stdout).loggedIn === true) return true;
  } catch {
    /* fall through to a lenient check */
  }
  return /"loggedIn"\s*:\s*true/.test(stdout);
}

/**
 * Runs Claude Code's interactive sign-in (`claude auth login`). The caller must
 * release the terminal first (Ink unmount) because this takes over stdio and may
 * open a browser.
 */
export function runClaudeLogin(
  deps: { spawnLogin?: () => Promise<{ code: number }> } = {},
): Promise<{ code: number }> {
  const run =
    deps.spawnLogin ??
    (() =>
      new Promise<{ code: number }>((resolve) => {
        const child = spawn('claude', ['auth', 'login'], { stdio: 'inherit' });
        child.on('error', () => resolve({ code: 1 }));
        child.on('close', (code) => resolve({ code: code ?? 1 }));
      }));
  return run();
}
