import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Save the clipboard image to a temp PNG (macOS, via `pngpaste`) and return its
 * path. The path can be dropped into the prompt — Claude Code reads it as an
 * image. Returns an error/hint string when there's no image or pngpaste is
 * missing.
 */
export function pasteClipboardImage(): Promise<{ path: string } | { error: string }> {
  const path = join(tmpdir(), `jarvis-paste-${Date.now()}.png`);
  return new Promise((resolve) => {
    const child = spawn('pngpaste', [path], { stdio: 'ignore' });
    child.on('error', () =>
      resolve({ error: 'image paste needs pngpaste — install: brew install pngpaste' }),
    );
    child.on('close', (code) => resolve(code === 0 ? { path } : { error: 'no image in clipboard' }));
  });
}
