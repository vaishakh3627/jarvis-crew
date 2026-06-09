import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Header, bannerLines, bannerAnsi } from '../../src/ui/Header.js';

// The exact ANSI-Shadow art the banner showed before it became name-driven.
const JARVIS_ART = [
  '     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗',
  '     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝',
  '     ██║███████║██████╔╝██║   ██║██║███████╗',
  '██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║',
  '╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║',
  ' ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝',
];

test('the default jarvis banner stays pixel-identical to the original art', () => {
  expect(bannerLines('jarvis')).toEqual(JARVIS_ART);
});

test('a custom name renders its own uniform-width ASCII art', () => {
  const lines = bannerLines('friday');
  expect(lines.length).toBeGreaterThan(3);
  expect(lines.join('\n')).toContain('█');
  expect(new Set(lines.map((l) => [...l].length)).size).toBe(1);
});

test('bannerAnsi renders the block-art wordmark as a printable ANSI string', () => {
  const banner = bannerAnsi('jarvis');
  expect(banner).toContain('█'); // block-art banner
  expect(banner).toContain('\x1b['); // gradient escape codes
});

test('Header renders the notice and a MAX badge (banner is printed separately)', () => {
  const { lastFrame } = render(<Header notice="Ready to go" status="MAX" />);
  const frame = lastFrame() ?? '';
  // The banner is no longer part of the repainted frame — kept out of Ink so it
  // isn't duplicated on every re-render.
  expect(frame).not.toContain('█');
  expect(frame).toContain('Ready to go');
  expect(frame).toContain('MAX');
});

test('Header shows OFFLINE when signed out', () => {
  const { lastFrame } = render(<Header notice="x" status="OFFLINE" />);
  expect(lastFrame() ?? '').toContain('OFFLINE');
});
