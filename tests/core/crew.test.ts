import { expect, test } from 'vitest';
import { CREW, getAgent } from '../../src/core/crew.js';

test('crew has exactly the five expected agents', () => {
  expect(CREW.map((a) => a.id).sort()).toEqual(['atlas', 'edith', 'friday', 'iris', 'volt']);
});

test('every agent has a distinct color', () => {
  const colors = CREW.map((a) => a.color);
  expect(new Set(colors).size).toBe(colors.length);
});

test('atlas runs on opus and can delegate; specialists run on sonnet', () => {
  const atlas = getAgent('atlas');
  expect(atlas.model).toBe('claude-opus-4-8');
  expect(atlas.toolNames).toContain('delegate');
  expect(getAgent('volt').model).toBe('claude-sonnet-4-6');
});

test('each agent system prompt embeds its skill pack', () => {
  expect(getAgent('iris').systemPrompt).toContain('UI/UX');
});
