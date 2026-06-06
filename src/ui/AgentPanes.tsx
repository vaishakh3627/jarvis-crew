import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { AgentActivity } from '../core/events.js';
import { getAgent } from '../core/crew.js';
import { AgentChip } from './AgentBadge.js';

function bar(progress: number): string {
  const filled = Math.round(progress * 5);
  return '▰'.repeat(filled) + '▱'.repeat(5 - filled);
}

function AgentBox({ activity, grow }: { activity: AgentActivity; grow?: boolean }) {
  const def = getAgent(activity.id);
  const active = activity.status === 'thinking' || activity.status === 'working';
  return (
    <Box
      flexDirection="column"
      borderStyle="bold"
      borderColor={def.color}
      paddingX={1}
      flexGrow={grow ? 1 : undefined}
    >
      <Box>
        {active ? (
          <Text color={def.color}>
            <Spinner type="dots" />{' '}
          </Text>
        ) : (
          <Text color={activity.status === 'error' ? 'red' : 'green'}>
            {activity.status === 'error' ? '✗' : '✓'}{' '}
          </Text>
        )}
        <AgentChip id={activity.id} />
        <Text color={def.color} dimColor>
          {' '}
          {def.role}
        </Text>
      </Box>
      <Text color={def.color}>{bar(activity.progress)}</Text>
      {activity.action ? <Text dimColor>{activity.action}</Text> : null}
    </Box>
  );
}

/**
 * Delegation tree: Atlas (the orchestrator) on top, branching down with ▼
 * connectors to the specialists currently working in parallel.
 */
export function AgentPanes({ activities }: { activities: AgentActivity[] }) {
  const atlas = activities.find((a) => a.id === 'atlas');
  const children = activities.filter((a) => a.id !== 'atlas');
  const root: AgentActivity = atlas ?? { id: 'atlas', status: 'working', progress: 0.5, action: 'orchestrating' };

  if (children.length === 0) {
    return <AgentBox activity={root} />;
  }

  return (
    <Box flexDirection="column">
      <AgentBox activity={root} />
      <Box gap={1}>
        {children.map((c) => {
          const def = getAgent(c.id);
          return (
            <Box key={c.id} flexGrow={1} justifyContent="center">
              <Text color={def.color}>▼</Text>
            </Box>
          );
        })}
      </Box>
      <Box gap={1}>
        {children.map((c) => (
          <AgentBox key={c.id} activity={c} grow />
        ))}
      </Box>
    </Box>
  );
}
