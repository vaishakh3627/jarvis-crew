import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

/**
 * Speech-to-text via the `hear` CLI (Apple's on-device recognition). No API
 * key, no network. Requires `brew install hear` and mic/speech permission.
 */

/** Whether the `hear` binary is installed. */
export function hearAvailable(check: () => boolean = defaultCheck): boolean {
  return check();
}

function defaultCheck(): boolean {
  try {
    return spawnSync('which', ['hear'], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

/**
 * Push-to-talk dictation: start() opens the mic via `hear`, stop() ends it and
 * returns the recognized text. `hear` prints its running hypothesis line by
 * line, so the last non-empty line is the most complete transcript. Spawner is
 * injectable for tests.
 */
export class Dictation {
  private child: ChildProcess | null = null;
  private buffer = '';

  constructor(private spawnHear: () => ChildProcess = () => spawn('hear', [], { stdio: ['ignore', 'pipe', 'ignore'] })) {}

  get active(): boolean {
    return this.child !== null;
  }

  start(onPartial?: (text: string) => void): void {
    if (this.child) return;
    this.buffer = '';
    try {
      const child = this.spawnHear();
      child.stdout?.on('data', (d: Buffer) => {
        this.buffer += d.toString();
        onPartial?.(this.currentText());
      });
      child.on('error', () => {
        if (this.child === child) this.child = null;
      });
      child.on('close', () => {
        if (this.child === child) this.child = null;
      });
      this.child = child;
    } catch {
      this.child = null;
    }
  }

  /** End recording and return the recognized text. */
  stop(): string {
    const text = this.currentText();
    if (this.child) {
      try {
        this.child.kill('SIGTERM');
      } catch {
        /* already gone */
      }
      this.child = null;
    }
    return text;
  }

  private currentText(): string {
    const lines = this.buffer
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.length ? lines[lines.length - 1] : '';
  }
}
