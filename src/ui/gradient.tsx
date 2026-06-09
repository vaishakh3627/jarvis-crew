import React from 'react';
import { Box, Text } from 'ink';

// Cyan → magenta, the Jarvis signature gradient.
const FROM: [number, number, number] = [34, 211, 238]; // #22d3ee
const TO: [number, number, number] = [232, 121, 249]; // #e879f9

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
function hx(n: number): string {
  return n.toString(16).padStart(2, '0');
}

export function colorAt(t: number, from = FROM, to = TO): string {
  const c = Math.max(0, Math.min(1, t));
  return `#${hx(lerp(from[0], to[0], c))}${hx(lerp(from[1], to[1], c))}${hx(lerp(from[2], to[2], c))}`;
}

/** A single line rendered with a left→right color gradient (per character). */
export function GradientText({ text, bold }: { text: string; bold?: boolean }) {
  const chars = [...text];
  const n = chars.length;
  return (
    <Box>
      {chars.map((ch, i) => (
        <Text key={i} bold={bold} color={colorAt(n > 1 ? i / (n - 1) : 0)}>
          {ch}
        </Text>
      ))}
    </Box>
  );
}

/** A full-width gradient horizontal rule. */
export function GradientRule({ width }: { width: number }) {
  return <GradientText text={'━'.repeat(Math.max(1, width))} />;
}

/**
 * The same per-character cyan→magenta gradient as <GradientText>, but as a raw
 * ANSI string — for printing once outside the Ink tree (e.g. the splash banner,
 * which must stay out of Ink's repainted frame so it isn't duplicated on every
 * re-render).
 */
export function gradientAnsi(text: string, bold = false): string {
  const chars = [...text];
  const n = chars.length;
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const r = lerp(FROM[0], TO[0], t);
    const g = lerp(FROM[1], TO[1], t);
    const b = lerp(FROM[2], TO[2], t);
    out += `\x1b[${bold ? '1;' : ''}38;2;${r};${g};${b}m${chars[i]}`;
  }
  return out + '\x1b[0m';
}
