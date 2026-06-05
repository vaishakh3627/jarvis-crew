import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentId } from '../core/events.js';
import { getAgent } from '../core/crew.js';

export function PermissionPrompt({
  agent,
  tool,
  detail,
  onResolve,
}: {
  agent: AgentId;
  tool: string;
  detail: string;
  onResolve: (allow: boolean) => void;
}) {
  const def = getAgent(agent);
  useInput((input) => {
    const c = input.toLowerCase();
    if (c === 'y') onResolve(true);
    else if (c === 'n') onResolve(false);
  });
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text>
        <Text color={def.color}>{def.emoji} {def.name}</Text> wants to run{' '}
        <Text color="yellow">{tool}</Text>
      </Text>
      <Text dimColor>{detail}</Text>
      <Text>Allow? <Text color="green">(y)</Text>es / <Text color="red">(n)</Text>o</Text>
    </Box>
  );
}
