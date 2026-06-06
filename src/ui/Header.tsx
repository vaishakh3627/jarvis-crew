import React from 'react';
import { Box, Text } from 'ink';
import { GradientText, GradientRule } from './gradient.js';

// "JARVIS" in figlet ANSI Shadow.
const BANNER = [
  '     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗',
  '     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝',
  '     ██║███████║██████╔╝██║   ██║██║███████╗',
  '██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║',
  '╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║',
  ' ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝',
];
const WIDTH = Math.max(...BANNER.map((l) => [...l].length));
const PADDED = BANNER.map((l) => l + ' '.repeat(WIDTH - [...l].length));

export function Header({ notice, status }: { notice: string; status: string }) {
  const max = status === 'MAX';
  const ruleWidth = Math.min(process.stdout.columns ?? 80, 96) - 1;
  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginTop={1} marginLeft={1}>
        {PADDED.map((line, i) => (
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
