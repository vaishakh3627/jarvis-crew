import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { AgentActivity } from '../core/events.js';
import { getAgent } from '../core/crew.js';

function bar(progress: number): string {
  const filled = Math.round(progress * 5);
  return '▰'.repeat(filled) + '▱'.repeat(5 - filled);
}

export function AgentPanes({ activities }: { activities: AgentActivity[] }) {
  return (
    <Box flexDirection="row" gap={1}>
      {activities.map((a) => {
        const def = getAgent(a.id);
        const active = a.status === 'thinking' || a.status === 'working';
        return (
          <Box
            key={a.id}
            flexDirection="column"
            borderStyle="bold"
            borderColor={def.color}
            paddingX={1}
            flexGrow={1}
          >
            <Box>
              {active ? (
                <Text color={def.color}>
                  <Spinner type="dots" />{' '}
                </Text>
              ) : null}
              <Text bold color={def.color}>
                {def.emoji} {def.name}
              </Text>
            </Box>
            <Text dimColor>{def.role}</Text>
            <Text color={def.color}>{bar(a.progress)}</Text>
            {a.action ? <Text dimColor>{a.action}</Text> : null}
          </Box>
        );
      })}
    </Box>
  );
}
