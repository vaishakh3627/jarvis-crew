import React from 'react';
import { Box, Text } from 'ink';
import type { AgentActivity } from '../core/events.js';
import { getAgent } from '../core/crew.js';

function bar(progress: number): string {
  const filled = Math.round(progress * 5);
  return '▰'.repeat(filled) + '▱'.repeat(5 - filled);
}

export function AgentCard({ activity, skills }: { activity: AgentActivity; skills: string[] }) {
  const def = getAgent(activity.id);
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={def.color} paddingX={1}>
      <Text color={def.color}>{def.emoji} {def.name}</Text>
      <Text dimColor>{def.role}</Text>
      <Text color={def.color}>{activity.status} {bar(activity.progress)}</Text>
      {activity.action ? <Text dimColor>{activity.action}</Text> : null}
      <Text dimColor>{skills.map((s) => `[${s}]`).join(' ')}</Text>
    </Box>
  );
}
