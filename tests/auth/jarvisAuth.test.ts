import { afterEach, beforeEach, expect, test } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  extractOAuthToken,
  isJarvisLoggedIn,
  readJarvisToken,
  writeJarvisToken,
  clearJarvisToken,
  jarvisAuthEnv,
  runJarvisLogin,
} from '../../src/auth/jarvisAuth.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jarvis-auth-'));
  process.env.JARVIS_CONFIG_DIR = dir;
});

afterEach(() => {
  delete process.env.JARVIS_CONFIG_DIR;
  rmSync(dir, { recursive: true, force: true });
});

test('extractOAuthToken pulls a setup-token token out of noisy output', () => {
  const out = 'Opening browser…\nYour token:\nsk-ant-oat01-AbC_123-xyz\nDone.';
  expect(extractOAuthToken(out)).toBe('sk-ant-oat01-AbC_123-xyz');
  expect(extractOAuthToken('no token here')).toBeNull();
});

test('write/read/clear round-trips the token and gates login state', () => {
  expect(isJarvisLoggedIn()).toBe(false);
  expect(readJarvisToken()).toBeNull();

  writeJarvisToken('sk-ant-oat01-test');
  expect(readJarvisToken()).toBe('sk-ant-oat01-test');
  expect(isJarvisLoggedIn()).toBe(true);

  clearJarvisToken();
  expect(readJarvisToken()).toBeNull();
  expect(isJarvisLoggedIn()).toBe(false);
});

test('the token file is written with owner-only permissions', () => {
  writeJarvisToken('sk-ant-oat01-test');
  const mode = statSync(join(dir, 'auth.json')).mode & 0o777;
  expect(mode).toBe(0o600);
  expect(JSON.parse(readFileSync(join(dir, 'auth.json'), 'utf8')).oauthToken).toBe('sk-ant-oat01-test');
});

test('jarvisAuthEnv injects CLAUDE_CODE_OAUTH_TOKEN only when signed in', () => {
  expect(jarvisAuthEnv().CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
  writeJarvisToken('sk-ant-oat01-test');
  expect(jarvisAuthEnv().CLAUDE_CODE_OAUTH_TOKEN).toBe('sk-ant-oat01-test');
});

test('runJarvisLogin stores the token extracted from setup-token output', async () => {
  const res = await runJarvisLogin({
    spawnSetup: async () => ({ code: 0, stdout: 'sk-ant-oat01-from-browser' }),
  });
  expect(res).toEqual({ code: 0, ok: true });
  expect(readJarvisToken()).toBe('sk-ant-oat01-from-browser');
});

test('runJarvisLogin reports failure and stores nothing when no token appears', async () => {
  const res = await runJarvisLogin({ spawnSetup: async () => ({ code: 1, stdout: 'cancelled' }) });
  expect(res.ok).toBe(false);
  expect(readJarvisToken()).toBeNull();
});
