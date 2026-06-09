import React from 'react';
import { Box, Text } from 'ink';
import type { AgentId } from '../core/events.js';
import type { DiffLine, FileChange } from '../core/diff.js';
import { getAgent } from '../core/crew.js';
import { Markdown } from './Markdown.js';
import { AgentChip, YouChip } from './AgentBadge.js';

export type TranscriptItem =
  | { kind: 'user'; text: string }
  | { kind: 'agentText'; agent: AgentId; text: string }
  | { kind: 'tool'; agent: AgentId; tool: string; detail: string; ok: boolean }
  | {
      kind: 'diff';
      agent: AgentId;
      file: string;
      added: number;
      removed: number;
      startLine: number | null;
      lines: DiffLine[];
      more: number;
    }
  | { kind: 'summary'; files: FileChange[]; totalAdded: number; totalRemoved: number };

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

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

/** A file edit shown as a real diff: header, counts, and changed lines. */
function DiffView({ item }: { item: Extract<TranscriptItem, { kind: 'diff' }> }) {
  const def = getAgent(item.agent);
  const gutter = Math.max(
    3,
    ...item.lines.map((l) => String(l.newNo ?? l.oldNo ?? '').length),
  );
  const num = (n?: number) => (n != null ? String(n) : '').padStart(gutter, ' ');
  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      <Box>
        <Text color={def.color}>{def.emoji} </Text>
        <Text color={def.color} bold>
          ✎ Update
        </Text>
        <Text dimColor>({item.file})</Text>
      </Box>
      <Box marginLeft={2}>
        <Text color="green">+{item.added}</Text>
        <Text dimColor> · </Text>
        <Text color="red">−{item.removed}</Text>
      </Box>
      <Box flexDirection="column" marginLeft={2}>
        {item.lines.map((l, i) => {
          if (l.kind === 'add') {
            return (
              <Text key={i} color="green">
                {num(l.newNo)} + {l.text}
              </Text>
            );
          }
          if (l.kind === 'del') {
            return (
              <Text key={i} color="red">
                {num(l.oldNo)} − {l.text}
              </Text>
            );
          }
          return (
            <Text key={i} dimColor>
              {num(l.newNo)}   {l.text}
            </Text>
          );
        })}
        {item.more > 0 ? <Text dimColor>{' '.repeat(gutter)} …+{item.more} more lines</Text> : null}
      </Box>
    </Box>
  );
}

/** End-of-run "what changed": files touched with their +/- totals. */
function SummaryView({ item }: { item: Extract<TranscriptItem, { kind: 'summary' }> }) {
  if (item.files.length === 0) return null;
  return (
    <Box flexDirection="column" marginLeft={1} marginBottom={1}>
      <Box>
        <Text bold color="cyan">
          ✔ Changed {item.files.length} file{item.files.length === 1 ? '' : 's'}{' '}
        </Text>
        <Text color="green">+{item.totalAdded}</Text>
        <Text dimColor> </Text>
        <Text color="red">−{item.totalRemoved}</Text>
      </Box>
      {item.files.map((f, i) => (
        <Box key={i} marginLeft={2}>
          <Text dimColor>• {basename(f.file)} </Text>
          <Text color="green">+{f.added}</Text>
          <Text dimColor> </Text>
          <Text color="red">−{f.removed}</Text>
        </Box>
      ))}
    </Box>
  );
}

/** Renders a single transcript item. Callers supply the React key. */
export function TranscriptRow({ item }: { item: TranscriptItem }) {
  if (item.kind === 'diff') return <DiffView item={item} />;
  if (item.kind === 'summary') return <SummaryView item={item} />;
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
