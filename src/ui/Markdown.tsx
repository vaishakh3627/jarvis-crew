import React from 'react';
import { Box, Text } from 'ink';

/** Render inline markdown: **bold**, `code`, *italic*. */
function renderInline(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(<Text key={key++}>{s.slice(last, m.index)}</Text>);
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<Text key={key++} bold>{tok.slice(2, -2)}</Text>);
    else if (tok.startsWith('`')) out.push(<Text key={key++} color="yellow">{tok.slice(1, -1)}</Text>);
    else out.push(<Text key={key++} italic>{tok.slice(1, -1)}</Text>);
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(<Text key={key++}>{s.slice(last)}</Text>);
  return out;
}

function MarkdownLine({ line }: { line: string }) {
  if (line.trim() === '') return <Text> </Text>; // preserve blank lines between paragraphs
  const header = /^(#{1,6})\s+(.*)$/.exec(line);
  if (header) {
    return (
      <Text bold color="whiteBright">
        {renderInline(header[2])}
      </Text>
    );
  }
  const bullet = /^(\s*)[-*]\s+(.*)$/.exec(line);
  if (bullet) {
    return (
      <Text>
        {bullet[1]}
        <Text color="cyan">• </Text>
        {renderInline(bullet[2])}
      </Text>
    );
  }
  return <Text>{renderInline(line)}</Text>;
}

/** Minimal markdown → Ink renderer (bold, inline code, italic, bullets, headers). */
export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <MarkdownLine key={i} line={line} />
      ))}
    </Box>
  );
}
