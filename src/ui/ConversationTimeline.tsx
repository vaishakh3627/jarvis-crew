import React from 'react';
import { Box, Text } from 'ink';
import type { AgentId } from '../core/events.js';
import { getAgent } from '../core/crew.js';

export type TranscriptItem =
  | { kind: 'user'; text: string }
  | { kind: 'agentText'; agent: AgentId; text: string }
  | { kind: 'tool'; agent: AgentId; tool: string; detail: string; ok: boolean };

function toolIcon(tool: string): string {
  switch (tool.toLowerCase()) {
    case 'write':
      return '✚';
    case 'edit':
      return '✎';
    case 'bash':
      return '❯';
    case 'read':
      return '◇';
    case 'grep':
    case 'glob':
      return '🔍';
    default:
      return '•';
  }
}

export function ConversationTimeline({ items }: { items: TranscriptItem[] }) {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        if (item.kind === 'user') {
          return (
            <Text key={i}>
              <Text bold color="cyanBright">
                ▸ you{'  '}
              </Text>
              {item.text}
            </Text>
          );
        }
        const def = getAgent(item.agent);
        if (item.kind === 'agentText') {
          return (
            <Text key={i}>
              <Text bold color={def.color}>
                {def.emoji} {def.name}
                {'  '}
              </Text>
              {item.text}
            </Text>
          );
        }
        return (
          <Text key={i}>
            <Text bold color={def.color}>
              {def.emoji} {def.name}{'  '}
            </Text>
            <Text color={item.ok ? 'green' : 'red'}>
              {toolIcon(item.tool)} {item.tool}
            </Text>
            <Text dimColor> {item.detail}</Text>
          </Text>
        );
      })}
    </Box>
  );
}
