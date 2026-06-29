import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Watchtower canary — read-only health probes of PadMagnet's OWN connections,
 * using THIS project's env (tool-independence: no creds leave this repo). The
 * central Watchtower (sfrm-tools) PULLs this over HTTPS, authenticated by the
 * shared WATCHTOWER_CANARY_SECRET, and classifies the raw results.
 * Returns { results: RawProbe[] } where RawProbe =
 *   { connectionKey, ok, authHard, httpCode, latencyMs, error, fingerprint, expiryDaysLeft }
 */

const TIMEOUT_MS = 10_000;
const isAuthHard = (c) => c === 401 || c === 403;

function authorized(request) {
  const secret = process.env.WATCHTOWER_CANARY_SECRET;
  if (!secret) return false;
  const token = request.headers.get('x-canary-secret') || '';
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}

async function timed(url, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' });
    return { res, ms: Date.now() - start, err: null };
  } catch (e) {
    return { res: null, ms: Date.now() - start, err: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}

const ok = (key, ms, http, fingerprint = null) => ({ connectionKey: key, ok: true, authHard: false, httpCode: http, latencyMs: ms, error: null, fingerprint, expiryDaysLeft: null });
const bad = (key, ms, error, http = null, authHard = false) => ({ connectionKey: key, ok: false, authHard, httpCode: http, latencyMs: ms, error, fingerprint: null, expiryDaysLeft: null });

async function pSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return bad('padmagnet/supabase', 0, 'missing Supabase env');
  const { res, ms, err } = await timed(`${url}/rest/v1/?limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res) return bad('padmagnet/supabase', ms, err);
  return res.ok || res.status === 404 ? ok('padmagnet/supabase', ms, res.status) : bad('padmagnet/supabase', ms, `HTTP ${res.status}`, res.status, isAuthHard(res.status));
}

async function pStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return bad('padmagnet/stripe', 0, 'missing STRIPE_SECRET_KEY');
  const { res, ms, err } = await timed('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${key}` } });
  if (!res) return bad('padmagnet/stripe', ms, err);
  return res.ok ? ok('padmagnet/stripe', ms, res.status) : bad('padmagnet/stripe', ms, `HTTP ${res.status}`, res.status, isAuthHard(res.status));
}

async function pTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return bad('padmagnet/twilio', 0, 'missing Twilio env');
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const { res, ms, err } = await timed(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, { headers: { Authorization: `Basic ${auth}` } });
  if (!res) return bad('padmagnet/twilio', ms, err);
  if (!res.ok) return bad('padmagnet/twilio', ms, `HTTP ${res.status}`, res.status, isAuthHard(res.status));
  const b = await res.json().catch(() => ({}));
  return b.status === 'active' ? ok('padmagnet/twilio', ms, res.status, { status: b.status }) : bad('padmagnet/twilio', ms, `account ${b.status}`, res.status, true);
}

async function pResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return bad('padmagnet/resend', 0, 'missing RESEND_API_KEY');
  const { res, ms, err } = await timed('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } });
  if (!res) return bad('padmagnet/resend', ms, err);
  if (!res.ok) return bad('padmagnet/resend', ms, `HTTP ${res.status}`, res.status, isAuthHard(res.status));
  const b = await res.json().catch(() => ({}));
  const domains = (b.data || []).map((d) => d.name).sort();
  return ok('padmagnet/resend', ms, res.status, { domains });
}

async function pBridge() {
  const token = process.env.BRIDGE_SERVER_TOKEN;
  const dataset = process.env.BRIDGE_DATASET_CODE || 'miamire';
  if (!token) return bad('padmagnet/bridge-api', 0, 'missing BRIDGE_SERVER_TOKEN');
  const { res, ms, err } = await timed(`https://api.bridgedataoutput.com/api/v2/OData/${dataset}/Property?access_token=${token}&$top=1`);
  if (!res) return bad('padmagnet/bridge-api', ms, err);
  if (!res.ok) return bad('padmagnet/bridge-api', ms, `HTTP ${res.status}`, res.status, isAuthHard(res.status));
  const b = await res.json().catch(() => ({}));
  const fields = Array.isArray(b.value) && b.value[0] ? Object.keys(b.value[0]).sort() : [];
  return ok('padmagnet/bridge-api', ms, res.status, { resoFields: fields });
}

async function pMaps() {
  const key = process.env.GOOGLE_SERVER_GEOCODING_KEY || process.env.GOOGLE_GEOCODING_KEY;
  if (!key) return bad('padmagnet/google-maps', 0, 'missing geocoding key');
  const addr = encodeURIComponent('Miami, FL');
  const { res, ms, err } = await timed(`https://maps.googleapis.com/maps/api/geocode/json?address=${addr}&key=${key}`);
  if (!res) return bad('padmagnet/google-maps', ms, err);
  if (!res.ok) return bad('padmagnet/google-maps', ms, `HTTP ${res.status}`, res.status, isAuthHard(res.status));
  const b = await res.json().catch(() => ({}));
  if (b.status === 'OK' || b.status === 'ZERO_RESULTS') return ok('padmagnet/google-maps', ms, res.status, { status: b.status });
  return bad('padmagnet/google-maps', ms, b.status, res.status, b.status === 'REQUEST_DENIED');
}

async function pUpstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return bad('padmagnet/upstash', 0, 'missing Upstash env');
  const { res, ms, err } = await timed(`${url}/ping`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res) return bad('padmagnet/upstash', ms, err);
  return res.ok ? ok('padmagnet/upstash', ms, res.status) : bad('padmagnet/upstash', ms, `HTTP ${res.status}`, res.status, isAuthHard(res.status));
}

async function pVercel() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return bad('padmagnet/vercel', 0, 'missing VERCEL_TOKEN');
  const { res, ms, err } = await timed('https://api.vercel.com/v2/user', { headers: { Authorization: `Bearer ${token}` } });
  if (!res) return bad('padmagnet/vercel', ms, err);
  if (!res.ok) return bad('padmagnet/vercel', ms, `HTTP ${res.status}`, res.status, isAuthHard(res.status));
  const b = await res.json().catch(() => ({}));
  return ok('padmagnet/vercel', ms, res.status, { user: b.user?.username || b.username || null });
}

export async function GET(request) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const results = await Promise.all([
    pSupabase(), pStripe(), pTwilio(), pResend(), pBridge(), pMaps(), pUpstash(), pVercel(),
  ]);
  return NextResponse.json({ project: 'padmagnet', results });
}
