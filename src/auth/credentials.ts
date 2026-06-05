import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { configDir, credentialsPath } from '../config.js';

export interface Credentials {
  apiKey?: string;
  authToken?: string;
}

export function getCredentials(): Credentials | null {
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return { apiKey: envKey };
  const envToken = process.env.ANTHROPIC_AUTH_TOKEN;
  if (envToken) return { authToken: envToken };
  const path = credentialsPath();
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, 'utf8')) as Credentials;
      if (data.apiKey || data.authToken) return data;
    } catch {
      return null;
    }
  }
  return null;
}

export function isAuthenticated(): boolean {
  return getCredentials() !== null;
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await mkdir(configDir(), { recursive: true });
  await writeFile(credentialsPath(), JSON.stringify({ apiKey }, null, 2), { mode: 0o600 });
}

export async function saveAuthToken(authToken: string): Promise<void> {
  await mkdir(configDir(), { recursive: true });
  await writeFile(credentialsPath(), JSON.stringify({ authToken }, null, 2), { mode: 0o600 });
}
