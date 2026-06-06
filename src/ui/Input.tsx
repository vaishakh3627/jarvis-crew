import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { pasteClipboardImage } from './clipboard.js';

function sanitizePaste(s: string): string {
  // Collapse newlines/tabs to spaces; drop other control characters.
  const flat = s.replace(/[\r\n\t]+/g, ' ');
  return [...flat].filter((c) => c === ' ' || (c.codePointAt(0) ?? 0) >= 32).join('');
}

export function Input({
  disabled,
  onSubmit,
  history = [],
}: {
  disabled: boolean;
  onSubmit: (text: string) => void;
  history?: string[];
}) {
  const [value, setValue] = useState('');
  const [histIndex, setHistIndex] = useState(-1); // -1 = live input
  const [hint, setHint] = useState('');

  useInput(
    (input, key) => {
      if (disabled) return;

      // ↑/↓ — recall previous inputs
      if (key.upArrow) {
        if (history.length === 0) return;
        const next = Math.min(histIndex + 1, history.length - 1);
        setHistIndex(next);
        setValue(history[history.length - 1 - next]);
        return;
      }
      if (key.downArrow) {
        if (histIndex <= 0) {
          setHistIndex(-1);
          setValue('');
        } else {
          const next = histIndex - 1;
          setHistIndex(next);
          setValue(history[history.length - 1 - next]);
        }
        return;
      }

      // Ctrl+V — paste an image from the clipboard
      if (key.ctrl && input === 'v') {
        setHint('pasting image…');
        void pasteClipboardImage().then((r) => {
          if ('path' in r) {
            setValue((v) => (v ? `${v} ${r.path}` : r.path));
            setHint('image attached ✓');
          } else {
            setHint(r.error);
          }
        });
        return;
      }

      if (key.return) {
        if (value.trim()) onSubmit(value.trim());
        setValue('');
        setHistIndex(-1);
        setHint('');
        return;
      }
      if (key.backspace || key.delete) {
        setValue((v) => v.slice(0, -1));
        setHistIndex(-1);
        return;
      }
      // Multi-char chunk = paste (text or a dragged file path); single = keystroke
      if (input && input.length > 1) {
        setValue((v) => v + sanitizePaste(input));
        setHistIndex(-1);
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setValue((v) => v + input);
        setHistIndex(-1);
      }
    },
    { isActive: !disabled },
  );

  const empty = value.length === 0;
  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor={disabled ? 'yellow' : 'cyan'} paddingX={1}>
        <Text bold color={disabled ? 'yellow' : 'cyanBright'}>
          {disabled ? '⏳' : '▸'}{' '}
        </Text>
        {empty ? (
          <Text dimColor>
            {disabled ? 'working…' : 'Describe what to build…  (↑ history · ⌃V paste image)'}
          </Text>
        ) : (
          <Text>{value}</Text>
        )}
        {!disabled && !empty ? <Text color="cyanBright">▌</Text> : null}
        <Box flexGrow={1} />
        <Text dimColor>{disabled ? '⌃C stop' : '⏎ send'}</Text>
      </Box>
      {hint ? <Text dimColor> {hint}</Text> : null}
    </Box>
  );
}
