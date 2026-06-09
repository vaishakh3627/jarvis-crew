import { expect, test, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Input } from '../../src/ui/Input.js';

const tick = () => new Promise((r) => setImmediate(r));

test('accumulates typed characters and submits on Enter', async () => {
  const onSubmit = vi.fn();
  const { stdin } = render(<Input disabled={false} onSubmit={onSubmit} />);
  await tick();
  stdin.write('hi');
  await tick();
  stdin.write('\r'); // Enter
  await tick();
  expect(onSubmit).toHaveBeenCalledWith('hi', 'hi'); // (engineText, displayText)
});

test('up/down arrows recall previous inputs', async () => {
  const onSubmit = vi.fn();
  const { stdin, lastFrame } = render(
    <Input disabled={false} onSubmit={onSubmit} history={['first', 'second']} />,
  );
  await tick();
  stdin.write('\x1b[A'); // up → most recent
  await tick();
  expect(lastFrame() ?? '').toContain('second');
  stdin.write('\x1b[A'); // up → older
  await tick();
  expect(lastFrame() ?? '').toContain('first');
  stdin.write('\x1b[B'); // down → newer
  await tick();
  expect(lastFrame() ?? '').toContain('second');
});

test('does not submit while disabled', async () => {
  const onSubmit = vi.fn();
  const { stdin } = render(<Input disabled={true} onSubmit={onSubmit} />);
  await tick();
  stdin.write('x');
  await tick();
  stdin.write('\r');
  await tick();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('stays typeable while busy so the user can interject with /btw', async () => {
  const onSubmit = vi.fn();
  const { stdin } = render(<Input busy={true} onSubmit={onSubmit} />);
  await tick();
  stdin.write('/btw fix it');
  await tick();
  stdin.write('\r');
  await tick();
  expect(onSubmit).toHaveBeenCalledWith('/btw fix it', '/btw fix it');
});

test('a bracketed paste inserts clean text without the terminal markers', async () => {
  const onSubmit = vi.fn();
  const { stdin, lastFrame } = render(<Input onSubmit={onSubmit} />);
  await tick();
  // Cmd+V text paste: the terminal wraps it in ESC[200~ … ESC[201~.
  stdin.write('\u001b[200~hello world\u001b[201~');
  await tick();
  const frame = lastFrame() ?? '';
  expect(frame).toContain('hello world');
  expect(frame).not.toContain('200~'); // markers must not leak into the box
  stdin.write('\r');
  await tick();
  expect(onSubmit).toHaveBeenCalledWith('hello world', 'hello world');
});

test('injects dictated text into the box when the nonce changes', async () => {
  const onSubmit = vi.fn();
  const { rerender, stdin, lastFrame } = render(
    <Input onSubmit={onSubmit} injectText="" injectNonce={0} />,
  );
  await tick();
  rerender(<Input onSubmit={onSubmit} injectText="open the dashboard" injectNonce={1} />);
  await tick();
  expect(lastFrame() ?? '').toContain('open the dashboard');
  // The injected text is editable and submits normally.
  stdin.write('\r');
  await tick();
  expect(onSubmit).toHaveBeenCalledWith('open the dashboard', 'open the dashboard');
});
