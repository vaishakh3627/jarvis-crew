import { expect, test } from 'vitest';
import { skillPacks } from '../../../src/core/skills/packs.js';

test('every crew member has a non-empty skill pack', () => {
  for (const id of ['atlas', 'iris', 'volt', 'edith', 'friday', 'vision', 'sentry', 'forge'] as const) {
    expect(skillPacks[id].length).toBeGreaterThan(40);
  }
});
