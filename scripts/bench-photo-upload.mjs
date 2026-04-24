// End-to-end benchmark for POST /api/owner/photos against Vercel prod.
// Measures wall-clock latency at 1/5/15 photo counts to validate the
// parallelization + single-roundtrip refactor. Reads Server-Timing header
// for server-side breakdown (uploads ; total).
//
// Seeds a dedicated test user + listing via Supabase admin, exercises the
// endpoint repeatedly, cleans up after. Run: `node scripts/bench-photo-upload.mjs`
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

const API_BASE = process.env.BENCH_API_BASE || 'https://padmagnet.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Missing env vars in .env.local');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

// Generate a realistic "phone photo"-sized test image: 1600x1200, smooth
// gradient fill (compresses well) + a unique colour shift per variant.
// Result: ~100-150KB per image, so a 15-batch fits inside Vercel Hobby's
// 4.5MB body limit while still exercising sharp's rotate/crop/encode.
async function makeTestImage(variant = 0) {
  const width = 1600;
  const height = 1200;
  const pixels = Buffer.alloc(width * height * 3);
  const baseR = (variant * 37) & 0xff;
  const baseG = (variant * 71) & 0xff;
  const baseB = (variant * 113) & 0xff;
  for (let y = 0; y < height; y++) {
    const rowGradient = (y / height) * 96;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const colGradient = (x / width) * 96;
      pixels[i] = Math.min(255, baseR + rowGradient + colGradient);
      pixels[i + 1] = Math.min(255, baseG + rowGradient * 0.7 + colGradient * 0.5);
      pixels[i + 2] = Math.min(255, baseB + rowGradient * 0.5 + colGradient * 0.8);
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function seedOwner() {
  const email = `bench-${Date.now()}-${randomUUID().slice(0, 8)}@test.padmagnet.com`;
  const password = `Bench${randomUUID().slice(0, 8)}!`;

  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'owner', display_name: 'Bench Owner' },
  });
  if (userErr) throw new Error(`Seed owner failed: ${userErr.message}`);
  const userId = userData.user.id;

  // Profile row (required by app logic)
  await admin.from('profiles').upsert({
    id: userId,
    email,
    display_name: 'Bench Owner',
    role: 'owner',
  }, { onConflict: 'id' });

  // Seed a listing for this owner
  const { data: listing, error: listErr } = await admin.from('listings').insert({
    listing_key: `bench-${randomUUID()}`,
    owner_user_id: userId,
    source: 'owner',
    status: 'draft',
    is_active: false,
    street_number: '9999',
    street_name: 'Bench Test Rd',
    city: 'Stuart',
    state_or_province: 'FL',
    postal_code: '34997',
    list_price: 1500,
    photos: [],
  }).select().single();
  if (listErr) throw new Error(`Seed listing failed: ${listErr.message}`);

  // Sign in to get a real JWT
  const { data: session, error: signinErr } = await anon.auth.signInWithPassword({ email, password });
  if (signinErr) throw new Error(`Sign in failed: ${signinErr.message}`);

  return { userId, listingId: listing.id, token: session.session.access_token, email };
}

async function cleanup({ userId, listingId }) {
  // Delete storage objects for this user
  const { data: files } = await admin.storage.from('listing-photos').list(userId, { limit: 100 });
  if (files?.length) {
    await admin.storage.from('listing-photos').remove(files.map(f => `${userId}/${f.name}`));
  }
  await admin.from('listings').delete().eq('id', listingId);
  await admin.auth.admin.deleteUser(userId);
  await admin.from('profiles').delete().eq('id', userId);
}

async function uploadBatch({ token, listingId, count, label }) {
  const fd = new FormData();
  const buffers = await Promise.all(Array.from({ length: count }, (_, i) => makeTestImage(i)));
  buffers.forEach((buf, i) => {
    fd.append('photos', new Blob([buf], { type: 'image/jpeg' }), `bench-${i}.jpg`);
  });
  fd.append('listing_id', listingId);

  const t0 = performance.now();
  const res = await fetch(`${API_BASE}/api/owner/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const t1 = performance.now();

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }

  const serverTiming = res.headers.get('Server-Timing') || '';
  const body = await res.json();
  const persisted = body.photos?.length ?? body.length ?? 0;

  return {
    label,
    count,
    wallMs: Math.round(t1 - t0),
    perPhotoMs: Math.round((t1 - t0) / count),
    persisted,
    serverTiming,
  };
}

async function main() {
  console.log(`Benchmark: POST ${API_BASE}/api/owner/photos\n`);
  const seed = await seedOwner();
  console.log(`Seeded: listing ${seed.listingId.slice(0, 8)} for user ${seed.userId.slice(0, 8)}\n`);

  try {
    // Warm-up (not counted — absorbs Vercel cold start)
    await uploadBatch({ ...seed, count: 1, label: 'warmup' });

    // Clear photos before each timed run so the order numbering starts fresh
    async function reset() {
      await admin.from('listings').update({ photos: [] }).eq('id', seed.listingId);
      const { data: files } = await admin.storage.from('listing-photos').list(seed.userId, { limit: 100 });
      if (files?.length) {
        await admin.storage.from('listing-photos').remove(files.map(f => `${seed.userId}/${f.name}`));
      }
    }

    const results = [];
    for (const count of [1, 5, 15]) {
      await reset();
      const r = await uploadBatch({ ...seed, count, label: `${count}-photo` });
      results.push(r);
      console.log(`  ${r.label.padEnd(10)}  wall=${r.wallMs}ms  per-photo=${r.perPhotoMs}ms  persisted=${r.persisted}/${r.count}  [${r.serverTiming}]`);
    }

    console.log('\nTarget timing goals:');
    console.log('  1 photo:  wall ≤ 2000ms');
    console.log('  5 photos: wall ≤ 4000ms  (per-photo ≤ 800ms)');
    console.log('  15 photos: wall ≤ 8000ms (per-photo ≤ 550ms)\n');

    const pass = (label, ok, detail) =>
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}  ${detail}`);

    pass('1 photo', results[0].wallMs <= 2000, `(${results[0].wallMs}ms)`);
    pass('5 photos', results[1].wallMs <= 4000, `(${results[1].wallMs}ms)`);
    pass('15 photos', results[2].wallMs <= 8000, `(${results[2].wallMs}ms)`);

    const allPass = results[0].wallMs <= 2000 && results[1].wallMs <= 4000 && results[2].wallMs <= 8000;
    process.exitCode = allPass ? 0 : 1;
  } finally {
    console.log('\nCleaning up...');
    await cleanup(seed);
    console.log('Done.');
  }
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exitCode = 1;
});
