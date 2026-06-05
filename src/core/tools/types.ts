export interface ToolContext {
  cwd: string;
  signal: AbortSignal;
}

export interface Tool<I = any> {
  name: string;
  description: string;
  /** Destructive tools (write/edit/bash) require user permission before running. */
  destructive: boolean;
  /** JSON Schema for the tool's input, sent to the model. */
  inputSchema: Record<string, unknown>;
  run(input: I, ctx: ToolContext): Promise<string>;
}
