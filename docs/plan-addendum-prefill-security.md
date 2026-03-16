# Plan Addendum: Zero-Rekey, Google Prefill & Security Hardening

> **Created**: 2026-03-16
> **Status**: Approved — integrate into Phase 1 of freemium-implementation-plan.md
> **Parent plan**: `docs/freemium-implementation-plan.md`

---

## TABLE OF CONTENTS
1. [Zero-Rekey & Google Prefill](#1-zero-rekey--google-prefill)
2. [Security Hardening (Critical)](#2-security-hardening-critical)
3. [Security Hardening (High)](#3-security-hardening-high)
4. [Security Hardening (Medium)](#4-security-hardening-medium)
5. [Stripe Security Path](#5-stripe-security-path)
6. [Privacy & Compliance](#6-privacy--compliance)
7. [Supply Chain Security](#7-supply-chain-security)
8. [Updated Rollout Integration](#8-updated-rollout-integration)

---

## 1. ZERO-REKEY & GOOGLE PREFILL

### Principle
If we collect a data point ANYWHERE, it must auto-populate EVERYWHERE else that data appears. Users type each piece of information exactly once.

### Current Violations & Fixes

#### FIX 1: First Name — register.js → about-you.js (CRITICAL REKEY)
**Problem**: User enters first name at registration (`register.js`), which stores it in `auth.user_metadata.display_name`. Then `about-you.js` shows empty first/last name fields — user must retype.

**Fix**: In `about-you.js`, on mount, load from auth metadata:
```javascript
useEffect(() => {
  const meta = user?.user_metadata;
  if (meta?.display_name && !firstName) {
    // If display_name is "John", pre-fill first name
    setFirstName(meta.display_name);
  }
  if (meta?.first_name && !firstName) setFirstName(meta.first_name);
  if (meta?.last_name && !lastName) setLastName(meta.last_name);
}, [user]);
```

#### FIX 2: Email Not Synced to Profiles Table
**Problem**: After registration, `auth.user.email` exists but `profiles.email` may be empty until first profile edit. Owner create Step 6 pulls from `profiles.email` — may show empty.

**Fix**: In `about-you.js` (the first post-auth screen), sync email to profiles:
```javascript
// After saving name to profiles, also ensure email is synced
await supabase.from('profiles').update({
  display_name: `${firstName} ${lastName}`.trim(),
  email: user.email,  // Always sync auth email to profiles
}).eq('id', user.id);
```

#### FIX 3: Phone Not Prefilled in Owner Create Step 6
**Problem**: If owner has phone in `profiles.phone` (from settings or notifications), the owner create wizard Step 6 phone field is empty.

**Fix**: In `owner/create.js`, the step 6 transition already fetches profile — extend it:
```javascript
if (step === 5) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, phone')
    .eq('id', user.id)
    .single();

  if (!form.listing_agent_email)
    update('listing_agent_email', profile?.email || user.email || '');
  if (!form.listing_agent_name)
    update('listing_agent_name', profile?.display_name || '');
  // ADD THIS:
  if (!form.listing_agent_phone && profile?.phone)
    update('listing_agent_phone', profile.phone);
}
```

#### FIX 4: Phone Entered in Owner Create Not Saved to Profile
**Problem**: Owner enters phone at Step 6 for their listing. But this phone is only saved to `listings.listing_agent_phone`, not to `profiles.phone`. So the notification settings screen still shows empty phone.

**Fix**: When listing is created/activated, also sync phone to profile:
```javascript
// In /api/owner/listings POST handler, after creating listing:
if (listing.listing_agent_phone) {
  await supabase.from('profiles')
    .update({ phone: listing.listing_agent_phone })
    .eq('id', user.id)
    .is('phone', null);  // Only set if profile phone is currently empty
}
```

#### FIX 5: Onboarding Form State Not Persisted
**Problem**: Tenant enters budget/beds in onboarding, closes app, re-opens — form values are gone (only step number persists).

**Fix**: Save form state to AsyncStorage alongside step:
```javascript
// In onboarding.js, whenever form values change:
await AsyncStorage.setItem('onboarding_form', JSON.stringify({
  budget_max, beds_min, property_types,
  association_preferred, pets_required
}));

// On mount:
const savedForm = await AsyncStorage.getItem('onboarding_form');
if (savedForm) {
  const parsed = JSON.parse(savedForm);
  setBudgetMax(parsed.budget_max || '');
  setBedsMin(parsed.beds_min || '');
  // ... etc
}
```

#### FIX 6: Google Places in ZonePicker (Enhancement)
**Current**: ZonePicker uses local autocomplete from 91 cities in `service-areas.js`.
**Enhancement**: Add Google Places as fallback for addresses not in the city list.

**Decision**: DEFER. Local autocomplete covers all 91 South Florida cities in our service area. Google Places would add complexity and API cost for minimal benefit. Tenants search by city/zone, not by specific address. Keep local autocomplete — it's faster and free.

### Data Flow Map (Post-Fix)

```
Registration (email.js → register.js)
  ├── auth.user.email ──────────────→ profiles.email (synced at about-you)
  ├── auth.user_metadata.display_name → about-you first name (prefilled)
  └── auth.user_metadata.role ──────→ profiles.role

About You
  ├── first_name + last_name ────────→ profiles.display_name
  ├── email (from auth) ────────────→ profiles.email
  ├── phone (if consented) ─────────→ profiles.phone
  └── sms_consent ──────────────────→ profiles.sms_consent + timestamp + IP

Owner Create Step 6 (Contact)
  ├── listing_agent_name ←───────── profiles.display_name (prefilled)
  ├── listing_agent_email ←──────── profiles.email (prefilled)
  ├── listing_agent_phone ←──────── profiles.phone (prefilled)
  └── listing_agent_phone ─────────→ profiles.phone (synced back if empty)

Settings → Edit Profile
  ├── display_name ←→ profiles.display_name
  ├── email ←→ profiles.email + auth.user.email
  └── phone ←→ profiles.phone

Settings → Notifications
  ├── phone ←→ profiles.phone (same source)
  ├── sms_consent ←→ profiles.sms_consent
  ├── preferred_channel ←→ profiles.preferred_channel
  └── push_token ←→ profiles.expo_push_token

Owner Create Step 0 (Address)
  └── Google Places Autocomplete → street_number, street_name, city,
      state, postal_code, lat, lng (all auto-filled from selection)
```

**Result**: Every data point is entered ONCE and flows to all other locations automatically.

---

## 2. SECURITY HARDENING (CRITICAL — Fix Before Any New Features)

### VULN-1: Admin API Routes Have NO Authentication [CRITICAL]

**Impact**: Any authenticated user (tenant, owner, anyone with a valid JWT) can call ANY admin endpoint directly. They can read all user data, modify listings, change site config, delete users.

**Affected Routes** (ALL of these):
- `/api/admin/overview`
- `/api/admin/display-fields`
- `/api/admin/listings`
- `/api/admin/message-templates`
- `/api/admin/waitlist`
- `/api/admin/config`
- `/api/admin/products`
- `/api/admin/messaging`
- `/api/admin/webhook-logs`
- `/api/admin/users`
- `/api/admin/users/invite`
- `/api/admin/tickets`
- `/api/admin/tickets/messages`
- `/api/admin/audit-log`

**Fix**: Create a shared admin auth helper and add it to EVERY admin route:

```javascript
// lib/admin-auth.js (NEW)
import { createServiceClient } from './supabase';

export async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing authorization', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { error: 'Invalid token', status: 401 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!['admin', 'super_admin'].includes(profile?.role)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { user, profile, supabase };
}
```

Then in every admin route:
```javascript
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user, supabase } = auth;
  // ... rest of handler
}
```

### VULN-2: SQL Injection in Listings Query [CRITICAL]

**Location**: `/api/listings/route.js`, line ~119
```javascript
query = query.not('id', 'in', `(${swipedIds.join(',')})`)
```

**Risk**: If any swipedId value was manipulated, it could inject into the filter.

**Fix**: Use Supabase's proper array filter:
```javascript
if (swipedIds.length > 0) {
  // Validate all IDs are proper UUIDs first
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validIds = swipedIds.filter(id => UUID_RE.test(id));
  if (validIds.length > 0) {
    query = query.not('id', 'in', `(${validIds.join(',')})`);
  }
}
```

### VULN-3: CRON_SECRET Conditional Check [CRITICAL]

**Problem**: If `CRON_SECRET` env var is missing, ALL cron endpoints are completely open.

**Fix** (apply to all 4 cron routes):
```javascript
export async function GET(request) {
  const CRON_SECRET = process.env.CRON_SECRET;

  // HARD FAIL if secret not configured
  if (!CRON_SECRET) {
    console.error('CRON_SECRET not set — refusing to run');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... rest of handler
}
```

### VULN-4: Auth Token Storage — AsyncStorage is Plaintext [CRITICAL]

**Problem**: Supabase stores JWT tokens in AsyncStorage by default. AsyncStorage is unencrypted — any app with root access, malware, or a device compromise can read these tokens.

**Fix**: Switch to `expo-secure-store`:
```javascript
// lib/supabase.js (mobile)
import * as SecureStore from 'expo-secure-store';

const SecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

**Note**: This is a NATIVE change — requires EAS build, not just JS hot reload. Existing sessions in AsyncStorage will be invalidated (users will need to re-login once after the update).

---

## 3. SECURITY HARDENING (HIGH)

### VULN-5: Admin Config Endpoint Has No Key Whitelist [HIGH]

**Problem**: `/api/admin/config` accepts ANY key for upsert. Combined with VULN-1 (no auth), anyone could set arbitrary config values.

**Fix**:
```javascript
const ALLOWED_CONFIG_KEYS = [
  'bridge_portal_url', 'bridge_notes',
  'owner_listing_footer', 'mls_listing_footer',
  'share_subject', 'share_message', 'share_templates_active',
  'owner_empty_state', 'owner_upgrade_page', 'owner_post_activation',
  'market_stats', 'owner_explore_tab',
];

export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { key, value } = await request.json();
  if (!ALLOWED_CONFIG_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Invalid config key' }, { status: 400 });
  }
  // ... proceed
}
```

### VULN-6: RLS Self-Role-Escalation Check [HIGH]

**Risk**: If the `profiles` RLS UPDATE policy allows users to modify their own `role` column, any user could make themselves `super_admin`.

**Fix**: Verify RLS policy restricts `role` column updates:
```sql
-- Check current policy
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- If the update policy is too permissive, replace with:
CREATE POLICY "Users can update own profile (except role)"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  -- Prevents role from being changed via client
);
```

### VULN-7: Photo Upload Path Validation [HIGH]

**Fix**: Stricter path validation in `/api/owner/photos`:
```javascript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_FILENAME = /^[a-z0-9_-]+\.webp$/i;

const unauthorized = paths.filter(p => {
  const parts = p.split('/');
  if (parts.length !== 2) return true;
  const [folder, file] = parts;
  return folder !== user.id || !UUID_RE.test(folder) || !SAFE_FILENAME.test(file);
});
```

### VULN-8: Stripe Metadata Validation [HIGH — pre-Stripe implementation]

**When implementing Stripe**: Never trust client-sent price IDs or user IDs in checkout session metadata.

**Architecture**:
```javascript
// In /api/owner/subscription/upgrade (when built):
export async function POST(request) {
  const { user } = await getAuthUser(request);
  const { tier } = await request.json(); // 'pro' or 'premium'

  // ALWAYS look up price server-side — never accept priceId from client
  const TIER_PRICES = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    premium: process.env.STRIPE_PREMIUM_PRICE_ID,
  };

  const priceId = TIER_PRICES[tier];
  if (!priceId) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    customer: profile.stripe_customer_id || undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    metadata: { user_id: user.id }, // Set server-side, not from client
    // ...
  });
}
```

In webhook handler:
```javascript
// Verify the user_id from metadata matches the Stripe customer
const { user_id } = session.metadata;
const { data: profile } = await supabase
  .from('profiles')
  .select('stripe_customer_id')
  .eq('id', user_id)
  .single();

if (profile.stripe_customer_id && profile.stripe_customer_id !== session.customer) {
  console.error('Customer mismatch — possible fraud');
  return NextResponse.json({ error: 'Invalid' }, { status: 400 });
}
```

### VULN-9: Input Validation on All User-Facing Endpoints [HIGH]

Create a shared validation utility:
```javascript
// lib/validate.js (NEW)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(str) {
  return typeof str === 'string' && UUID_RE.test(str);
}

export function isValidPrice(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n > 0 && n <= 999999;
}

export function sanitizeText(str, maxLen = 2000) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')  // Strip HTML tags
    .trim()
    .slice(0, maxLen);
}

export function sanitizeName(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\n\r<>]/g, '').trim().slice(0, 100);
}
```

Apply to all endpoints that accept user input (listings, messages, profiles, owner create).

---

## 4. SECURITY HARDENING (MEDIUM)

### VULN-10: Rate Limiting [MEDIUM — Implement Before Launch]

**Recommendation**: Upstash Redis + `@upstash/ratelimit` (free tier covers PadMagnet's scale, works on Vercel serverless).

**Priority tiers**:

| Priority | Endpoint | Limit | Why |
|----------|----------|-------|-----|
| **Tier 1** | Auth (login/signup/reset) | 5/min/IP | Brute force prevention |
| **Tier 1** | SMS consent/phone verify | 3/hour/user | SMS costs money |
| **Tier 1** | Photo uploads | 10/min/user | Storage abuse |
| **Tier 2** | Message sending | 30/min/user | Spam prevention |
| **Tier 2** | Listing creation | 5/hour/user | Listing spam |
| **Tier 2** | General API | 100/min/IP | DoS prevention |
| **Tier 3** | Public pages (SSR) | 60/min/IP | Anti-scraping |
| **Tier 3** | Admin endpoints | 30/min/IP | Defense in depth |
| **Tier 3** | CSV export | 5/hour/user | Data harvesting |

**Shared utility**:
```javascript
// lib/rate-limit.js (NEW)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export function createRateLimiter(requests, window) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
  });
}

