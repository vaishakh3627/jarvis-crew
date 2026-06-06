import React from 'react';
import { Text } from 'ink';
import type { AgentId } from '../core/events.js';
import { getAgent } from '../core/crew.js';

/** A solid colored pill with the agent's emoji + name — makes each agent pop. */
export function AgentChip({ id }: { id: AgentId }) {
  const def = getAgent(id);
  return (
    <Text backgroundColor={def.color} color="black" bold>
      {' '}
      {def.emoji} {def.name}
      {' '}
    </Text>
  );
}

/** A solid cyan "you" pill for user turns. */
export function YouChip() {
  return (
    <Text backgroundColor="cyan" color="black" bold>
      {' '}
      ▸ you{' '}
    </Text>
  );
}
