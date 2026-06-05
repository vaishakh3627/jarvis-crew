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
    <Box>
      <Text color="cyan">{disabled ? '… ' : '› '}</Text>
      <Text>{value}</Text>
    </Box>
  );
}
