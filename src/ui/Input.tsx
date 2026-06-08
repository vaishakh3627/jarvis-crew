import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { pasteClipboardImage } from './clipboard.js';

function sanitizePaste(s: string): string {
  // Collapse newlines/tabs to spaces; drop other control characters.
  const flat = s.replace(/[\r\n\t]+/g, ' ');
  return [...flat].filter((c) => c === ' ' || (c.codePointAt(0) ?? 0) >= 32).join('');
}

/** Render the value with [Image #N] tokens highlighted as chips. */
function renderValue(v: string): React.ReactNode[] {
  return v.split(/(\[Image #\d+\])/g).map((part, i) =>
    /^\[Image #\d+\]$/.test(part) ? (
      <Text key={i} bold color="magenta">
        {part}
      </Text>
    ) : (
      <Text key={i}>{part}</Text>
    ),
  );
}

export function Input({
  disabled,
  onSubmit,
  history = [],
}: {
  disabled: boolean;
  onSubmit: (engineText: string, displayText: string) => void;
  history?: string[];
}) {
  const [value, setValue] = useState('');
  const [histIndex, setHistIndex] = useState(-1); // -1 = live input
  const [hint, setHint] = useState('');
  const [blink, setBlink] = useState(true);
  const imagesRef = useRef<string[]>([]); // attached image paths, in order

  // Blink the cursor only while idle (not processing), so it's obvious where to type.
  useEffect(() => {
    if (disabled) {
      setBlink(false);
      return;
    }
    setBlink(true);
    const t = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(t);
  }, [disabled]);

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

      // Ctrl+V — paste a clipboard image as an [Image #N] chip
      if (key.ctrl && input === 'v') {
        setHint('pasting image…');
        void pasteClipboardImage().then((r) => {
          if ('path' in r) {
            const n = imagesRef.current.length + 1;
            imagesRef.current = [...imagesRef.current, r.path];
            setValue((v) => `${v && !v.endsWith(' ') ? `${v} ` : v}[Image #${n}] `);
            setHint(`Image #${n} attached ✓`);
          } else {
            setHint(r.error);
          }
        });
        return;
      }

      if (key.return) {
        const display = value.trim();
        if (display) {
          // Engine text: swap each [Image #k] chip for its real file path so the
          // agent can read the image; the transcript keeps the clean chip.
          let engine = value;
          imagesRef.current.forEach((p, i) => {
            engine = engine.replace(`[Image #${i + 1}]`, p);
          });
          onSubmit(engine.trim(), display);
        }
        setValue('');
        imagesRef.current = [];
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
  const cursor = (
    <Text color="cyanBright" bold>
      {blink ? '▌' : ' '}
    </Text>
  );

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor={disabled ? 'yellow' : 'cyan'} paddingX={1}>
        <Text bold color={disabled ? 'yellow' : 'cyanBright'}>
          {disabled ? '⏳' : '▸'}{' '}
        </Text>
        {disabled ? (
          <Text dimColor>working…</Text>
        ) : empty ? (
          <>
            {cursor}
            <Text dimColor> Describe what to build…  (↑ history · ⌃V paste image)</Text>
          </>
        ) : (
          <>
            <Text>{renderValue(value)}</Text>
            {cursor}
          </>
        )}
        <Box flexGrow={1} />
        <Text dimColor>{disabled ? '⌃C stop' : '⏎ send'}</Text>
      </Box>
      {hint ? <Text dimColor> {hint}</Text> : null}
    </Box>
  );
}
