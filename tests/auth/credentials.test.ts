import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveApiKey, getCredentials, isAuthenticated } from '../../src/auth/credentials.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'jarvis-cfg-'));
  vi.stubEnv('JARVIS_CONFIG_DIR', dir);
  vi.stubEnv('ANTHROPIC_API_KEY', '');
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

test('environment ANTHROPIC_API_KEY takes priority', () => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-env');
  expect(getCredentials()).toEqual({ apiKey: 'sk-env' });
  expect(isAuthenticated()).toBe(true);
});

test('saved key is used when no env var present', async () => {
  await saveApiKey('sk-saved');
  expect(getCredentials()).toEqual({ apiKey: 'sk-saved' });
  const onDisk = await readFile(join(dir, 'credentials.json'), 'utf8');
  expect(onDisk).toContain('sk-saved');
});

test('no credentials => unauthenticated', () => {
  expect(getCredentials()).toBeNull();
  expect(isAuthenticated()).toBe(false);
});
