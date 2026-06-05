import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ThinkingView } from '../../src/ui/ThinkingView.js';

test('shows the active agent thinking text when present', () => {
  const { lastFrame } = render(<ThinkingView agent="atlas" text="planning 4 steps" />);
  const frame = lastFrame() ?? '';
  expect(frame).toContain('Atlas');
  expect(frame).toContain('planning 4 steps');
});

test('renders nothing when there is no thinking text', () => {
  const { lastFrame } = render(<ThinkingView agent={null} text="" />);
  expect((lastFrame() ?? '').trim()).toBe('');
});
