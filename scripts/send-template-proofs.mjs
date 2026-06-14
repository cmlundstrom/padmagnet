/**
 * Send a real rendered copy of every ACTIVE email_templates row to
 * chris@floridapm.net for branding proofing. Each goes out with its real
 * subject so it lands exactly as a recipient would see it.
 *
 * Sample data is anchored to the 8362 SE Magnolia demo listing.
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

const TO = 'chris@floridapm.net';
const FROM = 'PadMagnet <noreply@padmagnet.com>';
const LISTING_URL = 'https://padmagnet.com/listing/8a0d6d7f-a33c-4b92-97c0-9056a2daa68f';

// Realistic sample values for every {{variable}} found across the 20 templates.
const SAMPLE = {
  admin_url: 'https://padmagnet.com/admin',
  alert_type: 'Cron Job Failure',
  amount: '$29.00',
  beds_baths: '3 bed · 2 bath',
  confirmation_code: 'PM-8362-MAG',
  contacts: 'Maverick Testowner',
  content_id: 'a1b2c3d4',
  content_type: 'listing',
  content_type_label: 'Listing',
  created_at: 'May 31, 2026',
  date: 'May 31, 2026',
  date_time: 'Jun 3, 2026 at 2:00 PM EDT',
  days_on_market: '5',
  days_remaining: '3',
  description: 'Bright 3-bed pool home steps from the Intracoastal in Hobe Sound. Updated kitchen, fenced yard, two-car garage.',
  details: '3 bed · 2 bath · 1,850 sqft',
  document_name: 'Lease Agreement.pdf',
  edit_note: 'Polished the description wording and standardized the price formatting. No factual changes.',
  expires_at: 'Jun 13, 2026',
  free_text_block: 'Thanks for being part of PadMagnet — we are glad to have you.',
  inbox_url: 'https://padmagnet.com',
  listing_address: '8362 SE Magnolia Ave, Hobe Sound, FL 33455',
  listing_url: LISTING_URL,
  message_preview: 'Hi! Is this home still available? I would love to schedule a tour this weekend.',
  owner_name: 'Maverick',
  photo_count: '12',
  property_type: 'Single Family Home',
  reason: 'Inappropriate content',
  reason_code: 'spam',
  receipt_url: 'https://padmagnet.com/receipt/sample',
  refund_date: 'May 31, 2026',
  rejection_reason: 'A couple of the photos do not appear to match the listed address — please re-upload.',
  renew_url: 'https://padmagnet.com/owner/renew',
  rent: '$4,450/mo',
  report_id: 'RPT-1024',
  reporter_email: 'renter@example.com',
  review_note: 'Looks great — approved and live!',
  review_reason: 'Routine pre-publish review',
  tenant_name: 'Goosie',
  timestamp: 'May 31, 2026 9:45 PM EDT',
  unique_views: '47',
  upload_url: 'https://padmagnet.com/upload/sample',
  view_url: LISTING_URL,
};

function fill(str) {
  return String(str || '').replace(/\{\{(\w+)\}\}/g, (_, k) =>
    SAMPLE[k] !== undefined ? SAMPLE[k] : `[${k}]`,
  );
}

const { data: templates, error } = await supabase
  .from('email_templates')
  .select('slug, subject, body_html')
  .eq('is_active', true)
  .order('slug');

if (error) { console.error('Fetch error:', error.message); process.exit(1); }

console.log(`Sending ${templates.length} template proofs to ${TO}...\n`);
const results = [];
for (const t of templates) {
  const subject = fill(t.subject);
  const html = fill(t.body_html);
  try {
    const { data, error: sendErr } = await resend.emails.send({ from: FROM, to: TO, subject, html });
    if (sendErr) throw new Error(sendErr.message || JSON.stringify(sendErr));
    results.push({ slug: t.slug, id: data.id, subject });
    console.log(`✓ ${t.slug.padEnd(28)} ${data.id}`);
  } catch (e) {
    results.push({ slug: t.slug, error: e.message });
    console.log(`✗ ${t.slug.padEnd(28)} ERROR: ${e.message}`);
  }
  // Stay under Resend's 5 req/s limit
  await new Promise(r => setTimeout(r, 300));
}

const ok = results.filter(r => r.id).length;
const fail = results.filter(r => r.error).length;
console.log(`\nDone: ${ok} sent, ${fail} failed.`);
