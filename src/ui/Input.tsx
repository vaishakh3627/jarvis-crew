import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export function Input({ disabled, onSubmit }: { disabled: boolean; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('');
  useInput(
    (input, key) => {
      if (disabled) return;
      if (key.return) {
        if (value.trim()) onSubmit(value.trim());
        setValue('');
      } else if (key.backspace || key.delete) {
        setValue((v) => v.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setValue((v) => v + input);
      }
    },
    { isActive: !disabled },
  );
  return (
    <Box borderStyle="bold" borderColor={disabled ? 'yellow' : 'cyan'} paddingX={1}>
      <Text bold color={disabled ? 'yellow' : 'cyanBright'}>
        {disabled ? '⏳ ' : '▸ '}
      </Text>
      <Text>{value}</Text>
      {disabled ? null : <Text color="cyanBright">▌</Text>}
    </Box>
  );
}
