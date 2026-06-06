import { expect, test } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Markdown } from '../../src/ui/Markdown.js';

test('renders bold, inline code, and bullets without literal markers', () => {
  const { lastFrame } = render(<Markdown text={'Use **iris** for `UI`\n- one\n- two'} />);
  const frame = lastFrame() ?? '';
  expect(frame).toContain('iris');
  expect(frame).not.toContain('**'); // bold markers consumed
  expect(frame).not.toContain('`'); // code markers consumed
  expect(frame).toContain('•'); // bullet rendered
  expect(frame).toContain('one');
});
