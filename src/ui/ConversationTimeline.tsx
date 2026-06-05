import React from 'react';
import { Box, Text } from 'ink';
import type { AgentId } from '../core/events.js';
import { getAgent } from '../core/crew.js';

export type TranscriptItem =
  | { kind: 'user'; text: string }
  | { kind: 'agentText'; agent: AgentId; text: string }
  | { kind: 'tool'; agent: AgentId; tool: string; detail: string; ok: boolean };

export function ConversationTimeline({ items }: { items: TranscriptItem[] }) {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        if (item.kind === 'user') {
          return (
            <Text key={i}>
              <Text color="cyan">you › </Text>
              {item.text}
            </Text>
          );
        }
        const def = getAgent(item.agent);
        if (item.kind === 'agentText') {
          return (
            <Text key={i}>
              <Text color={def.color}>{def.emoji} {def.name}: </Text>
              {item.text}
            </Text>
          );
        }
        return (
          <Text key={i}>
            <Text color={def.color}>{def.emoji} {def.name} </Text>
            <Text color={item.ok ? 'green' : 'red'}>{item.tool}</Text>
            <Text dimColor> {item.detail}</Text>
          </Text>
        );
      })}
    </Box>
  );
}
