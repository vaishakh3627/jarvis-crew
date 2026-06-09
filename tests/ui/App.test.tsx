import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../../src/ui/App.js';
import { EventBus } from '../../src/core/events.js';

function flush() { return new Promise((r) => setTimeout(r, 10)); }

test('App renders streamed agent text into the transcript', async () => {
  const bus = new EventBus();
  const { lastFrame } = render(<App bus={bus} onUserSubmit={() => {}} busy={false} />);
  bus.emit({ type: 'agentStarted', agent: 'atlas', task: 'x' });
  bus.emit({ type: 'text', agent: 'atlas', text: 'hello world' });
  await flush();
  expect(lastFrame() ?? '').toContain('hello world');
});

test('App switches to split panes when two agents are active', async () => {
  const bus = new EventBus();
  const { lastFrame } = render(<App bus={bus} onUserSubmit={() => {}} busy={true} />);
  bus.emit({ type: 'agentStarted', agent: 'iris', task: 'design' });
  bus.emit({ type: 'activity', activity: { id: 'iris', status: 'working', progress: 0.3, action: 'wireframe' } });
  bus.emit({ type: 'agentStarted', agent: 'volt', task: 'build' });
  bus.emit({ type: 'activity', activity: { id: 'volt', status: 'working', progress: 0.3, action: 'Button.tsx' } });
  await flush();
  const frame = lastFrame() ?? '';
  expect(frame).toContain('wireframe');
  expect(frame).toContain('Button.tsx');
});

