import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Footer } from '../../src/ui/Footer.js';

test('Footer shows keybinding hints, /logout, and MAX when online', () => {
  const { lastFrame } = render(<Footer online={true} />);
  const frame = lastFrame() ?? '';
  expect(frame).toContain('interrupt');
  expect(frame).toContain('/logout');
  expect(frame).toContain('MAX');
});

test('Footer shows /login and offline when not online', () => {
  const { lastFrame } = render(<Footer online={false} />);
  const frame = lastFrame() ?? '';
  expect(frame).toContain('/login');
  expect(frame.toLowerCase()).toContain('offline');
});
