import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

/**
 * Jarvis's per-user config: the assistant's name (used for the banner and the
 * custom command), plus the home for all Jarvis state (auth token, config).
 */

/** Jarvis's config directory (override with JARVIS_CONFIG_DIR, e.g. in tests). */
export function jarvisConfigDir(): string {
  return process.env.JARVIS_CONFIG_DIR || join(homedir(), '.jarvis');
}

function configPath(): string {
  return join(jarvisConfigDir(), 'config.json');
}

export interface JarvisConfig {
  name: string;
}

/** Whether first-run setup has already happened. */
export function configExists(): boolean {
  return existsSync(configPath());
}

export function readConfig(): JarvisConfig | null {
  try {
    const obj = JSON.parse(readFileSync(configPath(), 'utf8'));
    return obj && typeof obj.name === 'string' ? { name: obj.name } : null;
  } catch {
    return null;
  }
}

export function writeConfig(cfg: JarvisConfig): void {
  mkdirSync(jarvisConfigDir(), { recursive: true, mode: 0o700 });
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
}

/** The assistant's name for the banner + command. Defaults to 'jarvis'. */
export function getDisplayName(): string {
  return readConfig()?.name || 'jarvis';
}

// A safe command token that also fits the ASCII banner: a lowercase letter
// followed by 1–11 letters/digits/dashes (2–12 chars total).
const NAME_RE = /^[a-z][a-z0-9-]{1,11}$/;

/**
 * Validate a chosen name. An empty input means "keep the default", so it
 * resolves to 'jarvis'. Anything else must be a clean command token.
 */
export function validateName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().toLowerCase();
  if (name === '') return { ok: true, name: 'jarvis' };
  if (!NAME_RE.test(name)) {
    return {
      ok: false,
      error: 'Use 2–12 characters: a lowercase letter, then letters, digits, or dashes (no spaces).',
    };
  }
  return { ok: true, name };
}
