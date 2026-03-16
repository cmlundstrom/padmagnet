# PadMagnet Freemium Implementation Plan (C+D Unified)

> **Created**: 2026-03-15
> **Updated**: 2026-03-16 — Added Section 14 (Security, Zero-Rekey & Google API)
> **Status**: Approved blueprint — Phase 0.5 security fixes complete, ready for Phase 1
> **Scope**: Owner flow redesign, freemium tier system, design system standardization, cleanup, security hardening

## TABLE OF CONTENTS
1. [Executive Summary](#1-executive-summary)
2. [Current App Audit & Cleanup Plan](#2-current-app-audit--cleanup-plan)
3. [Pricing & Tier Architecture](#3-pricing--tier-architecture)
4. [Owner Flow Redesign (Screen-by-Screen)](#4-owner-flow-redesign-screen-by-screen)
5. [Design System Standardization](#5-design-system-standardization)
6. [Communications Consent Integration](#6-communications-consent-integration)
7. [Sales Page & Admin Preview System](#7-sales-page--admin-preview-system)
8. [Nearby Rentals as Value Prop](#8-nearby-rentals-as-value-prop)
9. [Social Proof Strategy (FTC-Compliant)](#9-social-proof-strategy-ftc-compliant)
10. [Metrics Dashboard Integration](#10-metrics-dashboard-integration)
11. [Technical Architecture](#11-technical-architecture)
12. [Cleanup Manifest (Dead Code Removal)](#12-cleanup-manifest)
13. [Rollout Roadmap](#13-rollout-roadmap)
14. [Security, Zero-Rekey & Google API](#14-security-zero-rekey--google-api)

---

## 1. EXECUTIVE SUMMARY

PadMagnet moves to a **freemium model** with three tiers:
- **Free** ("Starter") — 1 active listing, basic features
- **Pro** ($4.99/mo) — Up to 5 listings + analytics + priority placement
- **Premium** ($9.99/mo) — Unlimited listings + featured badge + instant tenant push + lead export

The owner flow is redesigned end-to-end with a **prove-value-first** approach: owners experience the app's power (Nearby Rentals, matching preview) before hitting any paywall. The paywall appears **after** listing creation (sunk-cost), not before.

Key principles:
- **Free tier is generous** — matches competitor free tiers (Zillow, Apartments.com, TurboTenant all offer free listings)
- **Paid tiers undercut everyone** — Pro $4.99 vs TurboTenant $9.92, Premium $9.99 vs Avail $7-9/unit
- **Per-account, not per-unit** — massive differentiator vs Avail/Zumper
- **No fabricated testimonials** — FTC 2024 rule makes this illegal ($50K+/violation). Use beta tester quotes, fact-based social proof, founder vision statements
- **Nearby Rentals stays free** — all competitors offer comp tools free as lead-gen. It's PadMagnet's onboarding hook
- **Design system locked down** — eliminate 29+ hardcoded colors, unify 3 color systems, formalize all new UI elements

---

## 2. CURRENT APP AUDIT & CLEANUP PLAN

### What We Have (Complete Inventory)

**Mobile App**: 108 source files
- 36 routes (34 active, 2 potentially dead)
- 36 components (35 active, 1 dead)
- 11 hooks (all active)
- 6 libs, 7 constants, 4 utils, 2 providers (all active)

**Web/API App**: ~97 files
- 51 API routes (all active)
- 18 admin panels (14 active, 1 partial, 1 stub, 2 dead)
- 13 lib files (all active)

### Dead Code to Remove

| File | Type | Reason | Action |
|------|------|--------|--------|
| `mobile/components/listing/DynamicField.js` | Component | Never imported anywhere (136 lines) | **DELETE** |
| `mobile/app/(auth)/verify.js` | Route | No imports found, email verification handled elsewhere | **ARCHIVE → mobile/app/_archived/verify.js** |
| `mobile/app/owner/relist.js` | Route | Incomplete, relist not yet a real flow | **ARCHIVE → mobile/app/_archived/relist.js** |
| `mobile/app/settings/verification.js` | Route | Unclear implementation, likely superseded | **ARCHIVE → mobile/app/_archived/verification.js** |
| `app/admin/panels/FeedsPanel.js` | Panel | Hardcoded demo data, not wired to live sync_logs | **ARCHIVE → app/admin/_archived/FeedsPanel.js** |
| `app/admin/demo-data.js` | Data | Only used by dead FeedsPanel | **ARCHIVE → app/admin/_archived/demo-data.js** |
| `app/admin/panels/BillingPanel.js` | Panel | Stub, Stripe not connected | **KEEP but hide from nav** (will be needed for tier payments) |
| `docs/communications-plan-v4.md` | Doc | Superseded version | **DELETE** |

### Archive Strategy
- Create `mobile/app/_archived/` and `app/admin/_archived/` directories
- Move dead files there (not deleted, just out of the way)
- Remove from layout imports and navigation
- These dirs are gitignored from linting/build but stay in repo for reference

---

## 3. PRICING & TIER ARCHITECTURE

### Competitive Landscape (Current 2025-2026 Pricing)

| Platform | Free Tier | Paid | Model |
|----------|-----------|------|-------|
| Zillow | Yes (all listings) | $29.99-$39.99/listing boost | Per-listing |
| Apartments.com | Yes (full platform) | ~$349/listing premium | Per-listing |
| TurboTenant | Yes (unlimited) | $9.92-$12.42/mo flat | Subscription |
| Avail | Yes (basic) | $7-9/unit/mo | Per-unit |
| Zumper | Yes (up to 5) | 2% of rent (~$30-60/mo) | Per-listing % |
| Craigslist | Yes (S. Florida) | — | — |

### PadMagnet Three-Tier Structure

#### FREE — "Starter" ($0/forever)
- 1 active listing
- Full 8-step listing wizard
- Photo upload (up to 10 photos)
- Nearby Rentals pricing tool (free — matches all competitors)
- Tenant matching via PadScore algorithm
- In-app messaging with matched tenants
- Email + push notifications for inquiries
- MLS-quality listing presentation
- Basic listing stats (view count)

#### PRO — $4.99/mo ($47.88/yr billed annually = $3.99/mo)
Everything in Free, plus:
- Up to 5 active listings
- **"Verified Owner" badge** on listing cards (blue checkmark)
- **Listing analytics dashboard** (views, swipes, save rate, days on market)
- **Price drop notification** — auto-push to matched tenants when you lower price
- **Priority placement** — PadScore boost indicator in swipe deck
- **Listing renewal reminders** (7-day, 3-day, 1-day email)
- **SMS notifications** for tenant inquiries

#### PREMIUM — $9.99/mo ($95.88/yr billed annually = $7.99/mo)
Everything in Pro, plus:
- **Unlimited active listings**
- **"Featured" gold badge** on listing cards (gold border in swipe deck)
- **Instant push to matched tenants** when listing goes live
- **Lead contact info export** (CSV download)
- **Custom branding** on listings (company name/logo for property managers)
- **Priority support** response
- **Competitive insights** — see how your listing ranks vs nearby (PadScore comparison)

### Why This Works
- **$4.99 undercuts TurboTenant Pro ($9.92) by 50%**
- **$9.99 undercuts Avail Plus ($7-9/unit) dramatically** for multi-property owners
- **Per-account, not per-unit** — owner with 10 units pays $9.99 total vs $70-90/mo on Avail
- **Pennies-a-day framing**: $4.99/30 = "just 17¢/day", $9.99/30 = "just 33¢/day"

### Decoy Pricing Psychology
The three-tier structure creates a natural decoy effect:
- Free → Pro jump: $0 to $4.99 (low friction)
- Pro → Premium jump: $4.99 to $9.99 (only $5 more for "unlimited + featured")
- **Premium becomes the obvious choice** for anyone with 2+ properties — it's cheaper than 2x Pro

### Launch Strategy
- **Day 1-90**: Everything free for all owners ("Founding Owner" period)
- **Day 91+**: Free tier enforced, paid tiers activate
- **Founding Owner perk**: First 100 owners who upgrade get **locked-in pricing for life** ($3.99 Pro / $7.99 Premium monthly)

---

## 4. OWNER FLOW REDESIGN (Screen-by-Screen)

### Current Flow (14 screens)
```
Welcome → Email → Password → Register → About You →
  ┌─ Listings Tab (empty state or list)
  ├─ Services Tab (products)
  ├─ Messages Tab
  └─ Profile Tab → Settings → Edit Profile / Notifications / Preferences
       └─ Create → Edit → Preview → Activate
       └─ Nearby Rentals
```

### Redesigned Flow (18 screens — 4 new, 14 modified)
```
Welcome → Email → Password → Register → About You (+ consent) →
  ┌─ Listings Tab
  │    ├─ EMPTY STATE: "Why PadMagnet" value prop → Create CTA
  │    ├─ Create Wizard (8 steps + consent touchpoint at Step 7)
  │    ├─ Preview → Activate (FREE) or Upgrade (PRO/PREMIUM)
  │    ├─ Edit / Price Edit
  │    └─ Listing Analytics (PRO+)
  ├─ Explore Tab (replaces Services)
  │    ├─ Nearby Rentals (FREE — value hook)
  │    └─ Upgrade Prompt (contextual)
  ├─ Messages Tab (+ consent touchpoint on first visit)
  └─ Profile Tab → Settings
       ├─ Edit Profile
       ├─ Notification Preferences (mirrors onboarding consent)
       ├─ Subscription & Billing (tier management)
       └─ About / Legal
```

### Screen-by-Screen Detail

#### SCREEN 1: Welcome (MODIFY)
**Current**: Role selection + auth buttons
**Add**:
- Fact-based social proof bar: *"11,400+ verified South Florida rental listings"*
- Below role buttons: *"Free to list. No broker fees. No catch."*
- Founder quote: *"I built PadMagnet because listing a rental shouldn't cost $40 or take all day."* — Chris, Founder

#### SCREEN 2-4: Auth Flow (NO CHANGE)
Email → Password → Register stays as-is. Clean and functional.

#### SCREEN 5: About You (MODIFY — Consent Touchpoint #1)
**Current**: Name + role selection
**Add after role = "owner"**:
```
How should tenants reach you?

[Email field — pre-filled from auth]
☑ Email me when a tenant inquires (recommended)

[Phone field — optional]
☐ Text me for urgent inquiries
   By checking this box, you agree to receive SMS messages
   from PadMagnet about tenant inquiries. Msg & data rates
   may apply. Reply STOP to unsubscribe at any time.

You can change these anytime in Settings → Notifications.
```
**Key**: This is warm, value-framed language ("How should tenants reach you?"), not legal-sounding. The TCPA disclosure is present but positioned as a natural part of the flow. Checking the SMS box records `sms_consent: true`, `sms_consent_timestamp`, and `sms_consent_ip` in the profiles table.

#### SCREEN 6: Listings Tab — Empty State (NEW DESIGN)
**Current**: Basic empty state with "Create Listing" button
**Redesign as mini sales page**:
```
┌─────────────────────────────────┐
│  [PadMagnet Icon]               │
│                                 │
│  List Your Rental for Free      │
│                                 │
│  PadMagnet matches your listing │
│  with qualified South Florida   │
│  tenants using smart scoring.   │
│                                 │
│  ✓ Free to list — no broker     │
│    fees, no catch               │
│  ✓ 11,400+ active listings      │
│    across 5 counties            │
│  ✓ Smart matching sends your    │
│    listing to the right tenants │
│  ✓ One-click competitive        │
│    pricing research             │
│                                 │
│  How PadMagnet Compares:        │
│  ┌────────────────────────────┐ │
│  │ Zillow Premium  $39.99    │ │
│  │ Apartments.com  $349      │ │
│  │ Avail Plus      $9/unit   │ │
│  │ PadMagnet       FREE      │ │
│  └────────────────────────────┘ │
│                                 │
│  [  Create Your First Listing  ]│
│         (brandOrange CTA)       │
│                                 │
│  Already have a rental nearby?  │
│  [Check Nearby Pricing →]       │
│       (text link to Explore)    │
└─────────────────────────────────┘
```
Page content stored in `site_config` (key: `owner_empty_state`) and editable from admin dashboard.

#### SCREEN 7: Explore Tab (RENAME from "Services")
**Current**: "Services" tab shows ProductCard list with alerts
**Redesign**: Rename to "Explore" — owner's research/intelligence hub
```
┌─────────────────────────────────┐
│  Explore                        │
│                                 │
│  ┌─ Nearby Rentals ──────────┐  │
│  │  🏘 See what's listed      │  │
│  │  near your property        │  │
│  │  [Check Nearby Pricing →]  │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌─ Market Snapshot ─────────┐  │
│  │  📊 South Florida Market   │  │
│  │  19 renters per vacancy    │  │
│  │  33 days avg. to lease     │  │
│  │  96.4% occupancy rate      │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌─ Your Plan ───────────────┐  │
│  │  Current: Free (Starter)   │  │
│  │  [Upgrade to Pro →]        │  │
│  │  Get analytics, priority   │  │
│  │  placement & more          │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```
Market stats stored in `site_config` (key: `market_stats`) — admin-editable.

#### SCREEN 8: Create Listing Wizard (MODIFY)
Steps 1-6 stay the same. Modifications:

**All steps**: Add `StepProgress` bar at top with encouraging micro-copy:
- Step 1: "Let's find your property"
- Step 2: "Tell us about it"
- Step 3: "Make it shine"
- Step 4: "Set your terms"
- Step 5: "Highlight what makes it special"
- Step 6: "First impressions matter"
- Step 7: "How tenants will reach you"
- Step 8: "Looking great — let's review"

**Step 7 — Contact Info (MODIFY — Consent Touchpoint #2)**
Add notification preference section below existing contact fields:
```
Get notified about inquiries

[Push Notifications]  ☑ Enabled
  Instant alerts when tenants message you

[Email Notifications] ☑ Enabled (uses [email@])
  Daily digest of new inquiries

[SMS Notifications]   ☐ Enable
  Text alerts for urgent messages
  [Phone field if not already provided]
  Standard messaging rates apply. Reply STOP anytime.

💡 Owners who enable push notifications respond
   3x faster to tenant inquiries.
```
Same `NotificationPreferences` component used in Settings → Notifications.

**Step 8 — Review (MODIFY)**
Add at bottom:
```
Your listing will be visible to matched tenants
in [county name] immediately after activation.

[  Activate Listing — Free  ]
    (brandOrange CTA)

Want more visibility?
[Compare Plans →] (text link)
```

#### SCREEN 9: Post-Activation (NEW)
After free activation succeeds:
```
┌─────────────────────────────────┐
│        🎉                       │
│  Your Listing is Live!          │
│                                 │
│  Confirmation: PM-XXXXXX       │
│                                 │
│  Matched tenants in [county]    │
│  can now discover your listing. │
│                                 │
│  ┌─ Upgrade to Pro ──────────┐  │
│  │  Get more from your        │  │
│  │  listing for just 17¢/day  │  │
│  │                            │  │
│  │  ✓ Listing analytics       │  │
│  │  ✓ Priority placement      │  │
│  │  ✓ Verified Owner badge    │  │
│  │  ✓ SMS inquiry alerts      │  │
│  │                            │  │
│  │  [Upgrade — $4.99/mo →]    │  │
│  └────────────────────────────┘  │
│                                  │
│  [  View My Listing  ]          │
│  [  Skip for Now     ]          │
└──────────────────────────────────┘
```
Soft upsell — listing is already live. No pressure.

#### SCREEN 10: Upgrade/Payment Screen (NEW)
```
┌─────────────────────────────────┐
│  Choose Your Plan               │
│                                 │
│  ┌─ Starter ──── Current ────┐  │
│  │  FREE                      │  │
│  │  1 listing • Basic stats   │  │
│  │  [Current Plan]            │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌─ Pro ──── Popular ────────┐  │
│  │  $4.99/mo (just 17¢/day)  │  │
│  │  Save 20% annual: $3.99/mo│  │
│  │                            │  │
│  │  ✓ Up to 5 listings        │  │
│  │  ✓ Verified Owner badge    │  │
│  │  ✓ Listing analytics       │  │
│  │  ✓ Priority placement      │  │
│  │  ✓ SMS inquiry alerts      │  │
│  │  ✓ Price drop auto-push    │  │
│  │                            │  │
│  │  [Select Pro →]            │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌─ Premium ─── Best Value ──┐  │
│  │  $9.99/mo (just 33¢/day)  │  │
│  │  Save 20% annual: $7.99/mo│  │
│  │                            │  │
│  │  Everything in Pro, plus:  │  │
│  │  ✓ Unlimited listings      │  │
│  │  ✓ Featured gold badge     │  │
│  │  ✓ Instant tenant push     │  │
│  │  ✓ Lead export (CSV)       │  │
│  │  ✓ Custom branding         │  │
│  │  ✓ Priority support        │  │
│  │                            │  │
│  │  [Select Premium →]        │  │
│  └────────────────────────────┘  │
│                                  │
│  Others charge more for less:   │
│  Zillow $39.99 • Avail $9/unit  │
│  Apartments.com $349/listing    │
│                                 │
│  🔒 Cancel anytime. No contracts.│
└──────────────────────────────────┘
```
Content stored in `site_config` (key: `upgrade_page`) for admin editability.

#### SCREEN 11: Listing Analytics (NEW — PRO+ only)
```
┌─────────────────────────────────┐
│  ← Listing Performance         │
│                                 │
│  [Listing address]              │
│  Listed [X days ago]            │
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │  47  │ │  12  │ │   3  │   │
│  │Views │ │Saves │ │Chats │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  Swipe Breakdown               │
│  ├─ Right (interested): 12     │
│  ├─ Left (passed): 28          │
│  └─ Save rate: 25.5%           │
│                                 │
│  PadScore vs Nearby Avg        │
│  Your listing: 72              │
│  Nearby average: 65            │
│  ✓ Above average               │
│                                 │
│  [Share Listing] [Edit Listing] │
└──────────────────────────────────┘
```
Data from: `listing_views`, `swipes`, `conversations` tables (all already tracked).

#### SCREENS 12-14: Messages, Profile, Settings (MODIFY)

**Messages Tab — First Visit (Consent Touchpoint #3)**
If no conversations and SMS not consented:
```
No messages yet

When tenants inquire about your listing,
their messages appear here.

Want faster response times?

[Enable Push Notifications]
[Enable SMS Alerts]

Owners who respond within 1 hour are
4x more likely to secure a tenant.
```

**Profile Tab (MODIFY)** — Add subscription status card:
```
┌─ Your Plan ───────────────────┐
│  Free (Starter)                │
│  [Upgrade to Pro →]            │
└────────────────────────────────┘
```

**Settings → Notifications (mirrors onboarding)** — same `NotificationPreferences` component:
```
Notification Preferences

[Push Notifications]  ☑ Enabled
  Instant alerts when tenants message you

[Email Notifications] ☑ Enabled
  Sent to chris@email.com

[SMS Notifications]   ☑ Enabled
  Sent to (555) 123-4567
  Standard messaging rates apply. Reply STOP anytime.

Preferred Channel: [Push ▾]
  We'll try this first, then fall back to others.
```

**Settings → Subscription & Billing (NEW)**
```
Your Plan: Free (Starter)
[Upgrade to Pro — $4.99/mo]
[Upgrade to Premium — $9.99/mo]

--- or if subscribed ---

Your Plan: Pro ($4.99/mo)
Next billing: April 15, 2026
Payment method: •••• 4242
[Upgrade to Premium]
[Cancel Subscription]
```

---

## 5. DESIGN SYSTEM STANDARDIZATION

### The Problem
Three separate color systems exist with no single source of truth:
- Mobile: `constants/colors.js` (primary)
- Web: `app-theme.css` (CSS custom properties)
- Admin: `shared.js` COLORS object (completely separate, uses cyan instead of blue for brand)

29+ hardcoded hex values in mobile components. Font families hardcoded instead of using constants. Spacing values inconsistent.

### The Fix

#### Step 1: New Constants Files

**`mobile/constants/badges.js`** (NEW)
```javascript
import { COLORS } from './colors';
import { FONTS, FONT_SIZES } from './fonts';
import { LAYOUT } from './layout';

export const BADGE_STYLES = {
  priceDrop: {
    container: {
      backgroundColor: COLORS.success,
      paddingHorizontal: LAYOUT.padding.sm,
      paddingVertical: LAYOUT.padding.xs,
      borderRadius: LAYOUT.radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: LAYOUT.padding.xs,
    },
    text: {
      color: COLORS.white,
      fontFamily: FONTS.body.semiBold,
      fontSize: FONT_SIZES.xs,
    },
    icon: { size: 10 },
  },
  verified: {
    color: COLORS.accent,
    icon: 'checkmark-circle',
    size: 16,
  },
  featured: {
    borderColor: '#FFD700', // gold — add to COLORS
    borderWidth: 2,
  },
  tierBadge: {
    pro: { backgroundColor: COLORS.accent, label: 'PRO' },
    premium: { backgroundColor: '#FFD700', label: 'PREMIUM' },
  },
};
```

**`mobile/constants/overlays.js`** (NEW)
```javascript
export const OVERLAYS = {
  dark: 'rgba(0,0,0,0.6)',
  darkHeavy: 'rgba(0,0,0,0.8)',
  navy: 'rgba(11,29,58,0.92)',
  light: 'rgba(255,255,255,0.2)',
  lightStrong: 'rgba(255,255,255,0.85)',
};
```

**`mobile/constants/tiers.js`** (NEW)
```javascript
export const TIERS = {
  free: {
    name: 'Starter',
    price: 0,
    maxListings: 1,
    features: ['1 listing', 'Basic stats', 'Nearby Rentals', 'In-app messaging'],
  },
  pro: {
    name: 'Pro',
    price: 499, // cents
    priceAnnual: 399, // cents/mo billed annually
    maxListings: 5,
    features: ['Up to 5 listings', 'Verified badge', 'Analytics', 'Priority placement', 'SMS alerts', 'Price drop push'],
  },
  premium: {
    name: 'Premium',
    price: 999, // cents
    priceAnnual: 799, // cents/mo billed annually
    maxListings: 999,
    features: ['Unlimited listings', 'Featured badge', 'Instant tenant push', 'Lead export', 'Custom branding', 'Priority support'],
  },
};
```

**Update `mobile/constants/colors.js`** — add missing colors:
```javascript
gold: '#FFD700',        // Premium tier badge
successGradient: ['#4ade80', '#22c55e', '#15803d'], // GlossyHeart
navyGradient: ['#0f2d4a', '#0a1e33'],               // NoPhotoPlaceholder
```

**Update `mobile/constants/layout.js`** — add missing dimensions:
```javascript
avatar: { sm: 36, md: 52, lg: 72 },
imageHeight: { card: 150, map: 90, gallery: 300 },
iconSize: { xs: 8, sm: 11, md: 16, lg: 24, xl: 36 },
badgeOffset: { sm: 6, md: 12 },
```

#### Step 2: Fix All Hardcoded Values

| Pattern | Replace With | Files Affected |
|---------|-------------|----------------|
| `'#22C55E'` | `COLORS.success` | SwipeCard, ListingCard, MessagesScreen |
| `'#fff'` / `'#FFFFFF'` | `COLORS.white` | Button, ProductCard, SwipeCard, ListingCard |
| `'#3B82F6'` | `COLORS.accent` | Badge, MessageBubble |
| `'DMSans-SemiBold'` | `FONTS.body.semiBold` | SwipeCard, ListingCard |
| `'DMSans-Bold'` | `FONTS.body.bold` | Various |
| `fontSize: 18` | `FONT_SIZES.lg` | AuthHeader |
| `width: 52, height: 52` | `LAYOUT.avatar.md` | ConversationItem |
| `height: 150` | `LAYOUT.imageHeight.card` | ListingCard |
| `top: 12, left: 12` | `LAYOUT.badgeOffset.md` | SwipeCard |
| `top: 6, left: 6` | `LAYOUT.badgeOffset.sm` | ListingCard |
| `rgba(0,0,0,0.6)` | `OVERLAYS.dark` | PriceEditModal, PhotoGallery |
| `rgba(11,29,58,0.92)` | `OVERLAYS.navy` | NearbyRentalsGate |

#### Step 3: Align Admin Brand Color
Update `app/admin/shared.js`:
```javascript
brand: "#3B82F6",  // was #22d3ee (cyan) — now matches app accent
```

#### Step 4: Design Tokens Reference
Create `mobile/constants/DESIGN_TOKENS.md` — documents all constants, values, and usage rules.

---

## 6. COMMUNICATIONS CONSENT INTEGRATION

### 4-Touchpoint Progressive Model

| # | Screen | Trigger | What's Captured |
|---|--------|---------|-----------------|
| 1 | **About You** | Role = owner selected | Email consent (default on), phone + SMS consent (optional) |
| 2 | **Wizard Step 7** | Creating first listing | Push notification permission, SMS reminder if not yet consented |
| 3 | **Messages Tab** | First visit, no conversations | Final push/SMS prompt with social proof |
| 4 | **Listings Tab** | Has listings but missing channels | Gentle "Never miss a lead" reminder card |

### Shared Component Architecture
```
NotificationPreferences.js (new shared component)
├── Props: { compact: boolean, showTCPA: boolean, context: string }
├── Reads from: useAuth() → profile.preferred_channel, sms_consent, expo_push_token
├── Writes to: /api/profiles/push-token, /api/profiles/sms-consent, /api/profiles (PATCH)
├── Renders: Push toggle, Email toggle, SMS toggle + TCPA text, preferred channel picker
└── Used by:
    ├── about-you.js (compact=true, context='onboarding')
    ├── owner/create.js Step 7 (compact=true, context='wizard')
    ├── MessagesScreen.js empty state (compact=true, context='messages')
    └── settings/notifications.js (compact=false, context='settings')
```

### TCPA Compliance Checklist
- ☑ Affirmative checkbox (never pre-checked for SMS)
- ☑ Visible disclosure text adjacent to checkbox
- ☑ Timestamp + IP recorded in profiles table
- ☑ "Reply STOP to unsubscribe" in every outbound SMS (in `lib/sms.js`)
- ☑ Opt-out honored immediately via Twilio webhook

---

## 7. SALES PAGE & ADMIN PREVIEW SYSTEM

### Architecture (Three Layers)

**Layer 1: Config-Driven Content**
All sales/marketing content stored in `site_config`:
- `owner_empty_state` — Listings tab empty state content
- `owner_upgrade_page` — Tier comparison/pricing page content
- `owner_post_activation` — Post-activation celebration + upsell
- `market_stats` — South Florida market statistics (updateable)
- `owner_explore_tab` — Explore tab content blocks

Each key stores JSON with headline, bullets, CTA text, etc. Mobile fetches on mount, falls back to hardcoded defaults.

**Layer 2: Admin Preview Mode**
```javascript
const { preview } = useLocalSearchParams();
const { profile } = useAuth();
const isAdminPreview = preview === 'true'
  && ['admin', 'super_admin'].includes(profile?.role);

if (hasActiveListing && !isAdminPreview) {
  return <Redirect href="/(owner)/listings" />;
}
```

**Layer 3: Admin Dashboard Editor**
New panel: **"Sales Pages"** in admin nav. Lists all `owner_*` and `market_stats` config keys. Inline JSON editor with preview rendering. "Preview on Device" deep link button. Reuses TemplateEditorPanel pattern.

**Layer 4: Flow Reset (Testing)**
"Reset Owner Flow" button in admin Overview panel for test accounts.

---

## 8. NEARBY RENTALS AS VALUE PROP

### Strategic Position: FREE for All Tiers

**Rationale (backed by research):**
- Every competitor offers comp tools for free (Zillow, Apartments.com, TurboTenant, Avail)
- It's a lead-gen hook — gets owners invested before they list
- Miami #1 hottest rental market (RentCafe 2025), 19 renters per vacancy
- Mispricing cost: One vacant month = 8-10% annual income loss (~$2,000 at typical S. Florida rents)

### Value Prop Copy

> **See what you're up against — instantly.** One tap shows you every competing rental within 5 miles, with real asking prices, photos, and features.

> **Price it right the first time.** Overpriced rentals sit empty — and every vacant month costs you 8-10% of your annual income.

> **Know your market in 30 seconds, not 30 minutes.** PadMagnet pulls live MLS data on comparable rentals near your property — beds, baths, price, days on market — all in one screen.

> **Lease faster in a shifting market.** South Florida has 19 renters competing for every vacant unit — but only if your price is right.

### Changes Needed
1. Remove paywall gate from NearbyRentalsGate.js — make free for all tiers
2. Add value-prop header to nearby-rentals screen with market stats
3. Move to Explore tab as primary entry point
4. Add Premium upsell at bottom: "Want deeper insights? [Upgrade to Premium]"

### Premium Tier Enhancement
While Nearby Rentals is free, Premium adds:
- PadScore comparison — see how your listing scores vs nearby average
- Competitive insights badge on listing analytics

---

## 9. SOCIAL PROOF STRATEGY (FTC-COMPLIANT)

### Why No Fabricated Testimonials
FTC Consumer Reviews and Testimonials Rule (effective October 21, 2024):
- Prohibits creating reviews by someone who does not exist
- Penalties: $50,000+ per violation
- First enforcement letters sent December 2025

### What We Use Instead

#### Tier 1: Fact-Based Social Proof (Launch Day)
- "11,400+ verified rental listings"
- "Covers Fort Pierce to Miami — 5 counties"
- "Updated daily from the MLS"
- "Free to list — no broker fees"

#### Tier 2: Market Stats (Launch Day)
- "Miami ranked #1 hottest rental market in the US" — RentCafe, 2025
- "19 renters compete for every vacant unit in Miami" — RentCafe, 2025
- "96.4% occupancy rate in South Florida" — RealPage, 2025

#### Tier 3: Founder Vision (Launch Day)
- "I built PadMagnet because finding a rental in South Florida shouldn't feel like a second job — and listing one shouldn't cost $40." — Chris, Founder

#### Tier 4: Beta Tester Quotes (Pre-Launch)
Action: Give app to 5-10 real people. Collect genuine one-line quotes with first name + area.

#### Tier 5: In-App Review Collection (Post-Launch)
After 3 successful conversations → prompt for rating → collect quote if 5-star.

### Research Sources
- RentCafe Rental Competitiveness Index 2025
- RealPage Miami Occupancy May 2025
- South Florida Agent Magazine
- Florida Landlord Association 2026 Market Outlook
- Hampton REA Florida Rental Market Q2 2025

---

## 10. METRICS DASHBOARD INTEGRATION

### Merge into Overview Panel

**Rename**: "Overview" → "Metrics & Overview"

Add sections:
```
── Platform Health ──
[Active Listings] [Owner Signups] [Tenant Signups] [Bridge Sync] [Feed Health]

── Conversion Funnel ──
Owners registered → Listings created (draft) → Listings activated → Pro upgrades → Premium upgrades

── Engagement ──
Total swipes (7d) • Right swipe rate • Conversations started • Messages sent (7d) • Avg response time

── Revenue ──
MRR • Pro subscribers • Premium subscribers • Churn rate (30d)

── Recent Activity ──
[existing sync logs + owner signup feed]
```

New endpoint: `/api/admin/metrics` — aggregates from profiles, listings, swipes, conversations, messages tables.

---

## 11. TECHNICAL ARCHITECTURE

### New Database Requirements

**Migration 039: Subscription & Tier System**
```sql
-- Tier columns on profiles
ALTER TABLE profiles ADD COLUMN tier TEXT NOT NULL DEFAULT 'free'
  CHECK (tier IN ('free', 'pro', 'premium'));
ALTER TABLE profiles ADD COLUMN tier_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN tier_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN stripe_subscription_id TEXT;

-- Listing limits enforcement trigger
CREATE OR REPLACE FUNCTION check_listing_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM listings WHERE owner_id = NEW.owner_id AND status = 'active';

  SELECT CASE
    WHEN p.tier = 'free' THEN 1
    WHEN p.tier = 'pro' THEN 5
    WHEN p.tier = 'premium' THEN 999
  END INTO max_allowed
  FROM profiles p WHERE p.id = NEW.owner_id;

  IF active_count >= max_allowed AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Listing limit reached for your plan.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_listing_limit
  BEFORE INSERT ON listings FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION check_listing_limit();

-- Testimonials table (for future real reviews)
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  quote TEXT NOT NULL,
  display_name TEXT NOT NULL,
  location TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Listing analytics view
CREATE VIEW listing_analytics AS
SELECT
  l.id AS listing_id, l.owner_id,
  COUNT(DISTINCT lv.user_id) AS unique_views,
  COUNT(DISTINCT CASE WHEN s.direction = 'right' THEN s.user_id END) AS right_swipes,
  COUNT(DISTINCT CASE WHEN s.direction = 'left' THEN s.user_id END) AS left_swipes,
  COUNT(DISTINCT c.id) AS conversations,
  ROUND(
    COUNT(DISTINCT CASE WHEN s.direction = 'right' THEN s.user_id END)::numeric /
    NULLIF(COUNT(DISTINCT s.user_id), 0) * 100, 1
  ) AS save_rate
FROM listings l
LEFT JOIN listing_views lv ON lv.listing_id = l.id
LEFT JOIN swipes s ON s.listing_id = l.id
LEFT JOIN conversations c ON c.listing_id = l.id
WHERE l.source = 'owner'
GROUP BY l.id, l.owner_id;
```

### New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/owner/subscription` | GET | Current tier + billing info |
| `/api/owner/subscription/upgrade` | POST | Initiate Stripe checkout |
| `/api/owner/subscription/cancel` | POST | Cancel subscription |
| `/api/owner/analytics/[id]` | GET | Listing performance stats (Pro+) |
| `/api/admin/metrics` | GET | Aggregated platform metrics |
| `/api/admin/sales-pages` | GET, PATCH | Sales page content CRUD |

### New Mobile Files

| File | Purpose |
|------|---------|
| `components/owner/NotificationPreferences.js` | Shared consent component (4 touchpoints) |
| `components/owner/TierBadge.js` | Verified/Featured badge |
| `components/owner/UpgradeCTA.js` | Reusable upgrade prompt card |
| `components/owner/MarketStats.js` | Market snapshot card (config-driven) |
| `app/owner/upgrade.js` | Tier comparison + payment screen |
| `app/owner/analytics.js` | Listing performance dashboard |
| `app/owner/post-activation.js` | Celebration + soft upsell |
| `app/settings/subscription.js` | Subscription management |
| `hooks/useSubscription.js` | Tier status + feature gating |
| `constants/badges.js` | Badge style constants |
| `constants/overlays.js` | Overlay transparency constants |
| `constants/tiers.js` | Tier definitions, limits, feature flags |

### Feature Gating Hook
```javascript
// mobile/hooks/useSubscription.js
export function useSubscription() {
  const { profile } = useAuth();
  const tier = profile?.tier || 'free';
  return {
    tier,
    isPro: tier === 'pro' || tier === 'premium',
    isPremium: tier === 'premium',
    maxListings: tier === 'free' ? 1 : tier === 'pro' ? 5 : 999,
    canViewAnalytics: tier !== 'free',
    canExportLeads: tier === 'premium',
    canCustomBrand: tier === 'premium',
    canInstantPush: tier === 'premium',
    hasBadge: tier !== 'free',
    badgeType: tier === 'premium' ? 'featured' : tier === 'pro' ? 'verified' : null,
  };
}
```

### Navigation Map
```
app/
├── (auth)/          — Auth flow (no change)
├── (tenant)/        — Tenant tabs (no change)
├── (owner)/
│   ├── _layout.js   — Tabs: Listings | Explore | Messages | Profile
│   ├── listings.js  — Owner listings (empty state = sales page)
│   ├── explore.js   — RENAMED from services.js
│   ├── messages.js  — Messages (consent touchpoint #3)
│   └── profile.js   — Profile + subscription status
├── owner/
│   ├── create.js    — 8-step wizard (consent at step 7)
│   ├── edit.js      — Edit listing
│   ├── preview.js   — Preview + activate
│   ├── post-activation.js — NEW
│   ├── upgrade.js   — NEW
│   ├── analytics.js — NEW (Pro+)
│   └── nearby-rentals.js — Free, no gate
├── settings/
│   ├── edit-profile.js
│   ├── notifications.js  — Shared NotificationPreferences
│   ├── subscription.js   — NEW
│   └── preferences.js    — Tenant only
├── listing/[id].js
└── conversation/[id].js
```

---

## 12. CLEANUP MANIFEST

### Files to Archive
```
mobile/components/listing/DynamicField.js    → DELETE (never imported)
mobile/app/(auth)/verify.js                  → mobile/app/_archived/verify.js
mobile/app/owner/relist.js                   → mobile/app/_archived/relist.js
mobile/app/settings/verification.js          → mobile/app/_archived/verification.js
app/admin/panels/FeedsPanel.js               → app/admin/_archived/FeedsPanel.js
app/admin/demo-data.js                       → app/admin/_archived/demo-data.js
docs/communications-plan-v4.md               → DELETE
```

### Files to Rename
```
mobile/app/(owner)/services.js               → mobile/app/(owner)/explore.js
```

### Files to Modify (remove dead imports)
```
mobile/app/(owner)/_layout.js                — Remove Services tab, add Explore tab
mobile/components/listing/index.js           — Remove DynamicField export
app/admin/page.js (dashboard.js)             — Remove FeedsPanel import + nav item
```

### Admin Nav (19 items)
```
Metrics & Overview (renamed)     Sales Pages (NEW — replaces Feeds)
Waitlist                         Products
PadScore                         Billing (Coming Soon badge)
Listings                         Tenants
Display Fields                   Owners
Disclaimers                      Administrators
Support                          Audit Log
Messaging                        Backlog
Webhook Log
Templates
```

---

## 13. ROLLOUT ROADMAP

### Phase 0.5: Security & Zero-Rekey (COMPLETE — 2026-03-16)
- [x] Sanitize message body + flag external URLs
- [x] Sanitize listing text fields (public_remarks, agent_name, etc.)
- [x] Add config key whitelist to admin config endpoint
- [x] Add security headers (CSP, HSTS, X-Frame-Options, etc.)
- [x] Migrate mobile auth tokens to expo-secure-store
- [x] Fix phone prefill on listing creation (zero-rekey)
- [x] Add timing-safe cron secret comparison (all 4 routes)
- [x] Add owner role verification to owner listing routes
- [x] Verify Next.js version patched for CVE-2025-29927 (14.2.35 — patched)
- [x] Verify Google Places autocomplete already integrated
- [x] Audit all data points for zero-rekey violations (1 found, fixed)

### Phase 1: Foundation (Week 1-2)
- [x] Archive dead files (DynamicField deleted, verify/relist/verification/FeedsPanel/demo-data archived)
- [x] Create new constants files (badges.js, tiers.js — overlays merged into colors.js)
- [x] Fix all hardcoded colors/fonts/spacing → constants (~60 violations fixed)
- [x] Align admin brand color (#22d3ee → #3B82F6)
- [x] Create NotificationPreferences shared component (compact + full modes, 4 touchpoints)
- [x] Create useSubscription hook (reads tier from profiles, returns feature flags)
- [x] Create TierBadge, UpgradeCTA, MarketStats components
- [x] Run migration 039 (tier columns, listing limit trigger, testimonials, listing_analytics view)
- [ ] EAS Build to verify

### Phase 2: Owner Flow Redesign (Week 3-4)
- [x] Rename Services → Explore tab (Nearby Rentals + MarketStats + UpgradeCTA)
- [x] Build Listings tab empty state (sales page with value props + competitor comparison)
- [x] Build upgrade screen (3-tier comparison: Free/Pro/Premium)
- [x] Build post-activation celebration screen (confirmation + soft upsell)
- [x] Remove NearbyRentalsGate paywall (free for all tiers)
- [x] Add consent touchpoints (About You #1, Wizard Step 7 #2 — Messages #3 and Listings #4 deferred to integration)
- [x] Update Welcome screen with social proof (stats bar + trust badge + founder quote)
- [x] Add wizard micro-copy (8 step-specific subtitles in StepProgress)
- [ ] Store content in site_config (admin-editable sales pages — deferred to Phase 3 with Sales Pages panel)
- [ ] EAS Build + full flow test

### Phase 3: Admin & Analytics (Week 5-6)
- [ ] Rename Overview → Metrics & Overview
- [ ] Build /api/admin/metrics
- [ ] Build Sales Pages admin panel
- [ ] Build admin preview mode
- [ ] Build listing analytics screen (Pro+)
- [ ] Build /api/owner/analytics/[id]
- [ ] Add subscription management to Settings
- [ ] Add tier badges to listing cards
- [ ] Brand Supabase Auth emails OR override with Resend (signup confirm, reset password, magic link, email change)
- [ ] EAS Build + admin testing

### Phase 4: Stripe & Go-Live (Week 7-8)
- [ ] Connect Stripe
- [ ] Build checkout flow
- [ ] Build subscription management
- [ ] Add "Founding Owner" pricing logic
- [ ] Recruit 5-10 beta testers
- [ ] Final content review
- [ ] Production EAS build
- [ ] Launch with "everything free" founding period

### Phase 5: Optimization (Week 9+)
- [ ] Replace market stats with real app data
- [ ] Replace beta quotes with real testimonials
- [ ] A/B test framework
- [ ] Test pricing display variations
- [ ] Conversion funnel tracking

---

## 14. SECURITY, ZERO-REKEY & GOOGLE API

> Added 2026-03-16. Three cross-cutting concerns that apply across all phases.

### 14.1 Zero-Rekey Principle

**Rule**: If PadMagnet collects a data point, it must be reused everywhere that data appears — users never retype anything the app already knows.

**Audit Results (2026-03-16)**:

| Data Point | First Collected | Stored In | Prefilled Where | Status |
|---|---|---|---|---|
| Email | Registration (Supabase Auth) | `auth.users.email` + `profiles.email` | Edit Profile, Listing Step 6, Messages | WORKING |
| First/Last Name | About You screen | `auth.user_metadata` + `profiles.display_name` | Profile Card, Edit Profile, Listing Step 6 (agent name), Swipe greeting | WORKING |
| Phone | Edit Profile or Listing Step 6 | `profiles.phone` + `listings.listing_agent_phone` | Listing Step 6 (from profile) | FIXED 2026-03-16 |
| Address | Listing Step 0 (Google Places) | `listings.*` address fields | Edit Listing, Nearby Rentals (lat/lng) | WORKING |
| Location/Zones | Tenant Onboarding Step 3 | `tenant_preferences.preferred_cities` | Preferences screen, PadScore calc | WORKING |
| Budget/Prefs | Tenant Onboarding Steps 1-5 | `tenant_preferences.*` + AsyncStorage | Preferences screen (auto-loaded) | WORKING |

**Remaining for freemium plan**:
- About You screen (Section 4, Screen 5): Email field must be pre-filled from auth
- Owner Explore tab: Default Nearby Rentals location should use owner's most recent listing address
- NotificationPreferences component: Must pre-fill all existing consent/channel data from profile

### 14.2 Google API Integration

**Current state**: Google Places autocomplete is **already fully integrated** for address entry.

- `mobile/components/owner/AddressAutocomplete.js` — Google Places autocomplete UI
- `/api/places/autocomplete` — Backend proxy (no API key exposed to client)
- `/api/places/details` — Fetches structured address components
- `/lib/geocode.js` — Server-side geocoding for lat/lng on listing save
- Google Maps key: Android-restricted for Maps SDK, server key unrestricted for Geocoding + Places

**No additional Google API work needed** for the freemium plan. Address autocomplete covers the only address entry point in the app.

**TODO (not blocking)**:
- SHA-1 restriction on production Google Maps key
- GCP budget alert setup

### 14.3 Security Hardening (Phase 0.5)

Completed alongside plan approval. These fixes run in the background of Phase 1 — no schedule impact.

#### COMPLETED (2026-03-16)

| # | Fix | Severity | Files Changed |
|---|-----|----------|---------------|
| 1 | Admin auth on all 14 routes | CRITICAL | `lib/admin-auth.js` + all `/api/admin/*` routes |
| 2 | SQL injection in listings query | CRITICAL | `/api/listings/route.js` |
| 3 | CRON_SECRET hard-fail if unset | CRITICAL | All 4 cron routes |
| 4 | SecureStore for JWT tokens | CRITICAL | `mobile/lib/supabase.js` (requires EAS build) |
| 5 | Message body sanitization + URL flagging | HIGH | `/api/messages/route.js` |
| 6 | Listing text field sanitization | HIGH | `/api/owner/listings/route.js` + `[id]/route.js` |
| 7 | Config key whitelist (10 keys) | HIGH | `/api/admin/config/route.js` |
| 8 | Security headers (CSP, HSTS, X-Frame, etc.) | HIGH | `next.config.js` |
| 9 | Timing-safe cron secret comparison | MEDIUM | All 4 cron routes (`crypto.timingSafeEqual`) |
| 10 | Owner role verification | HIGH | `/api/owner/listings/route.js` |
| 11 | Photo upload path validation | HIGH | `/api/owner/photos/route.js` |
| 12 | Phone prefill on listing creation | ZERO-REKEY | `mobile/app/owner/create.js` |

#### REMAINING (before app store launch)

| # | Item | Priority | When |
|---|------|----------|------|
| 1 | Rate limiting (Upstash Redis) | HIGH | Phase 3 or before public launch |
| 2 | Privacy policy page | BLOCKING | Before App Store submission |
| 3 | Delete account flow | BLOCKING | Before App Store submission |
| 4 | RLS role immutability verification | MEDIUM | Phase 1 (during migration 039) |

#### REMAINING (before Stripe integration — Phase 4)

| # | Item | Why |
|---|------|-----|
| 1 | Never accept prices from client | Use `stripe_price_id` from products table only |
| 2 | Never fulfill from redirect URL | Only grant access on `checkout.session.completed` webhook |
| 3 | Webhook idempotency | Deduplicate events by `event.id` in `webhook_logs` |
| 4 | Metadata ownership validation | Cross-check `owner_user_id` from webhook against listing ownership |

#### DEFERRED (post-launch)

- Certificate pinning on mobile
- MFA support (Supabase TOTP)
- MIME type magic-byte verification on uploads
- CSRF protection on admin mutations
- Bridge API token move to Authorization header
- External agent email domain verification
- Cloudflare Turnstile on web login

### 14.4 Stripe Security Architecture

When Stripe is integrated in Phase 4, these rules are non-negotiable:

1. **PCI SAQ-A compliance** — Use Stripe Checkout or Elements only. Never build a custom card form.
2. **Server-side pricing** — Create Checkout Sessions using `stripe_price_id` from the `products` table. Never accept `price_cents` from the client.
3. **Webhook-driven fulfillment** — Tier upgrades happen ONLY when `checkout.session.completed` webhook fires, not on redirect.
4. **Signature verification** — `stripe.webhooks.constructEvent()` with raw body (`request.text()`).
5. **Timing-safe secrets** — `crypto.timingSafeEqual()` for all secret comparisons.
6. **Event deduplication** — Track processed `event.id` in `webhook_logs` table (pattern already exists for Twilio/Resend).
7. **Secret rotation** — Rotate webhook signing secrets every 90 days.

### 14.5 Pre-App-Store Checklist

Required by Apple App Store and Google Play before submission:

- [ ] **Privacy policy** — Hosted page disclosing: data collected, purpose, third parties (Supabase, Stripe, Twilio, Resend, Google Maps), retention period, deletion process
- [ ] **Delete account flow** — In-app Settings → "Delete My Account" that purges PII from profiles, anonymizes messages, deactivates listings
- [ ] **TCPA consent records** — Verify `sms_consent_timestamp` + `sms_consent_ip` are recorded on every SMS opt-in (schema exists, verify recording)
- [ ] **Age verification** — Checkbox or age gate at signup (if required by store guidelines)
- [ ] **EAS production build** — With SecureStore, all env vars set via `eas env:create`
