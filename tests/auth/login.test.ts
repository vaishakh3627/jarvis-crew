import { expect, test } from 'vitest';
import { login, hasAntSession } from '../../src/auth/login.js';

test('login runs the browser OAuth command when available', async () => {
  const calls: string[] = [];
  const result = await login({
    hasAnt: async () => true,
    runAnt: async (args) => { calls.push(args.join(' ')); return { code: 0 }; },
  });
  expect(result.kind).toBe('browser');
  expect(calls[0]).toBe('auth login');
});

test('login reports needsApiKey when no browser flow is available', async () => {
  const result = await login({ hasAnt: async () => false, runAnt: async () => ({ code: 0 }) });
  expect(result.kind).toBe('needsApiKey');
});

test('login surfaces a failed browser flow', async () => {
  const result = await login({ hasAnt: async () => true, runAnt: async () => ({ code: 1 }) });
  expect(result.kind).toBe('failed');
});

test('hasAntSession reflects `ant auth status` exit code', async () => {
  expect(await hasAntSession({ runAntStatus: async () => ({ code: 0 }) })).toBe(true);
  expect(await hasAntSession({ runAntStatus: async () => ({ code: 1 }) })).toBe(false);
});
