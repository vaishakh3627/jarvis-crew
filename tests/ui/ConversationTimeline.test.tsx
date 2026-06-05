import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ConversationTimeline } from '../../src/ui/ConversationTimeline.js';
import type { TranscriptItem } from '../../src/ui/ConversationTimeline.js';

test('renders user, agent text, and tool lines color-tagged by agent', () => {
  const items: TranscriptItem[] = [
    { kind: 'user', text: 'build login' },
    { kind: 'agentText', agent: 'atlas', text: 'splitting work' },
    { kind: 'tool', agent: 'volt', tool: 'edit', detail: 'LoginForm.tsx', ok: true },
  ];
  const { lastFrame } = render(<ConversationTimeline items={items} />);
  const frame = lastFrame() ?? '';
  expect(frame).toContain('build login');
  expect(frame).toContain('Atlas');
  expect(frame).toContain('splitting work');
  expect(frame).toContain('edit');
  expect(frame).toContain('LoginForm.tsx');
});
