import { afterEach, beforeEach, expect, test } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readTool, writeTool, editTool, globTool, grepTool } from '../../../src/core/tools/fsTools.js';

let dir: string;
const ctx = () => ({ cwd: dir, signal: new AbortController().signal });

beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'jarvis-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

test('write creates a file and read returns its contents', async () => {
  await writeTool.run({ path: 'a.txt', content: 'hello' }, ctx());
  const out = await readTool.run({ path: 'a.txt' }, ctx());
  expect(out).toContain('hello');
});

test('edit replaces an exact unique string', async () => {
  await writeFile(join(dir, 'b.txt'), 'foo bar baz');
  await editTool.run({ path: 'b.txt', oldString: 'bar', newString: 'QUX' }, ctx());
  const out = await readTool.run({ path: 'b.txt' }, ctx());
  expect(out).toContain('foo QUX baz');
});

test('edit throws when oldString is not unique', async () => {
  await writeFile(join(dir, 'c.txt'), 'x x');
  await expect(editTool.run({ path: 'c.txt', oldString: 'x', newString: 'y' }, ctx())).rejects.toThrow(/unique/i);
});

test('glob finds files by pattern', async () => {
  await mkdir(join(dir, 'src'));
  await writeFile(join(dir, 'src', 'one.ts'), '');
  await writeFile(join(dir, 'src', 'two.ts'), '');
  const out = await globTool.run({ pattern: 'src/*.ts' }, ctx());
  expect(out).toContain('one.ts');
  expect(out).toContain('two.ts');
});

test('grep finds matching lines', async () => {
  await writeFile(join(dir, 'd.txt'), 'alpha\nbeta\ngamma');
  const out = await grepTool.run({ pattern: 'bet', path: '.' }, ctx());
  expect(out).toContain('beta');
});

test('write marks itself destructive, read does not', () => {
  expect(writeTool.destructive).toBe(true);
  expect(readTool.destructive).toBe(false);
});
