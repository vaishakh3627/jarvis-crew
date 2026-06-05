import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import type { Tool, ToolContext } from './types.js';

function resolveInside(ctx: ToolContext, p: string): string {
  const full = join(ctx.cwd, p);
  const rel = relative(ctx.cwd, full);
  if (rel.startsWith('..') || rel.startsWith(sep)) {
    throw new Error(`Path escapes working directory: ${p}`);
  }
  return full;
}

export const readTool: Tool<{ path: string }> = {
  name: 'read',
  description: 'Read a UTF-8 text file relative to the working directory.',
  destructive: false,
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'File path' } },
    required: ['path'],
  },
  run: async (input, ctx) => {
    const content = await readFile(resolveInside(ctx, input.path), 'utf8');
    return content;
  },
};

export const writeTool: Tool<{ path: string; content: string }> = {
  name: 'write',
  description: 'Create or overwrite a UTF-8 text file (creates parent dirs).',
  destructive: true,
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' }, content: { type: 'string' } },
    required: ['path', 'content'],
  },
  run: async (input, ctx) => {
    const full = resolveInside(ctx, input.path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, input.content, 'utf8');
    return `Wrote ${input.content.length} bytes to ${input.path}`;
  },
};

export const editTool: Tool<{ path: string; oldString: string; newString: string }> = {
  name: 'edit',
  description: 'Replace an exact, unique substring in a file.',
  destructive: true,
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' }, oldString: { type: 'string' }, newString: { type: 'string' } },
    required: ['path', 'oldString', 'newString'],
  },
  run: async (input, ctx) => {
    const full = resolveInside(ctx, input.path);
    const content = await readFile(full, 'utf8');
    const count = content.split(input.oldString).length - 1;
    if (count === 0) throw new Error(`oldString not found in ${input.path}`);
    if (count > 1) throw new Error(`oldString is not unique in ${input.path} (${count} matches)`);
    await writeFile(full, content.replace(input.oldString, input.newString), 'utf8');
    return `Edited ${input.path}`;
  },
};

async function walk(root: string, signal: AbortSignal): Promise<string[]> {
  const out: string[] = [];
  async function rec(d: string) {
    if (signal.aborted) return;
    for (const entry of await readdir(d, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = join(d, entry.name);
      if (entry.isDirectory()) await rec(full);
      else out.push(full);
    }
  }
  await rec(root);
  return out;
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, ' ')
    .replace(/\*/g, '[^/]*')
    .replace(/ /g, '.*');
  return new RegExp(`^${escaped}$`);
}

export const globTool: Tool<{ pattern: string }> = {
  name: 'glob',
  description: 'List files matching a glob pattern (e.g. "src/**/*.ts").',
  destructive: false,
  inputSchema: {
    type: 'object',
    properties: { pattern: { type: 'string' } },
    required: ['pattern'],
  },
  run: async (input, ctx) => {
    const re = globToRegExp(input.pattern);
    const files = await walk(ctx.cwd, ctx.signal);
    const matched = files
      .map((f) => relative(ctx.cwd, f))
      .filter((f) => re.test(f));
    return matched.length ? matched.join('\n') : '(no matches)';
  },
};

export const grepTool: Tool<{ pattern: string; path?: string }> = {
  name: 'grep',
  description: 'Search file contents with a regex; returns "path:line: text" matches.',
  destructive: false,
  inputSchema: {
    type: 'object',
    properties: { pattern: { type: 'string' }, path: { type: 'string', description: 'Dir or file (default ".")' } },
    required: ['pattern'],
  },
  run: async (input, ctx) => {
    const re = new RegExp(input.pattern);
    const target = resolveInside(ctx, input.path ?? '.');
    const isDir = (await stat(target)).isDirectory();
    const files = isDir ? await walk(target, ctx.signal) : [target];
    const hits: string[] = [];
    for (const f of files) {
      let text: string;
      try { text = await readFile(f, 'utf8'); } catch { continue; }
      text.split('\n').forEach((line, i) => {
        if (re.test(line)) hits.push(`${relative(ctx.cwd, f)}:${i + 1}: ${line}`);
      });
    }
    return hits.length ? hits.join('\n') : '(no matches)';
  },
};

export const fsTools: Tool[] = [readTool, writeTool, editTool, globTool, grepTool];
