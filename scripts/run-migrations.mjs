/**
 * Run Supabase migrations via the Management API.
 * Uses SUPABASE_ACCESS_TOKEN from .env.local (no direct DB connection needed).
 *
 * Usage: node scripts/run-migrations.mjs [--from 009] [--to 020]
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load .env.local
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  env[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
}

// Extract project ref from Supabase URL
const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^"/, '').replace(/"$/, '');
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const accessToken = env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !accessToken) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

// Parse CLI args
const args = process.argv.slice(2);
const fromArg = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
const toArg = args.includes('--to') ? args[args.indexOf('--to') + 1] : null;

// Find migration files
const migrationsDir = join(root, 'supabase', 'migrations');
const allFiles = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

// Filter by range
const migrations = allFiles.filter(f => {
  const num = f.split('_')[0];
  if (fromArg && num < fromArg) return false;
  if (toArg && num > toArg) return false;
  return true;
});

async function runQuery(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  return res.json();
}

async function main() {
  console.log(`\nConnecting via Management API (project: ${projectRef})...`);

  // Test connection
  const [{ now }] = await runQuery('SELECT now()');
  console.log(`Connected! Server time: ${now}\n`);

  console.log(`Running ${migrations.length} migrations:\n`);

  let succeeded = 0;
  let failed = 0;

  for (const filename of migrations) {
    const filePath = join(migrationsDir, filename);
    const content = readFileSync(filePath, 'utf8');

    process.stdout.write(`  ${filename} ... `);
    try {
      await runQuery(content);
      console.log('\x1b[32mOK\x1b[0m');
      succeeded++;
    } catch (err) {
      console.log(`\x1b[31mFAILED\x1b[0m`);
      console.log(`    Error: ${err.message.split('\n')[0]}`);
      failed++;
    }
  }

  console.log(`\n  Results: ${succeeded} succeeded, ${failed} failed`);
  console.log(`  Total: ${migrations.length} migrations\n`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
