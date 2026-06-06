import React from 'react';
import { Box, Text } from 'ink';
import type { AgentId } from '../core/events.js';
import { getAgent } from '../core/crew.js';
import { Markdown } from './Markdown.js';

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

/** A message with a colored left quote-bar. */
function Gutter({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <Box
      borderStyle="bold"
      borderColor={color}
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      paddingLeft={1}
      marginBottom={1}
    >
      {children}
    </Box>
  );
}

export function ConversationTimeline({ items }: { items: TranscriptItem[] }) {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        if (item.kind === 'user') {
          return (
            <Gutter key={i} color="cyan">
              <Box flexDirection="column">
                <Text bold color="cyanBright">
                  ▸ you
                </Text>
                <Text>{item.text}</Text>
              </Box>
            </Gutter>
          );
        }
        const def = getAgent(item.agent);
        if (item.kind === 'agentText') {
          return (
            <Gutter key={i} color={def.color}>
              <Box flexDirection="column">
                <Text bold color={def.color}>
                  {def.emoji} {def.name}
                </Text>
                <Markdown text={item.text} />
              </Box>
            </Gutter>
          );
        }
        return (
          <Box key={i} marginLeft={2} marginBottom={0}>
            <Text dimColor>{def.emoji} </Text>
            <Text color={item.ok ? 'green' : 'red'}>
              {toolIcon(item.tool)} {item.tool}
            </Text>
            <Text dimColor> {item.detail}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
