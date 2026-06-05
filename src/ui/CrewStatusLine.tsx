import React from 'react';
import { Box, Text } from 'ink';
import type { AgentActivity } from '../core/events.js';
import { getAgent } from '../core/crew.js';

function bar(progress: number): string {
  const filled = Math.round(progress * 5);
  return '▰'.repeat(filled) + '▱'.repeat(5 - filled);
}

export function CrewStatusLine({ activities }: { activities: AgentActivity[] }) {
  if (activities.length === 0) return null;
  return (
    <Box flexDirection="column">
      {activities.map((a) => {
        const def = getAgent(a.id);
        return (
          <Text key={a.id}>
            <Text color={def.color}>{def.emoji} {def.name}</Text>
            <Text dimColor> · {def.role} · </Text>
            <Text color={def.color}>{a.status} {bar(a.progress)}</Text>
            {a.action ? <Text dimColor> {a.action}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}
