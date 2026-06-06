import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Header } from '../../src/ui/Header.js';

test('Header renders the wordmark, notice, and a MAX badge', () => {
  const { lastFrame } = render(<Header notice="Ready to go" status="MAX" />);
  const frame = lastFrame() ?? '';
  expect(frame).toContain('J'); // gradient wordmark letters
  expect(frame).toContain('Ready to go');
  expect(frame).toContain('MAX');
});

test('Header shows OFFLINE when signed out', () => {
  const { lastFrame } = render(<Header notice="x" status="OFFLINE" />);
  expect(lastFrame() ?? '').toContain('OFFLINE');
});
