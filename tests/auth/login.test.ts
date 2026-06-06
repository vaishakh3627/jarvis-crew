import { expect, test } from 'vitest';
import { login, getAntToken } from '../../src/auth/login.js';

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

test('getAntToken returns the trimmed token on success, null on failure', async () => {
  expect(await getAntToken({ run: async () => ({ code: 0, stdout: 'sk-ant-oat01-abc\n' }) })).toBe(
    'sk-ant-oat01-abc',
  );
  expect(await getAntToken({ run: async () => ({ code: 0, stdout: '' }) })).toBeNull();
  expect(await getAntToken({ run: async () => ({ code: 1, stdout: 'x' }) })).toBeNull();
});
