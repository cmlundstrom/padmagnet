/**
 * One-off: send a faithful preview of the CURRENT in-app share output for
 * 8362 SE Magnolia to chris@floridapm.net.
 *
 * Fidelity: the in-app share uses the native OS share sheet, so picking "email"
 * sends PLAIN TEXT (raw subject + body) with NO branded HTML wrapper. We mirror
 * that exactly, pulling the LIVE template from site_config and real listing data.
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

loadEnv({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Real listing data
const { data: listing } = await supabase
  .from('listings')
  .select('id, street_number, street_name, city, list_price')
  .eq('street_number', '8362')
  .ilike('street_name', '%Magnolia%')
  .single();

const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
const price = listing.list_price ? `$${Number(listing.list_price).toLocaleString()}/mo` : '';
const vars = { address, city: listing.city || '', price, id: listing.id };

// 2. Live template from site_config (fallback mirrors share-listing.js)
const { data: cfgRows } = await supabase
  .from('site_config')
  .select('key, value')
  .in('key', ['share_subject', 'share_message']);
const cfg = Object.fromEntries((cfgRows || []).map(r => [r.key, r.value]));

const subjectTpl = cfg.share_subject || 'Check out this rental: {{address}}, {{city}} — {{price}}';
const bodyTpl = cfg.share_message || 'Check out this rental on PadMagnet! {{address}}, {{city}} — {{price}}\nhttps://padmagnet.com/listing/{{id}}';

const fill = (t) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
const subject = fill(subjectTpl);
const body = fill(bodyTpl);

console.log('--- RENDERED SHARE OUTPUT ---');
console.log('SUBJECT:', subject);
console.log('BODY   :', body);
console.log('-----------------------------');

// 3. Send as plain text (faithful to native share-sheet email)
const result = await resend.emails.send({
  from: 'PadMagnet <noreply@padmagnet.com>',
  to: 'chris@floridapm.net',
  subject,
  text: body,
});

console.log('Resend result:', JSON.stringify(result, null, 2));
