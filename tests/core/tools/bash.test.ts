import { expect, test } from 'vitest';
import { bashTool } from '../../../src/core/tools/bash.js';

const ctx = () => ({ cwd: process.cwd(), signal: new AbortController().signal });

test('bash runs a command and returns stdout', async () => {
  const out = await bashTool.run({ command: 'echo jarvis' }, ctx());
  expect(out).toContain('jarvis');
});

test('bash reports non-zero exit with stderr', async () => {
  const out = await bashTool.run({ command: 'node -e "process.stderr.write(\'boom\'); process.exit(2)"' }, ctx());
  expect(out).toContain('exit code 2');
  expect(out).toContain('boom');
});

test('bash is destructive', () => {
  expect(bashTool.destructive).toBe(true);
});
