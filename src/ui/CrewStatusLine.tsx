import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { AgentActivity } from '../core/events.js';
import { getAgent } from '../core/crew.js';

function bar(progress: number): string {
  const filled = Math.round(progress * 5);
  return '▰'.repeat(filled) + '▱'.repeat(5 - filled);
}

function glyph(status: string): string {
  return status === 'done' ? '✓' : status === 'error' ? '✗' : '○';
}

function glyphColor(status: string): string {
  return status === 'done' ? 'green' : status === 'error' ? 'red' : 'gray';
}

export function CrewStatusLine({ activities }: { activities: AgentActivity[] }) {
  if (activities.length === 0) return null;
  return (
    <Box flexDirection="column" borderStyle="bold" borderColor="gray" paddingX={1}>
      <Text bold dimColor>
        CREW
      </Text>
      {activities.map((a) => {
        const def = getAgent(a.id);
        const active = a.status === 'thinking' || a.status === 'working';
        return (
          <Box key={a.id}>
            {active ? (
              <Text color={def.color}>
                <Spinner type="dots" />{' '}
              </Text>
            ) : (
              <Text color={glyphColor(a.status)}>{glyph(a.status)} </Text>
            )}
            <Text bold color={def.color}>
              {def.emoji} {def.name}
            </Text>
            <Text dimColor> {def.role} </Text>
            <Text color={def.color}>{bar(a.progress)}</Text>
            {active ? <Text dimColor> {a.status}</Text> : null}
            {a.action ? <Text dimColor> · {a.action}</Text> : null}
          </Box>
        );
      })}
    </Box>
  );
}
