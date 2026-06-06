import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Footer } from '../../src/ui/Footer.js';

test('Footer shows keybinding hints and MAX when online', () => {
  const { lastFrame } = render(<Footer online={true} />);
  const frame = lastFrame() ?? '';
  expect(frame).toContain('interrupt');
  expect(frame).toContain('/login');
  expect(frame).toContain('MAX');
});

test('Footer shows offline when not online', () => {
  const { lastFrame } = render(<Footer online={false} />);
  expect((lastFrame() ?? '').toLowerCase()).toContain('offline');
});
