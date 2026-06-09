import { expect, test, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { hearAvailable, Dictation } from '../../src/core/dictation.js';

test('hearAvailable defers to the injected check', () => {
  expect(hearAvailable(() => true)).toBe(true);
  expect(hearAvailable(() => false)).toBe(false);
});

function fakeHear() {
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; kill: ReturnType<typeof vi.fn> };
  child.stdout = new EventEmitter();
  child.kill = vi.fn();
  return child;
}

test('Dictation captures the latest hypothesis line and stops cleanly', () => {
  const child = fakeHear();
  const d = new Dictation(() => child as never);

  expect(d.active).toBe(false);
  d.start();
  expect(d.active).toBe(true);

  // hear prints its running hypothesis line by line; the last is most complete.
  child.stdout.emit('data', Buffer.from('open the\n'));
  child.stdout.emit('data', Buffer.from('open the login page\n'));

  const text = d.stop();
  expect(text).toBe('open the login page');
  expect(child.kill).toHaveBeenCalled();
  expect(d.active).toBe(false);
});

test('Dictation returns empty string when nothing was heard', () => {
  const child = fakeHear();
  const d = new Dictation(() => child as never);
  d.start();
  expect(d.stop()).toBe('');
});
