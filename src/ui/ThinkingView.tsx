import React from 'react';
import { Box, Text } from 'ink';
import type { AgentId } from '../core/events.js';
import { getAgent } from '../core/crew.js';

export function ThinkingView({ agent, text }: { agent: AgentId | null; text: string }) {
  if (!agent || !text.trim()) return null;
  const def = getAgent(agent);
  return (
    <Box>
      <Text color={def.color} dimColor>
        {def.emoji} {def.name} thinking… {text}
      </Text>
    </Box>
  );
}
