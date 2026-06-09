import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planAlias, createAlias, aliasInstructions } from '../../src/core/setup.js';

test('planAlias puts the symlink next to the jarvis command, pointing at the real script', () => {
  const plan = planAlias('friday', '/usr/local/bin/jarvis', () => '/opt/jarvis/dist/cli.js');
  expect(plan).toEqual({
    binDir: '/usr/local/bin',
    target: '/opt/jarvis/dist/cli.js',
    linkPath: '/usr/local/bin/friday',
  });
});

test('aliasInstructions includes a runnable ln -s and a shell alias fallback', () => {
  const plan = planAlias('friday', '/usr/local/bin/jarvis', () => '/opt/jarvis/dist/cli.js');
  const text = aliasInstructions(plan, 'friday');
  expect(text).toContain('ln -s "/opt/jarvis/dist/cli.js" "/usr/local/bin/friday"');
  expect(text).toContain('alias friday="jarvis"');
});

describe('createAlias', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'jarvis-setup-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('makes a working symlink, and reports failure instead of throwing', () => {
    const target = join(dir, 'cli.js');
    writeFileSync(target, '// entry');
    const plan = planAlias('friday', join(dir, 'jarvis'), () => target);

    expect(createAlias(plan)).toBe(true);
    expect(existsSync(plan.linkPath)).toBe(true);
    expect(readlinkSync(plan.linkPath)).toBe(target);

    // A link function that throws (e.g. read-only dir) yields false, not a crash.
    expect(
      createAlias(plan, () => {
        throw new Error('EACCES');
      }),
    ).toBe(false);
  });
});
