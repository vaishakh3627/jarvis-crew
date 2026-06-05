import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { CrewStatusLine } from '../../src/ui/CrewStatusLine.js';
import type { AgentActivity } from '../../src/core/events.js';

test('renders a line per active agent with its emoji and status', () => {
  const activities: AgentActivity[] = [
    { id: 'atlas', status: 'thinking', progress: 0.1 },
    { id: 'volt', status: 'working', progress: 0.5, action: 'Button.tsx' },
  ];
  const { lastFrame } = render(<CrewStatusLine activities={activities} />);
  const frame = lastFrame() ?? '';
  expect(frame).toContain('Atlas');
  expect(frame).toContain('thinking');
  expect(frame).toContain('Volt');
  expect(frame).toContain('Button.tsx');
});
