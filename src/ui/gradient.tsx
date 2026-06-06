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
