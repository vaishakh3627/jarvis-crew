import { homedir } from 'node:os';
import { join } from 'node:path';

export function configDir(): string {
  return process.env.JARVIS_CONFIG_DIR || join(homedir(), '.config', 'jarvis');
}

export function credentialsPath(): string {
  return join(configDir(), 'credentials.json');
}
