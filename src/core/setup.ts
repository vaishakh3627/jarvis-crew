import { dirname, join } from 'node:path';
import { realpathSync, symlinkSync } from 'node:fs';

/**
 * Making a custom name (e.g. `friday`) launch the CLI: the npm bin name is
 * fixed as `jarvis`, so we add a sibling symlink named after the chosen name,
 * in the same directory as the `jarvis` command (which is already on PATH),
 * pointing at the real entry script.
 */

export interface AliasPlan {
  /** Directory holding the `jarvis` command (on PATH). */
  binDir: string;
  /** The real entry script the symlink should point at. */
  target: string;
  /** Full path of the symlink to create. */
  linkPath: string;
}

/**
 * Resolve where the custom-name symlink goes and what it points at, from how
 * the process was invoked (`argv[1]` is the `jarvis` symlink the user ran).
 * `resolve` is injectable for tests.
 */
export function planAlias(
  name: string,
  argv1: string,
  resolve: (p: string) => string = realpathSync,
): AliasPlan {
  return { binDir: dirname(argv1), target: resolve(argv1), linkPath: join(dirname(argv1), name) };
}

/** Attempt to create the alias symlink. Returns false if the dir isn't writable. */
export function createAlias(plan: AliasPlan, link: (target: string, path: string) => void = symlinkSync): boolean {
  try {
    link(plan.target, plan.linkPath);
    return true;
  } catch {
    return false;
  }
}

/** Copy-paste instructions for when we can't create the symlink ourselves. */
export function aliasInstructions(plan: AliasPlan, name: string): string {
  return [
    `Couldn't create the '${name}' command automatically (the folder isn't writable).`,
    `Run this to add it yourself:`,
    `  ln -s "${plan.target}" "${plan.linkPath}"`,
    `…or add a shell alias to your ~/.zshrc or ~/.bashrc:`,
    `  alias ${name}="jarvis"`,
  ].join('\n');
}
