import { spawn, type ChildProcess } from 'node:child_process';

/** Read-aloud (TTS) via macOS `say`. No-op (errors swallowed) off-macOS. */

export function ttsSupported(): boolean {
  return process.platform === 'darwin';
}

/**
 * Make agent text pleasant to hear: drop code blocks, inline code, links, and
 * markdown punctuation; collapse whitespace; cap the length. Reading raw code
 * aloud is noise, so we strip it.
 */
export function speakable(text: string): string {
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, ' (code) '); // fenced code
  t = t.replace(/`[^`]*`/g, ' '); // inline code
  t = t.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1'); // [label](url) → label
  t = t.replace(/https?:\/\/\S+/g, ' '); // bare urls
  t = t.replace(/^[#>\-*]+\s*/gm, ''); // list/heading/quote markers
  t = t.replace(/[*_~`|#>]/g, ' '); // leftover md punctuation
  t = t.replace(/\s+/g, ' ').trim();
  const CAP = 600;
  return t.length > CAP ? `${t.slice(0, CAP)}…` : t;
}

/**
 * Speaks one utterance at a time — a new `speak` cancels the previous one, so
 * replies don't pile up. The spawner is injectable for tests.
 */
export class Speaker {
  private child: ChildProcess | null = null;

  constructor(private spawnSay: (text: string) => ChildProcess = (text) => spawn('say', [text], { stdio: 'ignore' })) {}

  speak(text: string): void {
    const t = speakable(text);
    if (!t) return;
    this.stop();
    try {
      const child = this.spawnSay(t);
      child.on('error', () => {});
      child.on('close', () => {
        if (this.child === child) this.child = null;
      });
      this.child = child;
    } catch {
      this.child = null;
    }
  }

  stop(): void {
    if (this.child) {
      try {
        this.child.kill('SIGTERM');
      } catch {
        /* already gone */
      }
      this.child = null;
    }
  }
}
