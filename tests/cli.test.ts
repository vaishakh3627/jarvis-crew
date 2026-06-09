import { expect, test, vi } from 'vitest';
import { routeSlashCommand } from '../src/cli.js';

function makeActions() {
  return {
    login: vi.fn(),
    logout: vi.fn(),
    help: vi.fn(),
    clear: vi.fn(),
    compact: vi.fn(),
    devops: vi.fn(),
    btw: vi.fn(),
  };
}

test('routes known slash commands', async () => {
  const actions = makeActions();
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
  expect(await routeSlashCommand('/devops', actions)).toBe('handled');
  expect(actions.devops).toHaveBeenCalled();
});

test('/btw is handled and forwards the note text to Atlas', async () => {
  const actions = makeActions();
  expect(await routeSlashCommand('/btw fix the header spacing', actions)).toBe('handled');
  expect(actions.btw).toHaveBeenCalledWith('fix the header spacing');
  // Bare /btw forwards an empty note (the action shows usage).
  expect(await routeSlashCommand('/btw', actions)).toBe('handled');
  expect(actions.btw).toHaveBeenLastCalledWith('');
});

test('non-commands and unknown commands are not handled', async () => {
  const actions = makeActions();
  expect(await routeSlashCommand('build a thing', actions)).toBe('passthrough');
  expect(await routeSlashCommand('/nope', actions)).toBe('unknown');
});
