import { expect, test, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { PermissionPrompt } from '../../src/ui/PermissionPrompt.js';

const tick = () => new Promise((r) => setImmediate(r));

test('shows the tool and a y/n prompt; "y" resolves allow', async () => {
  const onResolve = vi.fn();
  const { stdin, lastFrame } = render(
    <PermissionPrompt agent="volt" tool="write" detail="LoginForm.tsx" onResolve={onResolve} />,
  );
  const frame = lastFrame() ?? '';
  expect(frame).toContain('write');
  expect(frame).toContain('LoginForm.tsx');
  expect(frame.toLowerCase()).toContain('allow');
  await tick();          // let useInput attach its stdin listener
  stdin.write('y');
  await tick();          // let the input event propagate
  expect(onResolve).toHaveBeenCalledWith(true);
});

test('"n" resolves deny', async () => {
  const onResolve = vi.fn();
  const { stdin } = render(
    <PermissionPrompt agent="volt" tool="bash" detail="rm -rf build" onResolve={onResolve} />,
  );
  await tick();
  stdin.write('n');
  await tick();
  expect(onResolve).toHaveBeenCalledWith(false);
});