// Usage in any route:
const limiter = createRateLimiter(30, '1 m');
const { success } = await limiter.limit(user.id);
if (!success) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}
```

**New env vars needed**: `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN` (add to Vercel + .env.local)

### VULN-11: Cron Replay Protection [MEDIUM]

**Problem**: Cron endpoints can be called multiple times rapidly if the secret is known.

**Fix**: Add a "last run" cooldown check:
```javascript
// At the start of each cron handler:
const { data: lastRun } = await supabase
  .from('site_config')
  .select('value')
  .eq('key', `cron_last_run_${cronName}`)
  .single();

const lastRunTime = lastRun?.value ? new Date(lastRun.value).getTime() : 0;
if (Date.now() - lastRunTime < 60000) { // 1 minute cooldown
  return NextResponse.json({ error: 'Cron ran too recently' }, { status: 429 });
}

// At the end, after successful run:
await supabase.from('site_config').upsert({
  key: `cron_last_run_${cronName}`,
  value: new Date().toISOString()
}, { onConflict: 'key' });
```

### VULN-12: Message Content Sanitization [MEDIUM]

**Risk**: Phishing links, payment scam URLs, HTML injection in messages.

**Fix**: In `/api/messages` POST handler:
```javascript
import { sanitizeText } from '@/lib/validate';

