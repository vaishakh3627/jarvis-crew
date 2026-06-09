import { expect, test, vi } from 'vitest';
import { routeSlashCommand } from '../src/cli.js';

test('routes known slash commands', async () => {
  const actions = { login: vi.fn(), logout: vi.fn(), help: vi.fn(), clear: vi.fn(), compact: vi.fn() };
  expect(await routeSlashCommand('/login', actions)).toBe('handled');
  expect(actions.login).toHaveBeenCalled();
  expect(await routeSlashCommand('/logout', actions)).toBe('handled');
  expect(actions.logout).toHaveBeenCalled();
  expect(await routeSlashCommand('/help', actions)).toBe('handled');
  expect(actions.help).toHaveBeenCalled();
  expect(await routeSlashCommand('/clear', actions)).toBe('handled');
  expect(actions.clear).toHaveBeenCalled();
  expect(await routeSlashCommand('/compact', actions)).toBe('handled');
  expect(actions.compact).toHaveBeenCalled();
});

test('non-commands and unknown commands are not handled', async () => {
  const actions = { login: vi.fn(), logout: vi.fn(), help: vi.fn(), clear: vi.fn(), compact: vi.fn() };
  expect(await routeSlashCommand('build a thing', actions)).toBe('passthrough');
  expect(await routeSlashCommand('/nope', actions)).toBe('unknown');
});
