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
  expect(onSubmit).toHaveBeenCalledWith('hi');
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
