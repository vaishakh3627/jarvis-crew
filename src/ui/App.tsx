import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box, Static } from 'ink';
import { EventBus, ActivityTracker } from '../core/events.js';
import type { JarvisEvent, AgentActivity, AgentId } from '../core/events.js';
import { CrewStatusLine } from './CrewStatusLine.js';
import { TranscriptRow, splitTranscript, type TranscriptItem } from './ConversationTimeline.js';
import { ThinkingView } from './ThinkingView.js';
import { AgentPanes } from './AgentPanes.js';
import { Input } from './Input.js';
import { Footer } from './Footer.js';

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
      } else if (event.type === 'toolResult') {
        setTranscript((prev) => [
          ...prev,
          { kind: 'tool', agent: event.agent, tool: event.tool, detail: event.output.split('\n')[0] ?? '', ok: event.ok },
        ]);
      }
    });
    return off;
  }, [bus]);

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
        <Box marginTop={1} flexDirection="column">
          <Input disabled={busy} onSubmit={handleSubmit} history={history} />
        </Box>
        <Footer online={online} />
      </Box>
    </Box>
  );
}
