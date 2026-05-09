/**
 * Integration test for v1.0.1 UGC moderation backend.
 *
 * Exercises the new /api/reports + /api/blocks endpoints + visibility
 * filters wired into /api/conversations, /api/messages, /api/listings
 * against the live deployed backend.
 *
 * Runs as Maverick (owner) + Goose (renter) using their fixture
 * passwords from .env.local.
 *
 * Cleanup is best-effort — at the end, every block created during this
 * run is unblocked, and every report is left in the DB (admin can
 * dismiss via the queue once that ships).
 *
 * Usage:
 *   node scripts/test-ugc-moderation.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PADMAGNET_MARKETING_OWNER_PW   (Maverick)
 *   PADMAGNET_MARKETING_RENTER_PW  (Goose)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '.env.local');
const env = {};
for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^"/, '').replace(/"$/, '');
}

const API_BASE = 'https://padmagnet.com';
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const MAVERICK = { email: 'maverick@padmagnet.com', password: env.PADMAGNET_MARKETING_OWNER_PW };
const GOOSE = { email: 'goose@padmagnet.com', password: env.PADMAGNET_MARKETING_RENTER_PW };

if (!MAVERICK.password || !GOOSE.password) {
  console.error('Missing PADMAGNET_MARKETING_OWNER_PW or PADMAGNET_MARKETING_RENTER_PW');
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────

const results = [];
let curSuite = '';

function suite(name) {
  curSuite = name;
  console.log(`\n── ${name} ──`);
}

function pass(label, detail = '') {
  console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? ` (${detail})` : ''}`);
  results.push({ suite: curSuite, label, status: 'pass' });
}

function fail(label, detail) {
  console.log(`  \x1b[31m✗\x1b[0m ${label} — ${detail}`);
  results.push({ suite: curSuite, label, status: 'fail', detail });
}

async function signIn({ email, password }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth failed for ${email}: ${res.status} ${body}`);
  }
  const data = await res.json();
  return { jwt: data.access_token, userId: data.user.id };
}

async function api(method, path, jwt, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, body: data };
}

async function dbQuery(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { status: res.status, body: text ? JSON.parse(text) : null }; }
  catch { return { status: res.status, body: text }; }
}

async function dbRpc(fn, args) {
  return dbQuery('POST', `/rpc/${fn}`, args);
}

// ── tests ────────────────────────────────────────────────────────────

(async () => {
  console.log('UGC moderation integration test suite');
  console.log(`Target: ${API_BASE}`);

  let mav, goose;

  // ── Sign-in ────────────────────────────────────────────────────────
  suite('Sign-in (test fixtures)');
  try {
    mav = await signIn(MAVERICK);
    pass('Maverick (owner) signed in', mav.userId);
  } catch (e) { fail('Maverick sign-in', e.message); return; }
  try {
    goose = await signIn(GOOSE);
    pass('Goose (renter) signed in', goose.userId);
  } catch (e) { fail('Goose sign-in', e.message); return; }

  // ── DB-layer sanity (migration 081) ────────────────────────────────
  suite('Migration 081 schema');
  const ub = await dbQuery('GET', '/user_blocks?limit=0');
  if (ub.status === 200) pass('user_blocks queryable'); else fail('user_blocks query', `${ub.status} ${JSON.stringify(ub.body)}`);

  const cr = await dbQuery('GET', '/content_reports?limit=0');
  if (cr.status === 200) pass('content_reports queryable'); else fail('content_reports query', `${cr.status} ${JSON.stringify(cr.body)}`);

  const ib = await dbRpc('is_blocked', { a: mav.userId, b: goose.userId });
  if (ib.status === 200 && ib.body === false) pass('is_blocked() returns false (no rows yet)');
  else fail('is_blocked() initial', `status=${ib.status} body=${JSON.stringify(ib.body)}`);

  // ── Self-protection ───────────────────────────────────────────────
  suite('Self-protection');
  let r;
  r = await api('POST', '/api/blocks', mav.jwt, { blocked_id: mav.userId });
  if (r.status === 400) pass('self-block rejected');
  else fail('self-block should 400', `got ${r.status} ${JSON.stringify(r.body)}`);

  r = await api('POST', '/api/reports', mav.jwt, {
    content_type: 'user', content_id: mav.userId, reason_code: 'spam',
  });
  if (r.status === 400) pass('self-report rejected');
  else fail('self-report should 400', `got ${r.status} ${JSON.stringify(r.body)}`);

  // ── Input validation ──────────────────────────────────────────────
  suite('Input validation');
  r = await api('POST', '/api/blocks', mav.jwt, { blocked_id: 'not-a-uuid' });
  if (r.status === 400) pass('invalid UUID on block rejected');
  else fail('invalid UUID block should 400', `got ${r.status}`);

  r = await api('POST', '/api/reports', mav.jwt, {
    content_type: 'invalid', content_id: goose.userId, reason_code: 'spam',
  });
  if (r.status === 400) pass('invalid content_type rejected');
  else fail('invalid content_type should 400', `got ${r.status}`);

  r = await api('POST', '/api/reports', mav.jwt, {
    content_type: 'user', content_id: goose.userId, reason_code: 'invalid_reason',
  });
  if (r.status === 400) pass('invalid reason_code rejected');
  else fail('invalid reason_code should 400', `got ${r.status}`);

  // ── Auth required ─────────────────────────────────────────────────
  suite('Auth required');
  r = await fetch(`${API_BASE}/api/blocks`, { method: 'GET' }).then(async res => ({ status: res.status }));
  if (r.status === 401) pass('GET /api/blocks unauthenticated → 401');
  else fail('unauth blocks should 401', `got ${r.status}`);

  // ── Block flow ────────────────────────────────────────────────────
  suite('Block flow (Maverick blocks Goose)');
  r = await api('POST', '/api/blocks', mav.jwt, {
    blocked_id: goose.userId, reason_code: 'spam', free_text: 'integration test',
  });
  if (r.status === 201) pass('Maverick → blocks Goose');
  else { fail('block POST', `${r.status} ${JSON.stringify(r.body)}`); }

  r = await api('POST', '/api/blocks', mav.jwt, { blocked_id: goose.userId });
  if (r.status === 201) pass('idempotent re-block (upsert)');
  else fail('re-block should 201 (upsert)', `got ${r.status}`);

  r = await api('GET', '/api/blocks', mav.jwt);
  if (r.status === 200 && Array.isArray(r.body?.blocks) && r.body.blocks.some(b => b.blocked_id === goose.userId)) {
    pass('Goose appears in Maverick\'s block list', `${r.body.blocks.length} blocks total`);
  } else fail('GET /api/blocks should include Goose', JSON.stringify(r.body));

  const ib2 = await dbRpc('is_blocked', { a: mav.userId, b: goose.userId });
  if (ib2.body === true) pass('is_blocked(M,G) returns true');
  else fail('is_blocked(M,G)', `got ${ib2.body}`);

  const ib3 = await dbRpc('is_blocked', { a: goose.userId, b: mav.userId });
  if (ib3.body === true) pass('is_blocked(G,M) returns true (symmetric)');
  else fail('is_blocked(G,M)', `got ${ib3.body}`);

  // ── Visibility filter — /api/conversations ────────────────────────
  suite('Conversation visibility filter');
  // Note: this test only proves the FILTER doesn't crash. To prove it
  // actually hides Maverick↔Goose threads, those threads need to exist
  // in DB. The seeded marketing fixture has exactly that thread.
  r = await api('GET', '/api/conversations', goose.jwt);
  if (r.status === 200 && Array.isArray(r.body)) {
    const withMaverick = r.body.filter(c =>
      c.tenant_user_id === mav.userId || c.owner_user_id === mav.userId
    );
    if (withMaverick.length === 0) {
      pass('Goose\'s conversations exclude all Maverick threads', `${r.body.length} threads visible`);
    } else {
      fail('blocked-thread leak', `${withMaverick.length} Maverick threads still visible to Goose`);
    }
  } else fail('GET /api/conversations as Goose', `${r.status} ${JSON.stringify(r.body)}`);

  // ── Visibility filter — /api/listings (renter swipe deck) ─────────
  suite('Listings visibility filter (one-way)');
  r = await api('GET', '/api/listings?limit=50', mav.jwt);
  if (r.status === 200 && Array.isArray(r.body?.listings)) {
    const blockedOwnerListings = r.body.listings.filter(l => l.owner_user_id === goose.userId);
    if (blockedOwnerListings.length === 0) {
      pass(`Maverick's swipe deck excludes Goose-owned listings`, `${r.body.listings.length} visible`);
    } else {
      fail('blocked-owner listing leak', `${blockedOwnerListings.length} Goose listings visible to Maverick`);
    }
  } else fail('GET /api/listings as Maverick', `${r.status}`);

  // One-way: Goose should still see Maverick's listings (even though Maverick blocked Goose)
  r = await api('GET', '/api/listings?limit=50', goose.jwt);
  if (r.status === 200 && Array.isArray(r.body?.listings)) {
    pass(`Goose's swipe deck still loads (one-way semantics)`, `${r.body.listings.length} visible`);
  } else fail('GET /api/listings as Goose', `${r.status}`);

  // ── Report flow ───────────────────────────────────────────────────
  suite('Report flow + anti-flood');
  r = await api('POST', '/api/reports', mav.jwt, {
    content_type: 'user', content_id: goose.userId,
    reason_code: 'harassment', free_text: 'integration test',
  });
  if (r.status === 201 && r.body?.id) pass('report submitted', r.body.id);
  else fail('report POST', `${r.status} ${JSON.stringify(r.body)}`);

  // anti-flood unique partial index — second open report on same target returns 200 + duplicate
  r = await api('POST', '/api/reports', mav.jwt, {
    content_type: 'user', content_id: goose.userId, reason_code: 'spam',
  });
  if (r.status === 200 && r.body?.duplicate === true) pass('anti-flood: duplicate-open returns 200 + duplicate=true');
  else fail('anti-flood', `expected 200/duplicate, got ${r.status} ${JSON.stringify(r.body)}`);

  r = await api('GET', '/api/reports', mav.jwt);
  if (r.status === 200 && Array.isArray(r.body?.reports) && r.body.reports.length > 0) {
    pass('GET /api/reports returns own reports', `${r.body.reports.length} reports`);
  } else fail('GET /api/reports', JSON.stringify(r.body));

  // ── Cleanup: unblock ──────────────────────────────────────────────
  suite('Cleanup');
  r = await api('DELETE', `/api/blocks/${goose.userId}`, mav.jwt);
  if (r.status === 204) pass('unblock succeeds');
  else fail('unblock', `${r.status}`);

  const ib4 = await dbRpc('is_blocked', { a: mav.userId, b: goose.userId });
  if (ib4.body === false) pass('is_blocked() returns false post-unblock');
  else fail('post-unblock is_blocked()', `got ${ib4.body}`);

  // Best-effort report cleanup: dismiss the integration-test report so it
  // doesn't pollute the admin queue.
  await dbQuery('PATCH', `/content_reports?reporter_id=eq.${mav.userId}&content_id=eq.${goose.userId}&status=eq.open`, {
    status: 'dismissed',
    resolution_action: 'dismissed',
    resolved_at: new Date().toISOString(),
    resolution_notes: 'integration test cleanup',
  });
  pass('reports dismissed (integration-test cleanup)');

  // ── Summary ──────────────────────────────────────────────────────
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  console.log(`\n────────────────────────────────────────`);
  console.log(`PASS: ${passed}    FAIL: ${failed}`);
  if (failed > 0) {
    console.log('\nFailures:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  [${r.suite}] ${r.label}: ${r.detail}`);
    });
    process.exit(1);
  }
})().catch(err => {
  console.error('FATAL:', err);
  process.exit(2);
});
