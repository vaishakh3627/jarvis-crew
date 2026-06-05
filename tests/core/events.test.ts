import { expect, test } from 'vitest';
import { EventBus, ActivityTracker } from '../../src/core/events.js';

test('EventBus delivers events to subscribers and supports unsubscribe', () => {
  const bus = new EventBus();
  const seen: string[] = [];
  const off = bus.subscribe((e) => seen.push(e.type));
  bus.emit({ type: 'text', agent: 'atlas', text: 'hi' });
  off();
  bus.emit({ type: 'text', agent: 'atlas', text: 'bye' });
  expect(seen).toEqual(['text']);
});

test('ActivityTracker derives per-agent status and counts active agents', () => {
  const tracker = new ActivityTracker();
  tracker.apply({ type: 'agentStarted', agent: 'iris', task: 'design' });
  tracker.apply({ type: 'activity', activity: { id: 'iris', status: 'working', progress: 0.5, action: 'wireframe' } });
  tracker.apply({ type: 'agentStarted', agent: 'volt', task: 'build' });
  tracker.apply({ type: 'activity', activity: { id: 'volt', status: 'thinking', progress: 0.1 } });
  expect(tracker.get('iris')?.status).toBe('working');
  expect(tracker.activeCount()).toBe(2);
  tracker.apply({ type: 'agentFinished', agent: 'iris', ok: true });
  expect(tracker.get('iris')?.status).toBe('done');
  expect(tracker.activeCount()).toBe(1);
});
