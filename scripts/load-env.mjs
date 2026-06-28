/**
 * Shared env loader for PadMagnet scripts.
 *
 * 1Password is the source of truth. Values arrive as real process.env vars via
 *   op run --env-file=.env.local.op-pointers -- node scripts/<x>.mjs
 * which you can run as:  npm run op -- node scripts/<x>.mjs
 *
 * This returns process.env, merged with .env.local IF that plaintext file still
 * exists (back-compat / a regenerated cache). So scripts work both under `op run`
 * (no file on disk) and with a local .env.local present. A missing file is NOT an
 * error — op run has already populated the environment.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export function loadEnv() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const env = { ...process.env };
  try {
    const file = readFileSync(join(root, '.env.local'), 'utf8');
    for (const line of file.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      let v = t.slice(i + 1);
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[t.slice(0, i)] = v;
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e; // missing file is expected under op run
  }
  return env;
}
