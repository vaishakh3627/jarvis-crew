import { expect, test, vi } from 'vitest';
import { routeSlashCommand } from '../src/cli.js';

test('routes known slash commands', async () => {
  const actions = { login: vi.fn(), help: vi.fn(), clear: vi.fn() };
  expect(await routeSlashCommand('/login', actions)).toBe('handled');
  expect(actions.login).toHaveBeenCalled();
  expect(await routeSlashCommand('/help', actions)).toBe('handled');
  expect(await routeSlashCommand('/clear', actions)).toBe('handled');
});

test('non-commands and unknown commands are not handled', async () => {
  const actions = { login: vi.fn(), help: vi.fn(), clear: vi.fn() };
  expect(await routeSlashCommand('build a thing', actions)).toBe('passthrough');
  expect(await routeSlashCommand('/nope', actions)).toBe('unknown');
});
