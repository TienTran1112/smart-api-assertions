import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

let loaded = false;

/**
 * Loads `.env` from the project root into `process.env`, once per process.
 *
 * Unlike `dotenv.config()`, a value from `.env` also fills a variable that exists but is
 * EMPTY in the OS environment (e.g. a blank `ANTHROPIC_API_KEY` in Windows user settings).
 * Non-empty OS values (CI secrets) still win.
 */
export function loadEnvironment(envFilePath: string = resolve(process.cwd(), '.env')): void {
  if (loaded) {
    return;
  }
  loaded = true;

  if (!existsSync(envFilePath)) {
    return;
  }

  const values = parse(readFileSync(envFilePath));
  for (const [key, value] of Object.entries(values)) {
    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
