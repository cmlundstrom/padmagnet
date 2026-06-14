# PadMagnet Leasing Brokerage — Build Plan & Handoff

**Created**: 2026-05-30. **Status**: Planning complete; implementation not started.
**Origin**: Strategy + brokerage-structure worked out in a separate (floridapm.net) planning session. This doc is the **self-contained handoff** so implementation can begin here in the padmagnet repo without needing that session's context.

> **Gate**: No brokerage activity (representation, placement fees, leases) may go live until **PadMagnet LLC's real-estate brokerage license (CQ) is issued & Active** (application submitted 2026-05-30; number pending). Until then PadMagnet is **media/ads only**. **The license-pending window is the build window** — build everything now, flip on the day the CQ posts.

---

## 1. What we're building (concept)

Evolve PadMagnet from a **rental-ad/media platform** into a **licensed, automated tenant-placement (leasing-only) brokerage** for **Martin County, FL** annual unfurnished rentals — operated by the new **PadMagnet LLC** brokerage, as a transactional sub-brand of the SFRM family.

**The market insight:** The MLS shows ~28 active Martin County leases (only 1 is SFRM's). The real prize is the **~70+ owners who self-manage** — advertising on yard signs / Facebook Marketplace / low-volume channels, **not in the MLS, not in PadMagnet**. They want a tenant, **not** management. This is a two-sided marketplace:

- **Supply** = those 70+ DIY owners → we offer **listing-only placement**: syndicate the listing, drop a self-show lockbox, screen, lease, collect a fee. No management contract.
- **Demand** = renters → free, fast, with access to inventory that isn't on Zillow.
- **Closed loop**: control exclusive supply → win demand for free → successful owners **upsell to SFRM full management**.

**The governing constraint:** showings must be **zero-human-field-time** (ShowMojo self-show lockboxes) or the unit economics collapse to a loss leader. Only allowed field touch = **one-time lockbox install + photos per new listing**, never per showing. 20 years of dead FUB tenant leads (millions in lost revenue) are only recoverable if placement is fully automated.

---

## 2. Decisions locked (do not relitigate without Chris)

| Topic | Decision |
|---|---|
| Tenant fee | **Free.** Monetize owner-side only. |
| Owner fee | **One month's rent, owner-paid, SUCCESS-ONLY** (only when we place a tenant). |
| Lease instrument | **FAR/BAR standard lease.** SFRM proprietary lease reserved for management clients. |
| Showings | **ShowMojo self-show lockbox**, unfurnished annual only. **No furnished/short-term.** |
| Owner acquisition | **Inbound only.** No AI outbound calling (Alex not ready). Email outreach impractical (target owners hide email behind platform relays). |
| The other ~27 MLS listings | **Harvest, don't chase.** Show them as demand-proof; when a tenant self-selects one, opportunistically co-broke / tenant-rep. No prospecting. |
| Brokerage entity | **PadMagnet LLC** = its own licensed brokerage (CQ pending). Max reputation isolation; owns IP; sellable. |
| IDX data | **Stays under Lundstrom & Co (CQ1044866)** — no migration, no new MLS membership fees. Media layer = Lundstrom's IDX; brokerage layer = PadMagnet LLC's service. |
| Management upsell | **Referral** PadMagnet LLC → Joe's Real Estate Inc. (SFRM, CQ1034704). |

---

## 3. Brokerage / entity structure (summary)

Full compliance detail: companion doc *"PadMagnet Leasing — Brokerage Structure & Compliance"* (in the floridapm.net planning folder; have Chris provide if needed). Summary for builders:

```
Christopher Lundstrom — broker of record, all three:

SFPM, INC ........ CQ1044866 · d/b/a Lundstrom & Company · SALES + hosts the IDX/Bridge feed
JOE'S RE, INC. ... CQ1034704 · d/b/a South Florida Realty Mgmt (floridapm.net) · MANAGEMENT (upsell target) · renews 2026-09-30 ⚠️
PADMAGNET LLC .... L26000140391 · CQ pending · LEASING + the app · owns IP
```

**What this means for the code:**
- **IDX listings displayed in the app remain attributed to Lundstrom & Co** (the MLS participant). Do not represent MLS/IDX data as PadMagnet LLC's.
- **Leasing-service surfaces** (owner intake, placement forms, leases, fee flows) are **PadMagnet LLC** brokerage activity and must carry **PadMagnet LLC's** name + CQ.
- **Dual-entity disclosure is mandatory** (see §6).

---

## 4. Existing tech stack to integrate with

| System | Role | Integration status |
|---|---|---|
| **PadMagnet** (this repo) | Listing data (Bridge/IDX), tenant app, web. **Source of listing truth + demand engine.** | — |
| **ShowMojo** | Listing syndication (50+ sites incl. Zillow/Trulia/HotPads/Apartments.com/Realtor.com) + **self-show lockboxes** (MojoLock/CodeBox/VaultLOCKS) + auto-screening + one-time access codes. Subscriber already. | **New listings entered directly in ShowMojo** (manual add path; no PMS integration needed). Leads flow back. |
| **Buildium** | Property MANAGEMENT system (SFRM managed clients). | **NOT used for leasing-only listings** — these are explicitly non-management. Only relevant post-upsell. |
| **Follow Up Boss (FUB)** | Lead hub; captures syndicated ad leads (Zillow/HotPads/Trulia). | **PadMagnet has NO FUB integration today — needs building** (see §5). |
| **Bridge Interactive** | MLS/IDX data feed (dataset `miamire`), under Lundstrom's participation. | Existing; daily sync `app/api/bridge/sync`, 07:00 UTC. **Unchanged.** |
| **Alex (MyAIFrontDesk)** | 24/7 phone receptionist for SFRM. | Can intake inbound owner/tenant calls. Not used for outbound. |

**Key confirmed fact**: ShowMojo supports **directly adding a listing** (manual, no integration) and syndicating it + running self-show lockbox tours. So the per-listing workflow is: sign owner → create listing in ShowMojo → syndicate → self-show → screen → FAR/BAR lease → fee. PadMagnet/floridapm.net surfaces the listing and captures leads.

---

## 5. Build scope

Sized as "a couple of pages + plumbing," not a rebuild. Phased.

### Phase 0 — Pre-license (build now, during CQ-pending window)
- **Leasing landing/marketing pages** on padmagnet.com (owner-facing + tenant-facing):
  - Owner: *"Renting your Martin County home yourself? We have screened tenants ready. Pay one month's rent — only when we place one. No management contract."* → inbound call/contact CTA.
  - Tenant: *"Homes not on Zillow. Keys in days."* → free signup/lead capture.
- **Dual-entity disclosure** components (reusable) — see §6.
- **Owner listing-intake form** (lead → us; not yet a transaction).
- **Lead capture → FUB** routing (design + build; PadMagnet has no FUB integration today — likely Zapier/Make or a thin API webhook). This is the single most important plumbing item.
- Privacy/terms updates naming **PadMagnet LLC** + lead-capture + SMS opt-in.
- Build but **gate behind a feature flag**; do not present as brokerage until CQ Active.

### Phase 1 — At CQ issuance (flip live)
- Turn on brokerage-service presentation (remove media-only framing; show PadMagnet LLC CQ#).
- **Listing-only (placement) agreement** e-sign flow (owner) — access terms, insurance, success-only fee, explicitly non-management scope.
- **FAR/BAR lease** e-sign flow + required disclosures (lead paint pre-1978, radon, etc.).
- **ShowMojo handoff**: workflow/checklist for creating the listing in ShowMojo on owner signup (may stay manual initially; automate later).
- **Owner-set, uniform screening criteria** capture (Fair Housing — applied uniformly).
- **Fee collection** via Stripe (already live in repo) — billed by PadMagnet LLC, success-only. **Deposits must go owner-direct — brokerage never holds them** (avoids trust-account obligation).
- **Upsell → SFRM**: referral capture / handoff for owners who want full management.

### Phase 2 — Automation depth
- Automate ShowMojo listing creation from PadMagnet listing data (API/CSV).
- Tenant ↔ inventory matching surfaced in app.
- "Harvest the 27" flow: when a tenant self-selects an other-broker MLS listing, one-tap transaction-broker agreement + co-broke/tenant-fee path.
- Inbound owner-acquisition engine (the unsolved hinge — see §7).

### Data model needs
- **`leads` table** (does not exist) — schema, RLS, source attribution (`source`, `referrer_listing_id`, `utm_*`), status, assigned agent. Admin view.
- **Owner / placement-listing** records distinct from MLS `listings` and from managed (Buildium) properties.
- Reuse existing `listings` (Bridge/IDX) for the demand-magnet display only.

---

## 6. Compliance requirements that touch the code

- 🔴 **Brokerage name + CQ on every brokerage-service surface** (FREC 61J2-10.025). Consumer brand alone is non-compliant.
- 🔴 **Dual-entity disclosure** — separate media from service:
  - IDX listings: *"Listing data via IDX through Lundstrom & Company (Lic. CQ1044866), MLS participant. Listing courtesy of [listing broker]."*
  - Leasing service/forms/leases: *"Leasing brokerage services provided by PadMagnet LLC, Licensed Florida Real Estate Brokerage (Lic. CQ#)."*
- 🔴 **Transaction-broker** posture (FL default). Keep both sides transaction-broker; avoid single-agent-both-sides if SFRM also manages the property.
- 🔴 **Fair Housing**: screening criteria owner-set, applied **uniformly**, documented. Critical in automated screening.
- 🔴 **Deposits owner-direct**; brokerage never touches them.
- **Self-show liability**: placement agreement covers access + owner's homeowner insurance; evaluate ShowMojo self-show insurance. Unfurnished annual only.
- Feature-flag all brokerage presentation until CQ Active.

---

## 7. Open items / unsolved

1. **CQ number** — fill in when PadMagnet LLC's license issues. Hard gate for go-live.
2. **Inbound owner-acquisition mechanism** (the one genuinely unsolved strategic hinge): how the 70+ self-managing owners first hear "we have your tenant," outbound being off the table. Candidate channels: SFRM presence in local FB groups; pain-moment SEO/content ("screen a tenant in Florida," "find a renter for my house Stuart"); the "we have your tenant" landing offer; yard-sign social proof. Needs a concrete plan + likely Phase-2 tooling.
3. **FUB integration** — design + build (Zapier/Make/native). Highest-priority plumbing.
4. **IDX co-site display clause** — Chris to confirm Miami Realtors IDX / Bridge rules permit a display site that also advertises a separate (commonly-owned) brokerage. Not a code blocker; affects disclosure.
5. **ShowMojo listing-creation automation** — manual to start; automate in Phase 2.

---

## 8. Renewal watch
- **CQ1034704 (Joe's/SFRM) renews 2026-09-30** — the upsell target; do not let lapse near launch.
- CQ1044866 (SFPM/Lundstrom, IDX host) renews 2027-03-31.

---

## 9. Project-boundary note
This handoff lives in the padmagnet repo because **implementation belongs here**. The strategy/compliance planning docs live in the floridapm.net Dropbox planning folder (separate, docs-only project). Keep brokerage *operations* under PadMagnet LLC; keep MLS/IDX *display* attributed to Lundstrom; refer management upsells to SFRM. Don't blur the three entities in code or copy.
