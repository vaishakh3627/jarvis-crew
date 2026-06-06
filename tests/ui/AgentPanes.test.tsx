import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { AgentPanes } from '../../src/ui/AgentPanes.js';
import { AgentCard } from '../../src/ui/AgentCard.js';
import type { AgentActivity } from '../../src/core/events.js';

test('AgentPanes shows Atlas as the root delegating to active children', () => {
  const activities: AgentActivity[] = [
    { id: 'volt', status: 'working', progress: 0.4, action: 'LoginForm.tsx' },
    { id: 'edith', status: 'working', progress: 0.8, action: '/api/auth' },
  ];
  const { lastFrame } = render(<AgentPanes activities={activities} />);
  const frame = lastFrame() ?? '';
  expect(frame).toContain('Atlas'); // tree root
  expect(frame).toContain('▼'); // delegation branches
  expect(frame).toContain('Volt');
  expect(frame).toContain('LoginForm.tsx');
  expect(frame).toContain('Edith');
  expect(frame).toContain('/api/auth');
});

test('AgentCard shows role and skill chips for the focused agent', () => {
  const activity: AgentActivity = { id: 'iris', status: 'working', progress: 0.6, action: 'wireframe' };
  const { lastFrame } = render(<AgentCard activity={activity} skills={['a11y', 'design-systems']} />);
  const frame = lastFrame() ?? '';
  expect(frame).toContain('Iris');
  expect(frame).toContain('UI/UX');
  expect(frame).toContain('a11y');
});