const content = sanitizeText(body.content, 2000);
if (!content) {
  return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
}

// Flag messages with external URLs (for admin review)
const hasExternalUrl = /https?:\/\/(?!padmagnet\.com)/i.test(content);
if (hasExternalUrl) {
  // Store flag for admin review, but still deliver
  messageData.flagged = true;
  messageData.flag_reason = 'external_url';
}
```

### VULN-13: Realtime Subscription Security [MEDIUM]

**Verify**: Supabase Realtime respects RLS policies for Postgres Changes. But confirm:
- Users can only subscribe to their own conversations
- Users cannot subscribe to other users' profile changes
- Channel names are scoped (e.g., `conversation:${conversationId}` not just `*`)

### VULN-14: Verbose Error Messages [LOW]

**Fix**: In all API routes, don't expose internal error details to clients:
```javascript
// BAD:
return NextResponse.json({ error: err.message }, { status: 500 });

// GOOD:
console.error('Listing creation failed:', err);
return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
```

---

## 5. STRIPE SECURITY PATH

When implementing Stripe for subscription tiers, follow this checklist:

### Architecture
- Use **Stripe Checkout** (hosted payment page) — keeps PadMagnet entirely out of PCI scope
- For mobile: Use **@stripe/stripe-react-native** with native SDKs
- Card data NEVER touches our servers
- All payment state managed server-side via webhooks

### Implementation Security Rules
1. **Price IDs always looked up server-side** — never accept from client
2. **Webhook signature validation** with raw body (already done correctly in current stripe webhook)
3. **Subscription status synced via webhook only** — never trust client-sent tier claims
4. **Feature gating in RLS policies** (database level, not just UI):
```sql
-- Example: Only Pro+ can have >1 active listing
CREATE POLICY "Listing limit by tier"
ON listings FOR INSERT
WITH CHECK (
  (SELECT tier FROM profiles WHERE id = auth.uid()) != 'free'
  OR (SELECT COUNT(*) FROM listings WHERE owner_id = auth.uid() AND status = 'active') < 1
);
```
5. **Enable Stripe Radar** (free) for fraud detection
6. **Enable 3D Secure** for first payments
7. **Idempotency keys** on all Stripe API calls to prevent duplicate charges

### Env Vars for Stripe (when ready)
```
STRIPE_SECRET_KEY          — Vercel only (NEVER in EXPO_PUBLIC_ or client)
STRIPE_WEBHOOK_SECRET      — Vercel only
STRIPE_PRO_PRICE_ID        — Vercel only
STRIPE_PREMIUM_PRICE_ID    — Vercel only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — Safe for client
```

---

## 6. PRIVACY & COMPLIANCE

### Current Status
- **Florida FDBR**: Does NOT apply (requires $1B+ revenue)
- **CCPA**: Does NOT currently apply (requires $25M+ revenue or 100K+ users)
- **Best practice**: Implement core privacy features now to avoid costly retrofits

### Required Before App Store Submission
1. **Privacy Policy** — must disclose: data collected (name, email, phone, location prefs, swipe behavior, listing views, photos), purpose, third parties (Supabase, Stripe, Twilio, Resend, Google Maps, Expo/EAS)
2. **Account Deletion** — Apple and Google both REQUIRE a way to delete your account and all associated data. Build:
   - Settings → "Delete Account" button
   - Confirmation dialog with warning
   - Server endpoint that: deletes profile, anonymizes messages, removes listings, clears swipes/views, calls `supabase.auth.admin.deleteUser()`
   - 30-day grace period (soft delete → hard delete via cron)
3. **Age Gate** — Checkbox at signup: "I am 18 years or older" (increasingly required, especially with Texas age-signal law January 2026)

### Data Handling Rules
- Strip EXIF from all photos (already done via Sharp)
- Never store precise GPS of users (we store zone preferences only — correct)
- Don't log full JWT tokens in server logs
- Retain message history for 2 years max, then anonymize
- Never sell user data — state this explicitly in privacy policy

---

## 7. SUPPLY CHAIN SECURITY

### npm Dependency Safety
1. **Lock dependencies** — use `package-lock.json` (already standard). Never use `*` or `>=` ranges
2. **Add `npm audit` to deployment** — run before every Vercel deploy
3. **Use `npm ci` in CI/CD** — installs from lockfile exactly
4. **Pin GitHub Actions by commit SHA** — not tags (prevents tag hijacking)
5. **Expo SDK updates** — stay on stable releases, check Expo security advisories

### Next.js Version
- Pin to latest stable 14.x with all security patches
- CVE-2025-55182 (CVSS 10.0 — RCE) affects canary releases, NOT stable. Verify we're on stable.
- Run `npm ls next` to confirm version

### Action Item
```bash
# Add to package.json scripts:
"preinstall": "npx npm-force-resolutions",
"audit": "npm audit --audit-level=high"

