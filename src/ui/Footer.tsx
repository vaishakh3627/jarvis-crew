import React from 'react';
import { Box, Text } from 'ink';

export function Footer({ online }: { online: boolean }) {
  return (
    <Box marginTop={1}>
      <Text dimColor>⌃C interrupt · /login · /help · /clear · </Text>
      <Text bold color={online ? 'green' : 'gray'}>
        {online ? '◆ MAX' : '◌ offline'}
      </Text>
    </Box>
  );
}
