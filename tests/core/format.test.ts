import { expect, test } from 'vitest';
import { formatDuration, formatTokens } from '../../src/core/format.js';

test('formatDuration renders seconds, minutes, and hours', () => {
  expect(formatDuration(45)).toBe('45s');
  expect(formatDuration(83)).toBe('1m 23s');
  expect(formatDuration(3661)).toBe('1h 1m');
  expect(formatDuration(-5)).toBe('0s');
});

test('formatTokens abbreviates thousands and millions', () => {
  expect(formatTokens(999)).toBe('999');
  expect(formatTokens(1500)).toBe('1.5k');
  expect(formatTokens(22100)).toBe('22.1k');
  expect(formatTokens(2000)).toBe('2k');
  expect(formatTokens(1_200_000)).toBe('1.2M');
});
