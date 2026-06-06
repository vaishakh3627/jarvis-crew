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
  const empty = value.length === 0;
  return (
    <Box borderStyle="round" borderColor={disabled ? 'yellow' : 'cyan'} paddingX={1}>
      <Text bold color={disabled ? 'yellow' : 'cyanBright'}>
        {disabled ? '⏳' : '▸'}{' '}
      </Text>
      {empty ? (
        <Text dimColor>{disabled ? 'working…' : 'Describe what to build…  (try /help)'}</Text>
      ) : (
        <Text>{value}</Text>
      )}
      {!disabled && !empty ? <Text color="cyanBright">▌</Text> : null}
      <Box flexGrow={1} />
      <Text dimColor>{disabled ? '⌃C stop' : '⏎ send'}</Text>
    </Box>
  );
}
