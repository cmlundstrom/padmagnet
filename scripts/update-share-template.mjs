/**
 * Update the in-app share template (site_config: share_subject / share_message).
 * This is the LIVE source the mobile app fetches at runtime, so updating it
 * changes the share text for every existing install immediately (no app update).
 *
 * Body is plain text (native share sheet → works for SMS + email + anything).
 * Subject leads with 🧲 per branding rule (email only; SMS ignores subject).
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const SHARE_SUBJECT = '🧲 Check out this rental: {{address}}, {{city}} — {{price}}';
const SHARE_MESSAGE = [
  '🧲 Check out this rental on PadMagnet!',
  '{{address}}, {{city}} — {{price}}',
  '👀 See it: https://padmagnet.com/listing/{{id}}',
  '📲 Get the free app: https://play.google.com/store/apps/details?id=com.padmagnet.app',
].join('\n');

const rows = [
  { key: 'share_subject', value: SHARE_SUBJECT },
  { key: 'share_message', value: SHARE_MESSAGE },
];

for (const row of rows) {
  const { error } = await supabase
    .from('site_config')
    .upsert(row, { onConflict: 'key' });
  if (error) { console.error(`Failed ${row.key}:`, error.message); process.exit(1); }
}

// Read back to confirm
const { data } = await supabase
  .from('site_config')
  .select('key, value')
  .in('key', ['share_subject', 'share_message']);

console.log('--- site_config now ---');
console.log(JSON.stringify(data, null, 2));
