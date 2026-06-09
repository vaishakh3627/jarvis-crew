import React from 'react';
import { Box, Text } from 'ink';
import figlet from 'figlet';
import { GradientRule, gradientAnsi } from './gradient.js';

/** The assistant's name as ANSI-Shadow ASCII art, padded to a uniform width. */
export function bannerLines(name: string): string[] {
  const art = figlet.textSync(name.toUpperCase(), { font: 'ANSI Shadow' });
  const lines = art.split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  const width = Math.max(...lines.map((l) => [...l].length));
  return lines.map((l) => l + ' '.repeat(width - [...l].length));
}

/**
 * The gradient wordmark as a raw ANSI string, printed once on mount — NOT part
 * of <Header>. The banner never changes, so it must stay out of Ink's repainted
 * frame; rendered inside the live frame it gets repainted on every keystroke and
 * re-render, and on a terminal shorter than the frame each repaint leaves a
 * duplicate copy in the scrollback (the cascading-banner bug).
 */
export function bannerAnsi(name = 'jarvis'): string {
  return '\n' + bannerLines(name).map((l) => ' ' + gradientAnsi(l, true)).join('\n') + '\n';
}

export function Header({ notice, status }: { notice: string; status: string }) {
  const max = status === 'MAX';
  const ruleWidth = Math.min(process.stdout.columns ?? 80, 96) - 1;
  return (
    <Box flexDirection="column">
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
