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
// Reviewers are read-only: they inspect and report findings, never edit.
const REVIEW_TOOLS = ['read', 'glob', 'grep', 'bash'];

// Each agent gets a distinct, vivid truecolor hex.
export const CREW: AgentDefinition[] = [
  persona('atlas', 'Atlas', '🧠', '#c084fc', 'orchestrator', 'claude-opus-4-8',
    ['read', 'glob', 'grep', 'delegate']),
  persona('iris', 'Iris', '🎨', '#f472b6', 'UI/UX designer', 'claude-sonnet-4-6', SPECIALIST_TOOLS),
  persona('volt', 'Volt', '⚡', '#fbbf24', 'frontend engineer', 'claude-sonnet-4-6', SPECIALIST_TOOLS),
  persona('edith', 'Edith', '🔭', '#38bdf8', 'backend engineer', 'claude-sonnet-4-6', SPECIALIST_TOOLS),
  persona('friday', 'Friday', '🔍', '#34d399', 'QA engineer', 'claude-sonnet-4-6', SPECIALIST_TOOLS),
  persona('vision', 'Vision', '👁', '#818cf8', 'frontend reviewer', 'claude-sonnet-4-6', REVIEW_TOOLS),
  persona('sentry', 'Sentry', '🛡', '#f87171', 'backend reviewer', 'claude-sonnet-4-6', REVIEW_TOOLS),
  persona('forge', 'Forge', '🛠', '#fb923c', 'DevOps engineer', 'claude-sonnet-4-6', SPECIALIST_TOOLS),
];

const byId = new Map(CREW.map((a) => [a.id, a]));

export function getAgent(id: AgentId): AgentDefinition {
  const a = byId.get(id);
  if (!a) throw new Error(`Unknown agent: ${id}`);
  return a;
}

export const SPECIALISTS: AgentId[] = ['iris', 'volt', 'edith', 'friday', 'vision', 'sentry', 'forge'];
