/**
 * One-off: hide the 8362 SE Magnolia test rental from the public renter feed
 * by setting is_demo=true, WITHOUT touching status / is_active / expires_at —
 * so the natural ad-term expiration timeline test continues undisturbed.
 *
 * Reversible: set is_demo=false to restore.
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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

const FIELDS = 'id, street_number, street_name, city, source, status, is_active, is_demo, expires_at, owner_user_id';

// 1. Locate the listing
const { data: matches, error: findErr } = await supabase
  .from('listings')
  .select(FIELDS)
  .eq('street_number', '8362')
  .ilike('street_name', '%Magnolia%');

if (findErr) { console.error('Find error:', findErr.message); process.exit(1); }
if (!matches?.length) { console.error('No listing found for 8362 *Magnolia*'); process.exit(1); }
if (matches.length > 1) {
  console.error(`Ambiguous: ${matches.length} matches`, matches.map(m => m.id));
  process.exit(1);
}

const listing = matches[0];
console.log('BEFORE:', JSON.stringify(listing, null, 2));

// 2. Flip is_demo only
const { data: updated, error: updErr } = await supabase
  .from('listings')
  .update({ is_demo: true })
  .eq('id', listing.id)
  .select(FIELDS)
  .single();

if (updErr) { console.error('Update error:', updErr.message); process.exit(1); }
console.log('AFTER :', JSON.stringify(updated, null, 2));

// 3. Verify it is gone from the public renter view
const { data: inView, error: viewErr } = await supabase
  .from('tenant_active_listings')
  .select('id')
  .eq('id', listing.id);

if (viewErr) { console.error('View check error:', viewErr.message); process.exit(1); }
console.log(`\nPublic view (tenant_active_listings) contains this listing: ${inView?.length ? 'YES ❌' : 'NO ✅ (hidden)'}`);
console.log(`Expiry untouched — expires_at still: ${updated.expires_at}`);
