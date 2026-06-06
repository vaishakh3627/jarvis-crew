import type { AgentId } from './events.js';
import { skillPacks } from './skills/packs.js';

export interface AgentDefinition {
  id: AgentId;
  name: string;
  emoji: string;
  color: string; // Ink color name
  role: string;
  model: string;
  systemPrompt: string;
  toolNames: string[];
}

function persona(
  id: AgentId,
  name: string,
  emoji: string,
  color: string,
  role: string,
  model: string,
  toolNames: string[],
): AgentDefinition {
  const systemPrompt = `You are ${name}, the ${role} of the Jarvis crew.\n${skillPacks[id]}`;
  return { id, name, emoji, color, role, model, systemPrompt, toolNames };
}

const SPECIALIST_TOOLS = ['read', 'write', 'edit', 'glob', 'grep', 'bash'];

export const CREW: AgentDefinition[] = [
  persona('atlas', 'Atlas', '🧠', 'magenta', 'orchestrator', 'claude-opus-4-8',
    ['read', 'glob', 'grep', 'delegate']),
  persona('iris', 'Iris', '🎨', 'green', 'UI/UX designer', 'claude-sonnet-4-6', SPECIALIST_TOOLS),
  persona('volt', 'Volt', '⚡', 'yellow', 'frontend engineer', 'claude-sonnet-4-6', SPECIALIST_TOOLS),
  persona('forge', 'Forge', '🛠️', 'blue', 'backend engineer', 'claude-sonnet-4-6', SPECIALIST_TOOLS),
  persona('sentry', 'Sentry', '🔍', 'cyan', 'QA engineer', 'claude-sonnet-4-6', SPECIALIST_TOOLS),
];

const byId = new Map(CREW.map((a) => [a.id, a]));

export function getAgent(id: AgentId): AgentDefinition {
  const a = byId.get(id);
  if (!a) throw new Error(`Unknown agent: ${id}`);
  return a;
}

export const SPECIALISTS: AgentId[] = ['iris', 'volt', 'forge', 'sentry'];
