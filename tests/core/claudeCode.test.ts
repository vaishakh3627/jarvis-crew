import { expect, test } from 'vitest';
import { StreamParser, describeTool, buildCrewAgents, ATLAS_SYSTEM } from '../../src/core/claudeCode.js';
import type { JarvisEvent } from '../../src/core/events.js';

function run(seq: any[]): JarvisEvent[] {
  const parser = new StreamParser();
  return seq.flatMap((obj) => parser.handle(obj));
}

test('parses an Atlas turn: thinking, tool_use, tool_result, then finish', () => {
  const events = run([
    { type: 'system', subtype: 'init' },
    {
      type: 'assistant',
      parent_tool_use_id: null,
      message: { content: [{ type: 'thinking', thinking: 'planning' }] },
    },
    {
      type: 'assistant',
      parent_tool_use_id: null,
      message: { content: [{ type: 'tool_use', id: 'w1', name: 'Write', input: { file_path: 'a.txt', content: 'hi' } }] },
    },
    {
      type: 'user',
      parent_tool_use_id: null,
      message: { content: [{ type: 'tool_result', tool_use_id: 'w1', content: 'ok' }] },
    },
    { type: 'assistant', parent_tool_use_id: null, message: { content: [{ type: 'text', text: 'done' }] } },
    { type: 'result', subtype: 'success', result: 'done' },
  ]);

  const types = events.map((e) => e.type);
  expect(types).toContain('agentStarted');
  expect(types).toContain('thinking');
  expect(types).toContain('toolStart');
  expect(types).toContain('toolResult');
  expect(types).toContain('text');
  expect(types).toContain('agentFinished');

  // tool_result is attributed to the right tool name via the tool_use id
  const tr = events.find((e) => e.type === 'toolResult');
  expect(tr).toMatchObject({ tool: 'Write', ok: true, agent: 'atlas' });

  // the only started agent here is atlas
  const started = events.filter((e) => e.type === 'agentStarted').map((e: any) => e.agent);
  expect(started).toEqual(['atlas']);
});

test('attributes subagent activity via Task tool + parent_tool_use_id', () => {
  const events = run([
    {
      type: 'assistant',
      parent_tool_use_id: null,
      message: {
        content: [
          { type: 'tool_use', id: 't1', name: 'Task', input: { subagent_type: 'volt', description: 'build form' } },
        ],
      },
    },
    {
      type: 'assistant',
      parent_tool_use_id: 't1', // this message comes from inside the volt subagent
      message: { content: [{ type: 'text', text: 'building' }] },
    },
    { type: 'result', subtype: 'success', result: 'ok' },
  ]);

  // volt was started and the inner text is attributed to volt, not atlas
  const started = events.filter((e) => e.type === 'agentStarted').map((e: any) => e.agent);
  expect(started).toContain('atlas');
  expect(started).toContain('volt');

  const voltText = events.find((e) => e.type === 'text');
  expect(voltText).toMatchObject({ agent: 'volt', text: 'building' });

  // both agents finish
  const finished = events.filter((e) => e.type === 'agentFinished').map((e: any) => e.agent).sort();
  expect(finished).toEqual(['atlas', 'volt']);
});

test('describeTool surfaces the most useful field per tool', () => {
  expect(describeTool('Write', { file_path: 'x.ts', content: '...' })).toBe('x.ts');
  expect(describeTool('Bash', { command: 'npm test' })).toBe('npm test');
  expect(describeTool('Grep', { pattern: 'foo' })).toBe('foo');
});

test('crew agents JSON defines the four specialists, Atlas system names them', () => {
  const agents = buildCrewAgents();
  expect(Object.keys(agents).sort()).toEqual(['forge', 'iris', 'sentry', 'volt']);
  expect(ATLAS_SYSTEM).toContain('iris');
  expect(ATLAS_SYSTEM).toContain('Task tool');
});
