import { spawn } from 'node:child_process';
import type { Tool } from './types.js';

export const bashTool: Tool<{ command: string }> = {
  name: 'bash',
  description: 'Run a shell command in the working directory. Returns stdout/stderr and exit code.',
  destructive: true,
  inputSchema: {
    type: 'object',
    properties: { command: { type: 'string' } },
    required: ['command'],
  },
  run: (input, ctx) =>
    new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', input.command], { cwd: ctx.cwd });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));
      const onAbort = () => child.kill('SIGTERM');
      ctx.signal.addEventListener('abort', onAbort, { once: true });
      child.on('error', (err) => {
        ctx.signal.removeEventListener('abort', onAbort);
        reject(err);
      });
      child.on('close', (code) => {
        ctx.signal.removeEventListener('abort', onAbort);
        const parts = [stdout.trim(), stderr.trim()].filter(Boolean);
        if (code && code !== 0) parts.push(`exit code ${code}`);
        resolve(parts.join('\n') || '(no output)');
      });
    }),
};
