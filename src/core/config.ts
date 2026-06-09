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

/** How much of a run's output to read aloud. */
export type SpeakMode = 'off' | 'final' | 'all';
const SPEAK_MODES: SpeakMode[] = ['off', 'final', 'all'];

export interface JarvisConfig {
  name: string;
  /** Whether the optional Forge (DevOps/release) agent is on the crew. */
  devops?: boolean;
  /** Read-aloud mode for replies. */
  speak?: SpeakMode;
}

/** Whether first-run setup has already happened. */
export function configExists(): boolean {
  return existsSync(configPath());
}

export function readConfig(): JarvisConfig | null {
  try {
    const obj = JSON.parse(readFileSync(configPath(), 'utf8'));
    if (!obj || typeof obj.name !== 'string') return null;
    const speak: SpeakMode = SPEAK_MODES.includes(obj.speak) ? obj.speak : 'off';
    return { name: obj.name, devops: obj.devops === true, speak };
  } catch {
    return null;
  }
}

export function writeConfig(cfg: JarvisConfig): void {
  mkdirSync(jarvisConfigDir(), { recursive: true, mode: 0o700 });
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
}

/** Read-modify-write: update some fields, preserve the rest. */
export function patchConfig(partial: Partial<JarvisConfig>): void {
  const current = readConfig() ?? { name: 'jarvis' };
  writeConfig({ ...current, ...partial });
}

/** The assistant's name for the banner + command. Defaults to 'jarvis'. */
export function getDisplayName(): string {
  return readConfig()?.name || 'jarvis';
}

/** Whether the opt-in Forge (DevOps) agent is enabled. */
export function isDevopsEnabled(): boolean {
  return readConfig()?.devops === true;
}

/** Toggle the Forge (DevOps) agent, preserving the rest of the config. */
export function setDevopsEnabled(enabled: boolean): void {
  patchConfig({ devops: enabled });
}

/** The read-aloud mode. Defaults to 'off'. */
export function getSpeakMode(): SpeakMode {
  return readConfig()?.speak ?? 'off';
}

/** Persist the read-aloud mode, preserving the rest of the config. */
export function setSpeakMode(mode: SpeakMode): void {
  patchConfig({ speak: mode });
}

/** Cycle off → final → all → off. */
export function cycleSpeakMode(mode: SpeakMode): SpeakMode {
  return mode === 'off' ? 'final' : mode === 'final' ? 'all' : 'off';
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
