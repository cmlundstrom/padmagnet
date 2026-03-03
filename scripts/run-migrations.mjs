/**
 * Run Supabase migrations via direct PostgreSQL connection.
 * Reads DATABASE_URL from .env.local.
 *
 * Usage: node scripts/run-migrations.mjs [--from 009] [--to 020]
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

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

const dbUrl = env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not found in .env.local');
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

async function main() {
  console.log(`\nConnecting to database...`);

  const sql = postgres(dbUrl, {
    ssl: { rejectUnauthorized: false },
    connect_timeout: 10,
    max: 1,
  });

  try {
    // Test connection
    const [{ now }] = await sql`SELECT now()`;
    console.log(`Connected! Server time: ${now}\n`);

    console.log(`Running ${migrations.length} migrations:\n`);

    let succeeded = 0;
    let failed = 0;

    for (const filename of migrations) {
      const filePath = join(migrationsDir, filename);
      const content = readFileSync(filePath, 'utf8');

      process.stdout.write(`  ${filename} ... `);
      try {
        await sql.unsafe(content);
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
  } finally {
    await sql.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
