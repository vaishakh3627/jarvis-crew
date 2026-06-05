export type AgentId = 'atlas' | 'iris' | 'volt' | 'forge' | 'sentry';
export type AgentStatus = 'idle' | 'thinking' | 'working' | 'done' | 'error';

export interface AgentActivity {
  id: AgentId;
  status: AgentStatus;
  progress: number; // 0..1
  action?: string;  // e.g. "editing LoginForm.tsx"
  file?: string;
}

export type JarvisEvent =
  | { type: 'thinking'; agent: AgentId; text: string }
  | { type: 'text'; agent: AgentId; text: string }
  | { type: 'toolStart'; agent: AgentId; tool: string; input: unknown; id: string }
  | { type: 'toolResult'; agent: AgentId; tool: string; id: string; ok: boolean; output: string }
  | { type: 'permissionRequest'; agent: AgentId; tool: string; input: unknown; id: string }
  | { type: 'permissionResolved'; agent: AgentId; id: string; allow: boolean }
  | { type: 'agentStarted'; agent: AgentId; task: string }
  | { type: 'agentFinished'; agent: AgentId; ok: boolean }
  | { type: 'activity'; activity: AgentActivity };

export type Listener = (event: JarvisEvent) => void;

export class EventBus {
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event: JarvisEvent): void {
    for (const fn of [...this.listeners]) fn(event);
  }
}

export class ActivityTracker {
  private activities = new Map<AgentId, AgentActivity>();

  apply(event: JarvisEvent): void {
    switch (event.type) {
      case 'agentStarted':
        this.activities.set(event.agent, { id: event.agent, status: 'thinking', progress: 0 });
        break;
      case 'activity':
        this.activities.set(event.activity.id, event.activity);
        break;
      case 'agentFinished': {
        const prev = this.activities.get(event.agent);
        this.activities.set(event.agent, {
          id: event.agent,
          status: event.ok ? 'done' : 'error',
          progress: 1,
          action: prev?.action,
          file: prev?.file,
        });
        break;
      }
      default:
        break;
    }
  }

  get(id: AgentId): AgentActivity | undefined {
    return this.activities.get(id);
  }

  all(): AgentActivity[] {
    return [...this.activities.values()];
  }

  activeCount(): number {
    return this.all().filter((a) => a.status === 'working' || a.status === 'thinking').length;
  }
}
