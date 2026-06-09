import { afterEach, beforeEach, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  configExists,
  getDisplayName,
  readConfig,
  writeConfig,
  validateName,
  isDevopsEnabled,
  setDevopsEnabled,
} from '../../src/core/config.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jarvis-config-'));
  process.env.JARVIS_CONFIG_DIR = dir;
});

afterEach(() => {
  delete process.env.JARVIS_CONFIG_DIR;
  rmSync(dir, { recursive: true, force: true });
});

test('config defaults to jarvis until written, then round-trips', () => {
  expect(configExists()).toBe(false);
  expect(getDisplayName()).toBe('jarvis');

  writeConfig({ name: 'friday' });
  expect(configExists()).toBe(true);
  expect(readConfig()).toEqual({ name: 'friday', devops: false });
  expect(getDisplayName()).toBe('friday');
});

test('devops is off by default and toggles while preserving the name', () => {
  expect(isDevopsEnabled()).toBe(false);

  writeConfig({ name: 'friday' });
  setDevopsEnabled(true);
  expect(isDevopsEnabled()).toBe(true);
  expect(getDisplayName()).toBe('friday'); // name preserved across the toggle

  setDevopsEnabled(false);
  expect(isDevopsEnabled()).toBe(false);
  expect(getDisplayName()).toBe('friday');
});

test('validateName accepts clean tokens and normalizes case/whitespace', () => {
  expect(validateName('Friday')).toEqual({ ok: true, name: 'friday' });
  expect(validateName('  edith ')).toEqual({ ok: true, name: 'edith' });
  expect(validateName('jar-vis2')).toEqual({ ok: true, name: 'jar-vis2' });
});

test('validateName treats empty input as the default', () => {
  expect(validateName('')).toEqual({ ok: true, name: 'jarvis' });
  expect(validateName('   ')).toEqual({ ok: true, name: 'jarvis' });
});

test('validateName rejects spaces, symbols, leading digits, and over-long names', () => {
  expect(validateName('my bot').ok).toBe(false);
  expect(validateName('jar_vis').ok).toBe(false);
  expect(validateName('2cool').ok).toBe(false);
  expect(validateName('a').ok).toBe(false); // too short (needs 2+)
  expect(validateName('superlongassistant').ok).toBe(false); // > 12
});