# Run before every deploy:
npm audit --audit-level=high
```

---

## 8. UPDATED ROLLOUT INTEGRATION

These security fixes integrate into the existing freemium rollout phases:

### Phase 0: Security Sprint (NEW — Before Phase 1, ~3 days)

**Day 1: Critical Fixes**
- [ ] Create `lib/admin-auth.js` (requireAdmin helper)
- [ ] Add `requireAdmin()` to ALL 14 admin API routes
- [ ] Fix SQL injection in `/api/listings/route.js` (UUID validation)
- [ ] Fix CRON_SECRET conditional → hard fail if missing
- [ ] Create `lib/validate.js` (sanitizeText, sanitizeName, isValidUUID, isValidPrice)

**Day 2: Auth & Input Hardening**
- [ ] Switch mobile Supabase to `expo-secure-store` (native change — needs EAS build)
- [ ] Verify RLS on profiles prevents role self-escalation (SQL check + fix if needed)
- [ ] Add config key whitelist to `/api/admin/config`
- [ ] Fix photo upload path validation (stricter regex)
- [ ] Add input sanitization to messages POST endpoint
- [ ] Sanitize listing_agent_name (strip newlines, HTML)

**Day 3: Zero-Rekey Fixes + Verification**
- [ ] Fix first name prefill: register.js → about-you.js
- [ ] Fix email sync: about-you.js → profiles.email
- [ ] Fix phone prefill: profiles.phone → owner create Step 6
- [ ] Fix phone sync-back: owner create Step 6 → profiles.phone
- [ ] Persist onboarding form state to AsyncStorage
- [ ] EAS Build (secure-store is a native change)
- [ ] Manual security test: try calling /api/admin/* as tenant user

### Phase 1-5: (Unchanged from freemium-implementation-plan.md)
- Rate limiting (Upstash Redis) added to Phase 1
- Account deletion added to Phase 4 (pre-app-store)
- Privacy policy + age gate added to Phase 4
- Stripe security architecture followed in Phase 4
- Message sanitization + URL flagging added to Phase 2

### New Dependencies

| Package | Purpose | Where |
|---------|---------|-------|
| `expo-secure-store` | Encrypted token storage | Mobile |
| `@upstash/ratelimit` | Rate limiting | Web API |
| `@upstash/redis` | Redis client for rate limiting | Web API |

### New Env Vars

| Variable | Where | Purpose |
|----------|-------|---------|
| `UPSTASH_REDIS_URL` | Vercel + .env.local | Rate limiting |
| `UPSTASH_REDIS_TOKEN` | Vercel + .env.local | Rate limiting |

### New Files

| File | Purpose |
|------|---------|
| `lib/admin-auth.js` | Shared admin authentication helper |
| `lib/validate.js` | Input validation/sanitization utilities |
| `lib/rate-limit.js` | Rate limiting utility (Upstash) |

---

## SEVERITY SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| **CRITICAL** | 4 | Fix in Phase 0 Day 1-2 |
| **HIGH** | 5 | Fix in Phase 0 Day 2-3 |
| **MEDIUM** | 5 | Fix in Phase 1 |
| **LOW** | 2 | Fix opportunistically |

The 4 critical vulnerabilities (admin auth bypass, SQL injection, cron secret bypass, plaintext token storage) should be fixed BEFORE any new feature development begins.
