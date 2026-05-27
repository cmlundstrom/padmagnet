/**
 * A/B test AskPad's pre-staged questions across Grok models.
 *
 * Replicates the /api/ask-pad two-turn tool-calling flow (system prompt + TOOLS +
 * search_rentals/get_market_stats executors are copied verbatim from
 * app/api/ask-pad/route.js) and runs each question through one or more models,
 * printing tool calls, latency, and the final user-facing answer.
 *
 * save_user_preferences is STUBBED to a no-op (returns success) so this never
 * writes to the real tenant_preferences table.
 *
 * Usage:
 *   node scripts/test-askpad-models.mjs
 *     Runs the default pre-staged question set against both models.
 *   node scripts/test-askpad-models.mjs "your question here"
 *     Runs one custom question against both models.
 *
 * Reads XAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── Load .env.local ──
const env = {};
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  let v = t.slice(i + 1).replace(/\r$/, '');
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, i)] = v;
}

const XAI_API_KEY = env.XAI_API_KEY;
const XAI_BASE_URL = 'https://api.x.ai/v1';
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  global: { fetch: (url, o) => fetch(url, { ...o, cache: 'no-store' }) },
});

const MODELS = ['grok-4.20-0309-non-reasoning', 'grok-4.20-0309-reasoning'];

// Stuart, FL — stand-in for "your area"/GPS so "near {city}" resolves
const TEST_CITY = 'Stuart';
const TEST_LOCATION = { lat: 27.1973, lng: -80.2528 };
const DEFAULT_QUESTIONS = [
  `3BR under $3,000 near ${TEST_CITY}`,
  'What areas have the lowest rent?',
  `Show me places with a pool near ${TEST_CITY}`,
  `What just hit the market in ${TEST_CITY}?`,
];

// ── SYSTEM_PROMPT extracted verbatim from app/api/ask-pad/route.js (stays faithful) ──
const routeSrc = readFileSync(join(root, 'app/api/ask-pad/route.js'), 'utf8');
const promptMatch = routeSrc.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/);
if (!promptMatch) throw new Error('Could not extract SYSTEM_PROMPT from route.js');
const SYSTEM_PROMPT = promptMatch[1];

// Extract the real TOOLS array from route.js so schemas + descriptions (which
// drive the model's tool selection) stay identical to production.
const toolsMatch = routeSrc.match(/const TOOLS = (\[[\s\S]*?\n\]);/);
if (!toolsMatch) throw new Error('Could not extract TOOLS from route.js');
const TOOLS = eval('(' + toolsMatch[1] + ')');

// ── Tool executors (copied/condensed from route.js) ──
async function executeSearchRentals(args, location) {
  let q = supabase.from('listings').select('id, listing_id, street_number, street_name, city, list_price, bedrooms_total, bathrooms_total, pool, pets_allowed, furnished, property_sub_type, latitude, longitude').eq('is_active', true).eq('status', 'active');
  if (args.city) q = q.ilike('city', args.city);
  if (args.county) q = q.ilike('county', args.county);
  if (!args.city && !args.county && location?.lat && location?.lng) {
    const r = 20, latD = r / 69, lngD = r / (69 * Math.cos(location.lat * Math.PI / 180));
    q = q.gte('latitude', location.lat - latD).lte('latitude', location.lat + latD).gte('longitude', location.lng - lngD).lte('longitude', location.lng + lngD);
  }
  if (args.min_beds) q = q.gte('bedrooms_total', args.min_beds);
  if (args.max_beds) q = q.lte('bedrooms_total', args.max_beds);
  if (args.max_rent) q = q.lte('list_price', args.max_rent);
  if (args.min_rent) q = q.gte('list_price', args.min_rent);
  if (args.pets_allowed === true) q = q.eq('pets_allowed', true);
  if (args.pool === true) q = q.eq('pool', true);
  if (args.furnished === true) q = q.eq('furnished', true);
  if (args.property_type) q = q.ilike('property_sub_type', '%' + args.property_type + '%');
  if (args.sort_by === 'newest') q = q.order('days_on_market', { ascending: true });
  else if (args.sort_by === 'price_high') q = q.order('list_price', { ascending: false });
  else q = q.order('list_price', { ascending: true });
  q = q.limit(5);
  const { data } = await q;
  const listings = (data || []).map((l) => ({ id: l.id, address: ((l.street_number || '') + ' ' + (l.street_name || '')).trim(), city: l.city, rent: l.list_price, beds: l.bedrooms_total, baths: l.bathrooms_total, pool: l.pool, pets: l.pets_allowed }));
  return { count: listings.length, listings, searchParams: args };
}

async function executeMarketStats(args) {
  let q = supabase.from('listings').select('list_price, property_sub_type').eq('is_active', true).eq('status', 'active');
  if (args.county) q = q.ilike('county', args.county);
  if (args.city) q = q.ilike('city', args.city);
  const { data } = await q;
  const prices = (data || []).map((l) => Number(l.list_price) || 0).filter((p) => p > 0).sort((a, b) => a - b);
  if (!prices.length) return { message: 'No active listings found in this area.', count: 0 };
  return { area: args.city || args.county || 'Unknown', totalActive: prices.length, medianRent: prices[Math.floor(prices.length / 2)], priceRange: { min: prices[0], max: prices[prices.length - 1] } };
}

async function executeCompareAreaRents(args) {
  let q = supabase.from('listings').select('city, list_price').eq('is_active', true).eq('status', 'active');
  if (args.county) q = q.ilike('county', args.county);
  const { data } = await q;
  if (!data?.length) return { message: 'No active listings found to compare.', areas: [] };
  const byCity = {};
  for (const l of data) {
    const c = (l.city || '').trim(); const p = Number(l.list_price) || 0;
    if (!c || p <= 0) continue;
    (byCity[c] = byCity[c] || []).push(p);
  }
  let areas = Object.keys(byCity).map((city) => {
    const prices = byCity[city].sort((a, b) => a - b);
    return { area: city, count: prices.length, medianRent: prices[Math.floor(prices.length / 2)], minRent: prices[0] };
  }).filter((a) => a.count >= 2);
  const highest = args.order === 'highest';
  areas.sort((a, b) => (highest ? b.medianRent - a.medianRent : a.medianRent - b.medianRent));
  return { order: highest ? 'highest' : 'lowest', areas: areas.slice(0, args.limit && args.limit > 0 ? args.limit : 8) };
}

async function callTool(name, args, location) {
  if (name === 'search_rentals') return executeSearchRentals(args, location);
  if (name === 'get_market_stats') return executeMarketStats(args);
  if (name === 'compare_area_rents') return executeCompareAreaRents(args);
  if (name === 'save_user_preferences') return { success: true, stubbed: true }; // no-op
  return { error: 'Unknown tool' };
}

async function xai(model, messages, useTools) {
  const res = await fetch(XAI_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + XAI_API_KEY },
    body: JSON.stringify({ model, messages, ...(useTools ? { tools: TOOLS } : {}), max_tokens: 800 }),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
  return res.json();
}

async function runQuery(model, query, location) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + `\n\nThe user is near GPS (${location.lat}, ${location.lng}). Search near them when no location is given.` },
    { role: 'user', content: query },
  ];
  const toolsCalled = [];
  const t0 = Date.now();

  const data = await xai(model, messages, true);
  const msg = data.choices?.[0]?.message;
  if (!msg) return { error: 'empty response' };

  if (!msg.tool_calls?.length) {
    return { ms: Date.now() - t0, toolsCalled, listingCount: 0, answer: msg.content };
  }

  messages.push(msg);
  let listingCount = 0;
  for (const tc of msg.tool_calls) {
    let a = {};
    try { a = JSON.parse(tc.function.arguments); } catch {}
    toolsCalled.push({ name: tc.function.name, args: a });
    const result = await callTool(tc.function.name, a, location);
    if (result.listings) listingCount = result.listings.length;
    messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
  }

  const data2 = await xai(model, messages, false);
  return { ms: Date.now() - t0, toolsCalled, listingCount, answer: data2.choices?.[0]?.message?.content };
}

// ── Main ──
const custom = process.argv[2];
const questions = custom ? [custom] : DEFAULT_QUESTIONS;

for (const question of questions) {
  console.log('\n' + '='.repeat(80));
  console.log('Q: ' + question);
  console.log('='.repeat(80));
  for (const model of MODELS) {
    try {
      const r = await runQuery(model, question, TEST_LOCATION);
      const tools = r.toolsCalled.map((t) => `${t.name}(${JSON.stringify(t.args)})`).join(' + ') || 'NONE';
      console.log(`\n  [${model}]  ${r.ms}ms  listings:${r.listingCount}`);
      console.log(`    tools: ${tools}`);
      console.log(`    answer: ${r.answer}`);
    } catch (e) {
      console.log(`\n  [${model}]  ERROR: ${e.message}`);
    }
  }
}
console.log('');
