import { expect, test, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { speakable, Speaker } from '../../src/core/speech.js';

test('speakable strips code, markdown, and urls, and caps length', () => {
  expect(speakable('Done. ```const x = 1;``` shipped.')).toBe('Done. (code) shipped.');
  expect(speakable('See `foo()` and **bold** text')).toBe('See and bold text');
  expect(speakable('Read the [docs](https://x.com/y) now')).toBe('Read the docs now');
  expect(speakable('- item one\n- item two')).toBe('item one item two');
  expect(speakable('x'.repeat(700)).endsWith('…')).toBe(true);
  expect(speakable('x'.repeat(700)).length).toBe(601);
});

function fakeChild() {
  const c = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> };
  c.kill = vi.fn();
  return c;
}

test('Speaker speaks sanitized text and a new utterance cancels the previous', () => {
  const spawns: Array<{ text: string; child: ReturnType<typeof fakeChild> }> = [];
  const spawnSay = (text: string) => {
    const child = fakeChild();
    spawns.push({ text, child });
    return child as never;
  };
  const speaker = new Speaker(spawnSay);

  speaker.speak('First **reply**');
  expect(spawns[0].text).toBe('First reply');

  speaker.speak('Second');
  expect(spawns[0].child.kill).toHaveBeenCalled(); // previous cancelled
  expect(spawns[1].text).toBe('Second');

  speaker.stop();
  expect(spawns[1].child.kill).toHaveBeenCalled();
});

test('Speaker ignores text that is empty after sanitizing', () => {
  const spawnSay = vi.fn();
  new Speaker(spawnSay as never).speak('`just inline code`');
  // Inline code is stripped → empty → nothing spoken.
  expect(spawnSay).not.toHaveBeenCalled();
});
