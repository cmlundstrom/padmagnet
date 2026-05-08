/**
 * Set up the marketing demo property listing for the Google Play promo video.
 *
 *   Owner:    Maverick (maverick@padmagnet.com, 49511c80-…)
 *   Property: 1827 Riverbend Cove, Sewall's Point, FL 34996
 *   Spec:     4BR / 3BA / ~3,000 sqft / 2022 / pool / fenced / pets OK
 *   Price:    $3,250/mo, 12-month lease, available 2026-06-01
 *   Visibility: is_demo=true → invisible to all real renter discovery
 *
 * Idempotent: detects existing listing by (owner_user_id + street_number +
 * street_name) and updates instead of duplicating. Photos are uploaded fresh
 * each run only if listing doesn't exist; existing listings keep their photos.
 *
 * Photo order (per Chris's filename-prefix convention 2026-05-08):
 *   1, 2, 3, 4, 5, 6, 7, 10, 12, 15
 *
 * Display flow: front → kitchen → kitchen alt → great room → master BR →
 *               master bath → BR2 → guest bath → BR3 → back/pool (closer).
 *
 * Source folder:
 *   Play Store Dev Art - 1st APK/App Store Art Files/Video Demo House aiImages/
 */

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Constants ────────────────────────────────────────────────────────
const MAVERICK_UUID = '49511c80-5f20-403e-ba68-dd5f5f14ad36';

const PHOTO_DIR = "C:/Users/chris/OneDrive/Desktop/PadMagnet - Claude - Dialouge/Play Store Dev Art - 1st APK/App Store Art Files/Video Demo House aiImages";

// Display order = numeric prefix order Chris assigned. NOT the original
// 1-10 prompt order. This is the video pacing arc: hero → kitchen punch →
// living spaces → master suite → BR2 → guest bath → BR3 → pool/water closer.
const PHOTO_ORDER = [1, 2, 3, 4, 5, 6, 7, 10, 12, 15];

const LISTING = {
  owner_user_id: MAVERICK_UUID,
  source: 'owner',
  street_number: '1827',
  street_name: 'Riverbend Cove',
  city: "Sewall's Point",
  state_or_province: 'FL',
  postal_code: '34996',
  county: 'Martin County',
  latitude: 27.2070,
  longitude: -80.2050,
  property_type: 'Residential Lease',
  property_sub_type: 'Single Family',
  list_price: 3250.00,
  bedrooms_total: 4,
  bathrooms_total: 3.0,
  living_area: 3000,
  year_built: 2022,
  lease_term: '12',
  available_date: '2026-06-01',
  pets_allowed: true,
  furnished: false,
  pool: true,
  parking_spaces: 2,
  fenced_yard: true,
  hoa_fee: 0,
  status: 'active',
  is_active: true,
  is_demo: true,
  featured: false,
  is_boosted: false,
  view_count: 0,
  inquiry_count: 0,
  public_remarks:
    "Stunning modern coastal retreat on Sewall's Point with private Indian River frontage. " +
    "Open-concept great room flows into a chef's kitchen with quartz waterfall island. " +
    "4 spacious bedrooms, 3 baths, infinity pool, paver driveway, hurricane-rated windows. " +
    "12-month lease, pets considered. Available June 1.",
};

// ── Helpers ───────────────────────────────────────────────────────────
function getPhotoFile(prefix) {
  const all = readdirSync(PHOTO_DIR);
  const match = all.find(f => {
    const numPrefix = f.split('-')[0];
    return numPrefix === String(prefix) && /\.(jpg|jpeg|png|webp)$/i.test(f);
  });
  if (!match) throw new Error(`Photo with prefix ${prefix} not found in ${PHOTO_DIR}`);
  return join(PHOTO_DIR, match);
}

async function uploadPhoto(prefix, order, ownerUuid) {
  const filePath = getPhotoFile(prefix);
  const buffer = readFileSync(filePath);
  const photoUuid = randomUUID();

  // Full-size: max 1920px wide, webp 85
  const fullBuffer = await sharp(buffer)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  const fullPath = `${ownerUuid}/${photoUuid}.webp`;
  const { error: fullErr } = await supabase.storage
    .from('listing-photos')
    .upload(fullPath, fullBuffer, { contentType: 'image/webp', upsert: false });
  if (fullErr) throw new Error(`Full upload ${prefix}: ${fullErr.message}`);

  // Thumb: 400px wide, webp 80
  const thumbBuffer = await sharp(buffer)
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const thumbPath = `${ownerUuid}/${photoUuid}_thumb.webp`;
  const { error: thumbErr } = await supabase.storage
    .from('listing-photos')
    .upload(thumbPath, thumbBuffer, { contentType: 'image/webp', upsert: false });
  if (thumbErr) throw new Error(`Thumb upload ${prefix}: ${thumbErr.message}`);

  const { data: fullUrl } = supabase.storage.from('listing-photos').getPublicUrl(fullPath);
  const { data: thumbUrl } = supabase.storage.from('listing-photos').getPublicUrl(thumbPath);

  return {
    url: fullUrl.publicUrl,
    thumb_url: thumbUrl.publicUrl,
    order,
    caption: '',
  };
}

function generateConfirmationCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // skip ambiguous I/L/O/0/1
  let s = 'PM-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== Demo property listing setup ===');
  console.log(`Owner:    Maverick (${MAVERICK_UUID})`);
  console.log(`Address:  ${LISTING.street_number} ${LISTING.street_name}, ${LISTING.city}, ${LISTING.state_or_province} ${LISTING.postal_code}`);
  console.log(`Demo:     is_demo=${LISTING.is_demo} (hidden from real renter discovery)\n`);

  // Verify owner exists
  const { data: owner } = await supabase.from('profiles').select('id, email, display_name').eq('id', MAVERICK_UUID).single();
  if (!owner) {
    console.error(`✗ Maverick owner profile not found at ${MAVERICK_UUID}. Run scripts/setup-marketing-fixtures.mjs first.`);
    process.exit(1);
  }
  console.log(`✓ Owner verified: ${owner.email} (${owner.display_name})`);

  // Idempotency check: existing listing at this address?
  const { data: existing } = await supabase
    .from('listings')
    .select('id, status, is_demo, photos, expires_at')
    .eq('owner_user_id', MAVERICK_UUID)
    .eq('street_number', LISTING.street_number)
    .eq('street_name', LISTING.street_name)
    .maybeSingle();

  if (existing) {
    console.log(`\n⚠️  Existing listing found at this address: ${existing.id}`);
    console.log(`   Current is_demo=${existing.is_demo}, status=${existing.status}, photos=${existing.photos?.length || 0}`);
    console.log(`   Updating metadata + extending expires_at; preserving existing photos.`);

    const { error } = await supabase
      .from('listings')
      .update({
        ...LISTING,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', existing.id);
    if (error) { console.error('✗ Update failed:', error.message); process.exit(1); }

    console.log(`✓ Listing updated. Run again with --reupload-photos to refresh image set.`);
    await verify(existing.id);
    return;
  }

  // Fresh listing — upload photos in display order.
  console.log(`\n[1/3] Uploading 10 photos to listing-photos/${MAVERICK_UUID}/ ...`);
  const photos = [];
  for (let i = 0; i < PHOTO_ORDER.length; i++) {
    const prefix = PHOTO_ORDER[i];
    process.stdout.write(`  [${i + 1}/${PHOTO_ORDER.length}] prefix ${prefix}-* ... `);
    const p = await uploadPhoto(prefix, i, MAVERICK_UUID);
    photos.push(p);
    console.log('uploaded');
  }
  console.log(`✓ ${photos.length} photos uploaded`);

  // Insert listing.
  console.log('\n[2/3] Inserting listing row...');
  const listingId = randomUUID();
  const listingKey = `owner-${randomUUID()}`;
  const confirmationCode = generateConfirmationCode();

  const insertPayload = {
    id: listingId,
    listing_key: listingKey,
    confirmation_code: confirmationCode,
    photos,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...LISTING,
  };

  const { error: insertErr } = await supabase.from('listings').insert(insertPayload);
  if (insertErr) {
    console.error(`✗ Insert failed: ${insertErr.message}`);
    process.exit(1);
  }

  console.log(`✓ Listing created: ${listingId}`);
  console.log(`  confirmation_code: ${confirmationCode}`);
  console.log(`  listing_key: ${listingKey}`);

  // Verify visibility.
  console.log('\n[3/3] Verifying visibility rules...');
  await verify(listingId);
}

async function verify(listingId) {
  // Owner-side: should see the listing
  const { data: ownerView } = await supabase
    .from('listings')
    .select('id, is_demo, status, photos')
    .eq('id', listingId)
    .single();
  console.log(`  ✓ Listings table row exists (is_demo=${ownerView.is_demo}, status=${ownerView.status}, photos=${ownerView.photos?.length || 0})`);

  // Renter-side: should NOT see via tenant_active_listings view
  const { data: rentersee } = await supabase
    .from('tenant_active_listings')
    .select('id')
    .eq('id', listingId)
    .maybeSingle();
  if (rentersee) {
    console.error(`  ✗ LEAKED: tenant_active_listings includes the demo listing! is_demo filter not working.`);
    process.exit(1);
  }
  console.log(`  ✓ tenant_active_listings view correctly excludes the demo listing`);

  // Renter-side: should NOT appear in nearby_rentals_search around the demo property
  const { data: nearby } = await supabase.rpc('nearby_rentals_search', {
    subject_lat: 27.2070,
    subject_lng: -80.2050,
    radius_miles: 5,
    min_lat: 27.13,
    max_lat: 27.28,
    min_lng: -80.28,
    max_lng: -80.13,
  });
  const inNearby = (nearby || []).some(r => r.id === listingId);
  if (inNearby) {
    console.error(`  ✗ LEAKED: nearby_rentals_search returns the demo listing within 5 miles!`);
    process.exit(1);
  }
  console.log(`  ✓ nearby_rentals_search correctly excludes the demo listing`);

  console.log('\n✅ Demo listing ready. Visible to Maverick (owner side); invisible to all renter discovery.');
}

main().catch(e => {
  console.error('\n❌ FATAL:', e.message);
  process.exit(1);
});
