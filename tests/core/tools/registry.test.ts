import { expect, test } from 'vitest';
import { ToolRegistry } from '../../../src/core/tools/registry.js';
import type { Tool } from '../../../src/core/tools/types.js';

const fake: Tool = {
  name: 'echo',
  description: 'echoes',
  destructive: false,
  inputSchema: { type: 'object', properties: { msg: { type: 'string' } }, required: ['msg'] },
  run: async (input: { msg: string }) => input.msg,
};

test('registry registers, looks up, and filters by name', () => {
  const reg = new ToolRegistry([fake]);
  expect(reg.get('echo')).toBe(fake);
  expect(reg.get('nope')).toBeUndefined();
  expect(reg.pick(['echo']).map((t) => t.name)).toEqual(['echo']);
  expect(reg.pick(['echo', 'missing']).map((t) => t.name)).toEqual(['echo']);
});
