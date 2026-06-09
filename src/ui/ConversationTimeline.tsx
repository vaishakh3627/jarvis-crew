import React from 'react';
import { Box, Text } from 'ink';
import type { AgentId } from '../core/events.js';
import { getAgent } from '../core/crew.js';
import { Markdown } from './Markdown.js';
import { AgentChip, YouChip } from './AgentBadge.js';

export type TranscriptItem =
  | { kind: 'user'; text: string }
  | { kind: 'agentText'; agent: AgentId; text: string }
  | { kind: 'tool'; agent: AgentId; tool: string; detail: string; ok: boolean };

/**
 * Split the transcript into items safe to freeze in <Static> (printed once,
 * never repainted) and a single trailing item still being written.
 *
 * Only a trailing `agentText` can still mutate (text streams in chunk by chunk),
 * so it stays "live" in the dynamic region. `user` and `tool` items are
 * immutable the moment they appear, so they commit immediately. Keeping the
 * append-only history out of the repainted frame is what stops Ink from
 * full-screen-clearing on every render (the flicker during parallel work).
 */
export function splitTranscript(items: TranscriptItem[]): {
  committed: TranscriptItem[];
  live: TranscriptItem | null;
} {
  const last = items[items.length - 1];
  if (last && last.kind === 'agentText') {
    return { committed: items.slice(0, -1), live: last };
  }
  return { committed: items, live: null };
}

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

/** Renders a single transcript item. Callers supply the React key. */
export function TranscriptRow({ item }: { item: TranscriptItem }) {
  if (item.kind === 'user') {
    return (
      <Gutter color="cyan">
        <Box flexDirection="column">
          <Box>
            <YouChip />
          </Box>
          <Text>{item.text}</Text>
        </Box>
      </Gutter>
    );
  }
  const def = getAgent(item.agent);
  if (item.kind === 'agentText') {
    return (
      <Gutter color={def.color}>
        <Box flexDirection="column">
          <Box>
            <AgentChip id={item.agent} />
          </Box>
          <Markdown text={item.text} />
        </Box>
      </Gutter>
    );
  }
  return (
    <Box marginLeft={2} marginBottom={0}>
      <Text dimColor>{def.emoji} </Text>
      <Text color={item.ok ? 'green' : 'red'}>
        {toolIcon(item.tool)} {item.tool}
      </Text>
      <Text dimColor> {item.detail}</Text>
    </Box>
  );
}

export function ConversationTimeline({ items }: { items: TranscriptItem[] }) {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <TranscriptRow key={i} item={item} />
      ))}
    </Box>
  );
}
