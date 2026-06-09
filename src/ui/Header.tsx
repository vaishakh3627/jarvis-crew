import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import figlet from 'figlet';
import { GradientText, GradientRule } from './gradient.js';

/** The assistant's name as ANSI-Shadow ASCII art, padded to a uniform width. */
export function bannerLines(name: string): string[] {
  const art = figlet.textSync(name.toUpperCase(), { font: 'ANSI Shadow' });
  const lines = art.split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  const width = Math.max(...lines.map((l) => [...l].length));
  return lines.map((l) => l + ' '.repeat(width - [...l].length));
}

export function Header({
  notice,
  status,
  name = 'jarvis',
}: {
  notice: string;
  status: string;
  name?: string;
}) {
  const padded = useMemo(() => bannerLines(name), [name]);
  const max = status === 'MAX';
  const ruleWidth = Math.min(process.stdout.columns ?? 80, 96) - 1;
  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginTop={1} marginLeft={1}>
        {padded.map((line, i) => (
          <GradientText key={i} text={line} bold />
        ))}
      </Box>
      <Box marginLeft={1}>
        <Text>🛡  </Text>
        <Text dimColor>multi-agent coding crew · on your Claude Code login</Text>
        <Box flexGrow={1} />
        <Text bold color={max ? 'green' : status === '…' ? 'gray' : 'red'}>
          {max ? '◆ MAX' : status === '…' ? '◌ …' : '○ OFFLINE'}
        </Text>
      </Box>
      <GradientRule width={ruleWidth} />
      <Text dimColor>{notice}</Text>
    </Box>
  );
}
