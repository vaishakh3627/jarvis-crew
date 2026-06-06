import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { AgentId } from '../core/events.js';
import { getAgent } from '../core/crew.js';

export function ThinkingView({ agent, text }: { agent: AgentId | null; text: string }) {
  if (!agent || !text.trim()) return null;
  const def = getAgent(agent);
  return (
    <Box>
      <Text color={def.color}>
        <Spinner type="dots" />{' '}
      </Text>
      <Text bold color={def.color}>
        {def.emoji} {def.name}
      </Text>
      <Text dimColor> thinking… {text}</Text>
    </Box>
  );
}
