// Verifies that profiles.preferred_channel was persisted to 'email'
// after the notifications save smoke tapped Save.
//
// Reads the seeded renter's profile row via service-role REST and
// throws if preferred_channel !== 'email'. This is the load-bearing
// assertion that proves the save endpoint actually wrote to the DB
// (not just showed the success alert).

if (!output.seed || !output.seed.renter || !output.seed.renter.userId) {
  throw new Error('verify_preferred_channel_email: output.seed.renter.userId not set — was seed_test_renter.js run?');
}

const adminHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
};

const resp = http.get(
  SUPABASE_URL + '/rest/v1/profiles?id=eq.' + output.seed.renter.userId + '&select=preferred_channel',
  { headers: adminHeaders }
);

if (!resp.ok) {
  throw new Error('verify_preferred_channel_email: REST GET HTTP ' + resp.status + ' — ' + resp.body);
}

const rows = json(resp.body);
if (!rows || rows.length === 0) {
  throw new Error('verify_preferred_channel_email: profile row not found for userId ' + output.seed.renter.userId);
}

const channel = rows[0].preferred_channel;
if (channel !== 'email') {
  throw new Error('verify_preferred_channel_email: expected email, got ' + channel);
}

console.log('verify_preferred_channel_email: confirmed preferred_channel=email for ' + output.seed.renter.userId);
