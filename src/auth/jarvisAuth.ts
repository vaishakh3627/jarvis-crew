import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { jarvisConfigDir } from '../core/config.js';

/**
 * Jarvis owns its OWN Anthropic credential rather than inheriting whatever
 * account is signed into the `claude` CLI (`~/.claude` / the system keychain).
 *
 * The credential is a long-lived OAuth token minted by `claude setup-token`
 * (the same browser sign-in Claude uses), stored under Jarvis's config dir and
 * injected into every `claude` subprocess via CLAUDE_CODE_OAUTH_TOKEN — which
 * takes precedence over the keychain, so Jarvis stays independent.
 */

function authFilePath(): string {
  return join(jarvisConfigDir(), 'auth.json');
}

/** The stored Jarvis OAuth token, or null if not signed in. */
export function readJarvisToken(): string | null {
  try {
    const raw = readFileSync(authFilePath(), 'utf8');
    const token = JSON.parse(raw)?.oauthToken;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/** Persist the Jarvis OAuth token with owner-only permissions. */
export function writeJarvisToken(token: string): void {
  mkdirSync(jarvisConfigDir(), { recursive: true, mode: 0o700 });
  writeFileSync(authFilePath(), JSON.stringify({ oauthToken: token }, null, 2), { mode: 0o600 });
}

/** Forget the Jarvis token (sign out). */
export function clearJarvisToken(): void {
  try {
    rmSync(authFilePath());
  } catch {
    /* already gone */
  }
}

/** Whether Jarvis has its own stored credential. Instant — no subprocess. */
export function isJarvisLoggedIn(): boolean {
  return readJarvisToken() !== null;
}

/**
 * Env for spawning `claude` so it authenticates as Jarvis (its own token),
 * never the host's `~/.claude` login. Falls through to the ambient env when no
 * token is stored so callers don't crash before login.
 */
export function jarvisAuthEnv(): NodeJS.ProcessEnv {
  const token = readJarvisToken();
  return token ? { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token } : { ...process.env };
}

/** Long-lived OAuth tokens from `claude setup-token` look like `sk-ant-oat01-…`. */
export function extractOAuthToken(output: string): string | null {
  return output.match(/sk-ant-oat[0-9a-z]*-[A-Za-z0-9_-]+/)?.[0] ?? null;
}

/**
 * Runs Claude's browser sign-in (`claude setup-token`) to mint Jarvis's own
 * long-lived token, then stores it. The caller must release the terminal first
 * (Ink unmount) because the flow takes over stdio and opens a browser.
 *
 * stdin/stderr are inherited so the interactive prompts and browser hand-off
 * work; stdout is captured so we can pull the token out of it.
 */
export function runJarvisLogin(
  deps: { spawnSetup?: () => Promise<{ code: number; stdout: string }> } = {},
): Promise<{ code: number; ok: boolean }> {
  const run =
    deps.spawnSetup ??
    (() =>
      new Promise<{ code: number; stdout: string }>((resolve) => {
        const child = spawn('claude', ['setup-token'], { stdio: ['inherit', 'pipe', 'inherit'] });
        let out = '';
        child.stdout?.on('data', (d) => {
          const s = d.toString();
          out += s;
          process.stdout.write(s); // keep the flow visible to the user
        });
        child.on('error', () => resolve({ code: 1, stdout: out }));
        child.on('close', (code) => resolve({ code: code ?? 1, stdout: out }));
      }));

  return run().then(({ code, stdout }) => {
    const token = extractOAuthToken(stdout);
    if (token) {
      writeJarvisToken(token);
      return { code: 0, ok: true };
    }
    return { code: code || 1, ok: false };
  });
}
