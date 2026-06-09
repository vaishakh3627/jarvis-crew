import { expect, test } from 'vitest';
import {
  diffLines,
  locateStartLine,
  numberLines,
  summarizeEdit,
  summarizeChanges,
  isEditTool,
  type DiffLine,
} from '../../src/core/diff.js';

test('isEditTool matches the diff-producing tools', () => {
  expect(['Edit', 'Write', 'MultiEdit'].every(isEditTool)).toBe(true);
  expect(isEditTool('Read')).toBe(false);
  expect(isEditTool('Bash')).toBe(false);
});

test('diffLines counts adds/removes and keeps shared lines as context', () => {
  const { added, removed, lines } = diffLines('a\nb\nc', 'a\nB\nc');
  expect(added).toBe(1);
  expect(removed).toBe(1);
  expect(lines.map((l) => l.kind)).toEqual(['ctx', 'del', 'add', 'ctx']);
});

test('diffLines treats an empty old side as all-added (a new file)', () => {
  const { added, removed } = diffLines('', 'x\ny\nz');
  expect(added).toBe(3);
  expect(removed).toBe(0);
});

test('locateStartLine finds the 1-based line where a block begins', () => {
  const file = 'one\ntwo\nthree\nfour';
  expect(locateStartLine(file, 'three')).toBe(3);
  expect(locateStartLine(file, 'three\nfour')).toBe(3);
  expect(locateStartLine(file, 'missing')).toBeNull();
  expect(locateStartLine(file, '')).toBeNull();
});

test('numberLines walks the gutter like a unified diff', () => {
  const lines: DiffLine[] = [
    { kind: 'del', text: 'old' },
    { kind: 'add', text: 'new' },
    { kind: 'ctx', text: 'kept' },
  ];
  numberLines(lines, 169);
  expect(lines[0]).toMatchObject({ kind: 'del', oldNo: 169 });
  expect(lines[1]).toMatchObject({ kind: 'add', newNo: 169 });
  expect(lines[2]).toMatchObject({ kind: 'ctx', oldNo: 170, newNo: 170 });
});

test('summarizeEdit builds a numbered diff for an Edit using the file on disk', () => {
  const file = 'l1\nl2\nNEW\nl4'; // post-edit content
  const summary = summarizeEdit(
    'Edit',
    { file_path: '/x.ts', old_string: 'OLD', new_string: 'NEW' },
    () => file,
  )!;
  expect(summary.file).toBe('/x.ts');
  expect(summary.added).toBe(1);
  expect(summary.removed).toBe(1);
  expect(summary.startLine).toBe(3);
  expect(summary.lines.find((l) => l.kind === 'add')?.newNo).toBe(3);
});

test('summarizeEdit falls back to no line numbers when the file is unreadable', () => {
  const summary = summarizeEdit('Edit', { file_path: '/x.ts', old_string: 'a', new_string: 'b' }, () => null)!;
  expect(summary.startLine).toBeNull();
  expect(summary.lines.every((l) => l.oldNo === undefined && l.newNo === undefined)).toBe(true);
});

test('summarizeEdit returns null without a file_path', () => {
  expect(summarizeEdit('Edit', {}, () => null)).toBeNull();
});

test('summarizeChanges merges per-file edits and totals them', () => {
  const sum = summarizeChanges([
    { file: 'a.ts', added: 2, removed: 1 },
    { file: 'a.ts', added: 3, removed: 0 },
    { file: 'b.ts', added: 1, removed: 4 },
  ]);
  expect(sum.totalAdded).toBe(6);
  expect(sum.totalRemoved).toBe(5);
  expect(sum.files.find((f) => f.file === 'a.ts')).toEqual({ file: 'a.ts', added: 5, removed: 1 });
});
