import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load .env.local properly
const envFile = readFileSync(join(root, '.env.local'), 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  env[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
}

// Try multiple connection methods
const configs = [
  {
    name: 'Session pooler (port 5432)',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 5432,
    username: 'postgres.darizrcswflrpyvtldii',
  },
  {
    name: 'Transaction pooler (port 6543)',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    username: 'postgres.darizrcswflrpyvtldii',
  },
  {
    name: 'Direct (IPv4 fallback via pooler host)',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 5432,
    username: 'postgres',
  },
];

// Extract password from DATABASE_URL
const dbUrl = env.DATABASE_URL || '';
const match = dbUrl.match(/:([^@]+)@/);
const passwordFromUrl = match ? decodeURIComponent(match[1].split(':').pop()) : '';
const manualPassword = 'lHRnNnVkG77Ml!3M$M*';

console.log('Password from .env.local URL:', passwordFromUrl ? `"${passwordFromUrl}" (${passwordFromUrl.length} chars)` : 'NOT FOUND');
console.log('Manual password:', `"${manualPassword}" (${manualPassword.length} chars)`);
console.log('');

for (const config of configs) {
  for (const pw of [manualPassword, passwordFromUrl].filter(Boolean)) {
    const label = `${config.name} / pw="${pw.slice(0,4)}..."`;
    process.stdout.write(`  Testing ${label} ... `);

    const sql = postgres({
      host: config.host,
      port: config.port,
      database: 'postgres',
      username: config.username,
      password: pw,
      ssl: { rejectUnauthorized: false },
      connect_timeout: 10,
      max: 1,
    });

    try {
      const [r] = await sql`SELECT now()`;
      console.log(`CONNECTED! (${r.now})`);
      console.log(`\nWorking config: host=${config.host} port=${config.port} user=${config.username}`);
      await sql.end();
      process.exit(0);
    } catch (e) {
      console.log(`FAILED: ${e.message.split('\n')[0]}`);
      await sql.end().catch(() => {});
    }
  }
}

console.log('\nAll connection attempts failed.');
process.exit(1);
