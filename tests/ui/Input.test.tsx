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
