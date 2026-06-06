import React from 'react';
import { Box, Text } from 'ink';

// Hand-rolled cyan→magenta gradient across the wordmark (no extra dependency).
const LETTERS: { ch: string; color: string }[] = [
  { ch: 'J', color: 'cyanBright' },
  { ch: 'A', color: 'cyan' },
  { ch: 'R', color: 'blueBright' },
  { ch: 'V', color: 'blue' },
  { ch: 'I', color: 'magenta' },
  { ch: 'S', color: 'magentaBright' },
];

export function Header({ notice, status }: { notice: string; status: string }) {
  const max = status === 'MAX';
  return (
    <Box flexDirection="column" borderStyle="bold" borderColor="cyan" paddingX={1}>
      <Box>
        <Text>🛡  </Text>
        {LETTERS.map((l, i) => (
          <Text key={i} bold color={l.color}>
            {l.ch}{' '}
          </Text>
        ))}
        <Box flexGrow={1} />
        <Text bold color={max ? 'green' : status === '…' ? 'gray' : 'red'}>
          {max ? '◆ MAX' : status === '…' ? '◌ …' : '○ OFFLINE'}
        </Text>
      </Box>
      <Text dimColor>{notice}</Text>
    </Box>
  );
}
