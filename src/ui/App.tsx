import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box } from 'ink';
import { EventBus, ActivityTracker } from '../core/events.js';
import type { JarvisEvent, AgentActivity, AgentId } from '../core/events.js';
import { CrewStatusLine } from './CrewStatusLine.js';
import { ConversationTimeline, type TranscriptItem } from './ConversationTimeline.js';
import { ThinkingView } from './ThinkingView.js';
import { AgentPanes } from './AgentPanes.js';
import { Input } from './Input.js';

export function App({
  bus,
  onUserSubmit,
  busy,
}: {
  bus: EventBus;
  onUserSubmit: (text: string) => void;
  busy: boolean;
}) {
  const trackerRef = useRef(new ActivityTracker());
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [thinkingFor, setThinkingFor] = useState<AgentId | null>(null);
  const [thinkingText, setThinkingText] = useState('');

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

  function handleSubmit(text: string) {
    setTranscript((prev) => [...prev, { kind: 'user', text }]);
    onUserSubmit(text);
  }

  const activeAgents = activities.filter((a) => a.status === 'working' || a.status === 'thinking');
  const parallel = activeAgents.length >= 2;

  return (
    <Box flexDirection="column">
      <CrewStatusLine activities={activities} />
      <Box marginY={1} flexDirection="column">
        <ConversationTimeline items={transcript} />
      </Box>
      {parallel ? (
        <AgentPanes activities={activeAgents} />
      ) : (
        <ThinkingView agent={thinkingFor} text={thinkingText} />
      )}
      <Box marginTop={1}>
        <Input disabled={busy} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
}
