import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ConversationTimeline, splitTranscript, TranscriptRow } from '../../src/ui/ConversationTimeline.js';
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

test('splitTranscript keeps a trailing streaming agentText live, commits the rest', () => {
  const items: TranscriptItem[] = [
    { kind: 'user', text: 'hi' },
    { kind: 'agentText', agent: 'atlas', text: 'working…' },
  ];
  expect(splitTranscript(items)).toEqual({ committed: [items[0]], live: items[1] });
});

test('splitTranscript commits everything when the last item is immutable', () => {
  const items: TranscriptItem[] = [
    { kind: 'agentText', agent: 'atlas', text: 'done' },
    { kind: 'tool', agent: 'volt', tool: 'edit', detail: 'x', ok: true },
  ];
  expect(splitTranscript(items)).toEqual({ committed: items, live: null });
});

test('splitTranscript handles an empty transcript', () => {
  expect(splitTranscript([])).toEqual({ committed: [], live: null });
});

test('a diff row renders the file, counts, and a numbered changed line', () => {
  const item: TranscriptItem = {
    kind: 'diff',
    agent: 'volt',
    file: 'src/Card.tsx',
    added: 1,
    removed: 1,
    startLine: 169,
    lines: [
      { kind: 'del', text: '<Card className="a">', oldNo: 169 },
      { kind: 'add', text: '<Card className="b">', newNo: 169 },
      { kind: 'ctx', text: '<Header>', oldNo: 170, newNo: 170 },
    ],
    more: 0,
  };
  const frame = render(<TranscriptRow item={item} />).lastFrame() ?? '';
  expect(frame).toContain('Update');
  expect(frame).toContain('src/Card.tsx');
  expect(frame).toContain('+1');
  expect(frame).toContain('169');
  expect(frame).toContain('className="b"');
});

test('a summary row lists changed files with totals', () => {
  const item: TranscriptItem = {
    kind: 'summary',
    files: [
      { file: 'src/Card.tsx', added: 12, removed: 3 },
      { file: 'src/AppNewTable.scss', added: 9, removed: 2 },
    ],
    totalAdded: 21,
    totalRemoved: 5,
  };
  const frame = render(<TranscriptRow item={item} />).lastFrame() ?? '';
  expect(frame).toContain('Changed 2 files');
  expect(frame).toContain('+21');
  expect(frame).toContain('Card.tsx');
  expect(frame).toContain('AppNewTable.scss');
});
