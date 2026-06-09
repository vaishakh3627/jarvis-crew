import React from 'react';
import { Box, Text } from 'ink';

export function Footer({ online }: { online: boolean }) {
  return (
    <Box marginTop={1}>
      <Text dimColor>⌃C interrupt · {online ? '/logout' : '/login'} · /compact · /clear · /help · </Text>
      <Text bold color={online ? 'green' : 'gray'}>
        {online ? '◆ MAX' : '◌ offline'}
      </Text>
    </Box>
  );
}
