/**
 * Push environment variables from .env.local UP to Vercel — safely.
 *
 * WHY THIS EXISTS: `vercel env pull` and `vercel link` (CLI >= 49.1.2) overwrite
 * .env.local with whatever is on Vercel, destroying local-only secrets
 * (test creds, Android fingerprints, DATABASE_URL, etc.). This script only ever
 * READS .env.local and WRITES to Vercel via the REST API. It never links the
 * project, never pulls, and never modifies any local file. Rollouts are one-way:
 * local -> Vercel.
 *
 * Reads VERCEL_TOKEN (+ optional VERCEL_PROJECT_ID / VERCEL_TEAM_ID) from .env.local.
 *
 * Usage:
 *   node scripts/push-env-to-vercel.mjs whoami
 *       Verify the token + auto-discover the padmagnet project/team IDs.
 *
 *   node scripts/push-env-to-vercel.mjs push <VAR_NAME> [target] [--type <type>]
 *       Push one var (value pulled from .env.local) to Vercel.
 *       target: production (default) | preview | development
 *       --type: encrypted (default) | sensitive | plain
 *       e.g. node scripts/push-env-to-vercel.mjs push XAI_API_KEY production
 *
 *   node scripts/push-env-to-vercel.mjs push <VAR_NAME> production --all-targets
 *       Push to production + preview + development at once.
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './load-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const API = 'https://api.vercel.com';
const PROJECT_NAME = 'padmagnet';

// ── Env from 1Password via `op run` (process.env), or .env.local if present ──
const env = loadEnv();

const TOKEN = process.env.VERCEL_TOKEN || env.VERCEL_TOKEN;
if (!TOKEN) {
  fail(
    'Missing VERCEL_TOKEN. Create a scoped token at https://vercel.com/account/tokens\n' +
    'then add it to .env.local as:  VERCEL_TOKEN=xxxxxxxx'
  );
}
const TEAM_ID = process.env.VERCEL_TEAM_ID || env.VERCEL_TEAM_ID || null;

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function teamQS(extra = '') {
  const parts = [];
  if (TEAM_ID) parts.push(`teamId=${encodeURIComponent(TEAM_ID)}`);
  if (extra) parts.push(extra);
  return parts.length ? `?${parts.join('&')}` : '';
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { ok: res.ok, status: res.status, body };
}

// ── Resolve project id (env override, else look up by name) ──
async function resolveProjectId() {
  if (process.env.VERCEL_PROJECT_ID || env.VERCEL_PROJECT_ID) {
    return process.env.VERCEL_PROJECT_ID || env.VERCEL_PROJECT_ID;
  }
  const { ok, status, body } = await api(`/v9/projects/${PROJECT_NAME}${teamQS()}`);
  if (!ok) {
    fail(`Could not find project "${PROJECT_NAME}" (HTTP ${status}). ` +
      `${body?.error?.message || ''}\nIf it lives under a team, set VERCEL_TEAM_ID in .env.local.`);
  }
  return body.id;
}

// ── whoami: validate token + print IDs to cache in .env.local ──
async function cmdWhoami() {
  const me = await api('/v2/user');
  if (!me.ok) fail(`Token rejected (HTTP ${me.status}). ${me.body?.error?.message || ''}`);
  console.log(`✅ Token valid — user: ${me.body.user?.username || me.body.user?.email}`);

  const teams = await api('/v2/teams');
  if (teams.ok && teams.body.teams?.length) {
    console.log('\nTeams:');
    for (const t of teams.body.teams) console.log(`  • ${t.name}  (teamId: ${t.id})`);
  }

  // Try to find the project across personal + team scopes
  const found = [];
  const personal = await api(`/v9/projects/${PROJECT_NAME}`);
  if (personal.ok) found.push({ scope: 'personal', id: personal.body.id });
  if (teams.ok) {
    for (const t of teams.body.teams || []) {
      const p = await api(`/v9/projects/${PROJECT_NAME}?teamId=${t.id}`);
      if (p.ok) found.push({ scope: t.name, id: p.body.id, teamId: t.id });
    }
  }
  if (found.length) {
    console.log(`\nProject "${PROJECT_NAME}" found in:`);
    for (const f of found) {
      console.log(`  • ${f.scope}: VERCEL_PROJECT_ID=${f.id}${f.teamId ? `  VERCEL_TEAM_ID=${f.teamId}` : ''}`);
    }
    console.log('\n👉 Add the matching VERCEL_PROJECT_ID (and VERCEL_TEAM_ID if a team) to .env.local to skip lookups.');
  } else {
    console.log(`\n⚠️  Project "${PROJECT_NAME}" not visible with this token's scope.`);
  }
}

// ── push: upsert one var (value from .env.local) to Vercel ──
async function cmdPush(args) {
  const varName = args[0];
  if (!varName) fail('Usage: push <VAR_NAME> [target] [--type <type>] [--all-targets]');

  const value = env[varName];
  if (value === undefined) fail(`"${varName}" not found in .env.local`);
  if (value === '') fail(`"${varName}" is empty in .env.local — refusing to push an empty value`);

  const allTargets = args.includes('--all-targets');
  const typeIdx = args.indexOf('--type');
  const type = typeIdx !== -1 ? args[typeIdx + 1] : 'encrypted';
  const positional = args.filter((a, i) => !a.startsWith('--') && i !== 0 && args[i - 1] !== '--type');
  // target accepts a single value or a comma-separated set, e.g. "preview,development"
  const target = allTargets
    ? ['production', 'preview', 'development']
    : (positional[0] || 'production').split(',').map((t) => t.trim()).filter(Boolean);

  const projectId = await resolveProjectId();

  // upsert=true updates if the key+target already exists, otherwise creates.
  const { ok, status, body } = await api(
    `/v10/projects/${projectId}/env${teamQS('upsert=true')}`,
    { method: 'POST', body: JSON.stringify({ key: varName, value, type, target }) }
  );

  if (!ok) {
    fail(`Push failed for ${varName} (HTTP ${status}). ${body?.error?.message || JSON.stringify(body)}`);
  }
  const masked = value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-2)} (len ${value.length})` : `(len ${value.length})`;
  console.log(`✅ Pushed ${varName} = ${masked}  →  ${target.join(', ')}  [type: ${type}]`);
  console.log('   .env.local was NOT modified. Redeploy for the change to take effect.');
}

// ── dispatch ──
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'whoami') {
  await cmdWhoami();
} else if (cmd === 'push') {
  await cmdPush(rest);
} else {
  console.log('Commands:\n  whoami\n  push <VAR_NAME> [target] [--type <type>] [--all-targets]');
  process.exit(cmd ? 1 : 0);
}
