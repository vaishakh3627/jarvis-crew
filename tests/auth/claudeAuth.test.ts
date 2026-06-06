import { expect, test } from 'vitest';
import { isClaudeLoggedIn, runClaudeLogin } from '../../src/auth/claudeAuth.js';

test('isClaudeLoggedIn parses `loggedIn` from claude auth status JSON', async () => {
  expect(
    await isClaudeLoggedIn({ run: async () => ({ code: 0, stdout: '{"loggedIn": true, "subscriptionType":"max"}' }) }),
  ).toBe(true);
  expect(await isClaudeLoggedIn({ run: async () => ({ code: 0, stdout: '{"loggedIn": false}' }) })).toBe(false);
  expect(await isClaudeLoggedIn({ run: async () => ({ code: 1, stdout: '' }) })).toBe(false);
});

test('isClaudeLoggedIn falls back to a lenient match if JSON has extra noise', async () => {
  expect(
    await isClaudeLoggedIn({ run: async () => ({ code: 0, stdout: 'note\n{ "loggedIn": true }\n' }) }),
  ).toBe(true);
});

test('runClaudeLogin returns the login exit code', async () => {
  expect(await runClaudeLogin({ spawnLogin: async () => ({ code: 0 }) })).toEqual({ code: 0 });
  expect(await runClaudeLogin({ spawnLogin: async () => ({ code: 1 }) })).toEqual({ code: 1 });
});
