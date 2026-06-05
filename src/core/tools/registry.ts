import type { Tool } from './types.js';

export class ToolRegistry {
  private byName = new Map<string, Tool>();

  constructor(tools: Tool[] = []) {
    for (const t of tools) this.byName.set(t.name, t);
  }

  get(name: string): Tool | undefined {
    return this.byName.get(name);
  }

  pick(names: string[]): Tool[] {
    return names.map((n) => this.byName.get(n)).filter((t): t is Tool => Boolean(t));
  }

  all(): Tool[] {
    return [...this.byName.values()];
  }
}
