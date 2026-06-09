import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { readFileSync } from 'node:fs';
import { Box, Static, Text } from 'ink';
import { EventBus, ActivityTracker } from '../core/events.js';
import type { JarvisEvent, AgentActivity, AgentId } from '../core/events.js';
import { isEditTool, summarizeEdit, summarizeChanges, type FileChange } from '../core/diff.js';
import { formatDuration, formatTokens } from '../core/format.js';
import { CrewStatusLine } from './CrewStatusLine.js';
import { TranscriptRow, splitTranscript, type TranscriptItem } from './ConversationTimeline.js';
import { ThinkingView } from './ThinkingView.js';
import { AgentPanes } from './AgentPanes.js';
import { Input } from './Input.js';
import { Footer } from './Footer.js';

function safeRead(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

interface PendingEdit {
  agent: AgentId;
  tool: string;
  input: unknown;
}

export function App({
  bus,
  onUserSubmit,
  busy,
  online = true,
}: {
  bus: EventBus;
  onUserSubmit: (text: string) => void;
  busy: boolean;
  online?: boolean;
}) {
  const trackerRef = useRef(new ActivityTracker());
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [thinkingFor, setThinkingFor] = useState<AgentId | null>(null);
  const [thinkingText, setThinkingText] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [tokens, setTokens] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Edits are stashed on toolStart and rendered on toolResult — by then the
  // file is written, so best-effort line numbers actually resolve.
  const pendingEditsRef = useRef(new Map<string, PendingEdit>());
  // Files changed this run, aggregated into the end-of-run "what changed".
  const changesRef = useRef<FileChange[]>([]);
  const startRef = useRef<number | null>(null);
  const prevBusyRef = useRef(false);

  useLayoutEffect(() => {
    const off = bus.subscribe((event: JarvisEvent) => {
      trackerRef.current.apply(event);
      setActivities(trackerRef.current.all());
      if (event.type === 'text') {
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.kind === 'agentText' && last.agent === event.agent) {
            const updated: TranscriptItem = { ...last, text: last.text + event.text };
            return [...prev.slice(0, -1), updated];
          }
          return [...prev, { kind: 'agentText', agent: event.agent, text: event.text }];
        });
      } else if (event.type === 'thinking') {
        setThinkingFor(event.agent);
        setThinkingText(event.text);
      } else if (event.type === 'stats') {
        setTokens(event.outputTokens);
      } else if (event.type === 'toolStart') {
        if (isEditTool(event.tool)) {
          pendingEditsRef.current.set(event.id, { agent: event.agent, tool: event.tool, input: event.input });
        }
      } else if (event.type === 'toolResult') {
        const pending = pendingEditsRef.current.get(event.id);
        if (pending) {
          pendingEditsRef.current.delete(event.id);
          if (event.ok) {
            const summary = summarizeEdit(pending.tool, pending.input, safeRead);
            if (summary) {
              changesRef.current.push({ file: summary.file, added: summary.added, removed: summary.removed });
              setTranscript((prev) => [...prev, { kind: 'diff', agent: pending.agent, ...summary }]);
              return;
            }
          }
          // Failed or unsummarizable edit falls through to a plain tool row.
        }
        setTranscript((prev) => [
          ...prev,
          { kind: 'tool', agent: event.agent, tool: event.tool, detail: event.output.split('\n')[0] ?? '', ok: event.ok },
        ]);
      }
    });
    return off;
  }, [bus]);

  // Reset on run start; append the "what changed" summary on run end.
  useEffect(() => {
    if (busy && !prevBusyRef.current) {
      changesRef.current = [];
      pendingEditsRef.current = new Map();
      startRef.current = Date.now();
      setElapsed(0);
      setTokens(0);
    } else if (!busy && prevBusyRef.current) {
      const changes = changesRef.current;
      if (changes.length) {
        const sum = summarizeChanges(changes);
        setTranscript((prev) => [
          ...prev,
          { kind: 'summary', files: sum.files, totalAdded: sum.totalAdded, totalRemoved: sum.totalRemoved },
        ]);
      }
      changesRef.current = [];
    }
    prevBusyRef.current = busy;
  }, [busy]);

  // Tick the elapsed clock once a second while a run is in flight.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => {
      if (startRef.current != null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [busy]);

  function handleSubmit(engineText: string, displayText: string) {
    // Transcript + history show the clean text (with [Image #N] chips); the
    // engine receives the resolved text (with real image paths).
    setTranscript((prev) => [...prev, { kind: 'user', text: displayText }]);
    setHistory((h) => [...h, displayText]);
    onUserSubmit(engineText);
  }

  const activeAgents = activities.filter((a) => a.status === 'working' || a.status === 'thinking');
  const parallel = activeAgents.length >= 2;
  // Completed messages go into <Static> (printed once, never repainted); only
  // the in-flight message + live dashboard re-render. This keeps the repainted
  // frame under the terminal height, so Ink never full-screen-clears (the cause
  // of the flicker when several agents stream at once).
  const { committed, live } = splitTranscript(transcript);

  return (
    <Box flexDirection="column">
      <Static items={committed}>{(item, i) => <TranscriptRow key={i} item={item} />}</Static>
      <Box flexDirection="column">
        {live ? (
          <Box marginTop={1} flexDirection="column">
            <TranscriptRow item={live} />
          </Box>
        ) : null}
        <CrewStatusLine activities={activities} />
        {parallel ? (
          <AgentPanes activities={activeAgents} />
        ) : (
          <ThinkingView agent={thinkingFor} text={thinkingText} />
        )}
        {busy ? (
          <Box marginTop={1}>
            <Text dimColor>
              ⏱ {formatDuration(elapsed)} · ↓ {formatTokens(tokens)} tokens
            </Text>
          </Box>
        ) : null}
        <Box marginTop={1} flexDirection="column">
          <Input disabled={busy} onSubmit={handleSubmit} history={history} />
        </Box>
        <Footer online={online} />
      </Box>
    </Box>
  );
}
