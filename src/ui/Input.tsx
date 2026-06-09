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
  disabled = false,
  busy = false,
  onSubmit,
  history = [],
  injectText = '',
  injectNonce = 0,
}: {
  /** Fully locked — no input at all. */
  disabled?: boolean;
  /** A run is in flight: still typeable so the user can interject with /btw. */
  busy?: boolean;
  onSubmit: (engineText: string, displayText: string) => void;
  history?: string[];
  /** Text to drop into the box (e.g. from dictation); applied when nonce changes. */
  injectText?: string;
  injectNonce?: number;
}) {
  const [value, setValue] = useState('');
  const [histIndex, setHistIndex] = useState(-1); // -1 = live input
  const [hint, setHint] = useState('');
  const [blink, setBlink] = useState(true);
  const imagesRef = useRef<string[]>([]); // attached image paths, in order

  // Dictation (or any caller) can drop transcribed text into the box for review.
  useEffect(() => {
    if (injectNonce > 0) {
      setValue(injectText);
      setHistIndex(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectNonce]);

  // Blink the cursor only while idle (not locked, not running), so it's obvious where to type.
  useEffect(() => {
    if (disabled || busy) {
      setBlink(false);
      return;
    }
    setBlink(true);
    const t = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(t);
  }, [disabled, busy]);

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
  // Steady cursor while typing or running; blink only on an idle, empty prompt.
  const cursorVisible = !disabled && (!empty || busy || blink);
  const cursor = (
    <Text color="cyanBright" bold>
      {cursorVisible ? '▌' : ' '}
    </Text>
  );
  const accent = disabled || busy ? 'yellow' : 'cyan';

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor={accent} paddingX={1}>
        <Text bold color={disabled || busy ? 'yellow' : 'cyanBright'}>
          {disabled || busy ? '⏳' : '▸'}{' '}
        </Text>
        {disabled ? (
          <Text dimColor>working…</Text>
        ) : empty ? (
          <>
            {cursor}
            <Text dimColor>
              {busy
                ? ' Atlas is working — type /btw <note> to interject…'
                : ' Describe what to build…  (↑ history · ⌃V paste image)'}
            </Text>
          </>
        ) : (
          <>
            <Text>{renderValue(value)}</Text>
            {cursor}
          </>
        )}
        <Box flexGrow={1} />
        <Text dimColor>{busy ? '⏎ /btw · ⌃C stop' : disabled ? '⌃C stop' : '⏎ send'}</Text>
      </Box>
      {hint ? <Text dimColor> {hint}</Text> : null}
    </Box>
  );
}
