# PadMagnet — Safe Shutdown Runbook

**Created:** 2026-06-17
**Author:** Claude (Magnolia bridge), for Chris Lundstrom
**Status:** DRAFT — decision not yet made. This is a plan, not an executed action.

> **2026-07-22 — SHUTDOWN GREEN-LIT (Chris).** Decision made: close the project down tightly —
> stop it serving anything, make all services/APIs safe, kill the operational charges, and
> archive everything so it *can* be revived someday (revival optional, not planned). First
> teardown action executed same day: both xAI keys deleted at console.x.ai (see Stage 3 ✅).
> This runbook is now the live execution tracker — check items off as they complete.

> **2026-07-13 — DORMANT, not shut down.** PadMagnet is now marked **dormant** in Watchtower
> (project-scope `rest` mute → the card reads "Resting", its 9 connections are excluded from
> the hero totals and from alerting). Dormant ≠ shutdown: **no stage below has been executed**,
> the v1.0.1 build stays on the Play Open-testing track, and every credential stays live.
> To wake the project: clear the rest mute at `/admin/watchtower`, and wire the canary pull
> (see the note on §"Upstash" below — PadMagnet ships `/api/canary` but sfrm-tools has no
> `padmagnet/*` probe, so nothing is actually being watched today).

> **Golden rule:** Every stage below is ordered so nothing is irreversible until the
> very end, and so **tools.floridapm.net is fully cut loose from PadMagnet BEFORE any
> teardown begins.** Do the stages in order. Do not skip Stage 0.

---

## Why this is safe (the separation audit, 2026-06-17)

PadMagnet and tools.floridapm.net were built deliberately isolated. Verified:

| Layer | PadMagnet | tools.floridapm.net | Shared? |
|---|---|---|---|
| Database | Supabase `darizrcswflrpyvtldii` | Supabase `ckrymxaauostzeaticat` | **No — separate projects** |
| Hosting | Vercel project `padmagnet` | Vercel project `sfrm-tools` | **No** |
| Repo | `cmlundstrom/padmagnet` | `cmlundstrom/floridapm-tools` | **No** |
| Google/GCP keys | own geocoding keys | own GCP project + own keys | **No (already split)** |
| Runtime calls | — | never calls PadMagnet | **No — zero cross-calls** |

The tools repo only *mentions* PadMagnet in docs and code comments ("faithful port of the
v2 rent-range engine"). That is copied logic, not a live link. When PadMagnet goes dark,
tools keeps running untouched.

### The ONLY shared things — third-party accounts (NOT a PadMagnet service)

Both apps hold the **same values** for:

1. **Bridge Interactive MLS feed** — `BRIDGE_SERVER_TOKEN` + dataset `miamire`. This feeds
   tools' `rental_comps` sync AND the live **Active Rentals** tool. This token is the last
   shared thread.
2. **Brave Search API key** — feeds the rent-range web/supplemental-comps pipeline.

These live at Bridge and Brave, not inside PadMagnet. Deleting PadMagnet code/Vercel/DB does
**not** revoke them. The danger is only if the shutdown *also* cancels or rotates those
outside accounts. **Stage 0 removes that danger before anything else happens.**

---

## STAGE 0 — Cut the last shared thread (DO THIS FIRST)

Goal: tools.floridapm.net runs on its **own** Bridge + Brave credentials, so nothing about
PadMagnet's teardown can touch it.

- [x] **Bridge MLS:** In the Bridge Interactive developer console, mint a **second/separate
      server token** (or a separate application) for tools.floridapm.net.
      **✅ RESOLVED DIFFERENTLY 2026-07-22 — no second token minted, deliberately.** The runbook
      assumed a LIVE PadMagnet sharing the token; by execution day PadMagnet was already dark
      (shutter + crons dead), making sfrm-tools the SOLE consumer. A new Bridge application could
      trigger MLS data-access re-approval friction for zero benefit. Instead, the sharing itself
      was eliminated: **all 5 stale `BRIDGE_*` env vars deleted from the padmagnet Vercel project
      via API (read-back: none remain)**; padmagnet has no local `.env.local` (lifted to 1PW
      2026-06-28, only the .op-pointers file remains). Bridge stays on DO-NOT-TOUCH forever —
      brokerage-MLS-tied. 1PW `Dev-Shared/Bridge-IDX` note updated to sole-consumer.
- [x] **Brave Search:** same treatment — **✅ stale `BRAVE_API_KEY` deleted from padmagnet Vercel
      env 2026-07-22; sfrm-tools is sole consumer; account on DO-NOT-TOUCH. 1PW note updated.**
- [x] Verify tools.floridapm.net end-to-end one more time. **✅ 2026-07-22 — live probes with the
      1PW credentials: Bridge OData query returned a listing (HTTP 200), Brave search HTTP 200.
      Tools shares no credential with any live PadMagnet surface. STAGE 0 COMPLETE.**

---

## STAGE 1 — Reversible suspension (take PadMagnet offline, keep everything)

Nothing here is permanent. This is the "go dark but recoverable" state. Sit here as long as
you want before committing to deletion.

- [x] **Stop the crons** (so no sync/expiry/billing jobs run): disable the Vercel cron jobs
      for the `padmagnet` project (IDX sync, expire sweep, delivery-retry). Vercel dashboard →
      project → Settings → Cron Jobs → disable. **✅ DONE 2026-07-22 — all 4 crons removed from
      `vercel.json` (config-as-code, not a dashboard toggle) and confirmed via API: 0 cron
      definitions on the live deployment. IDX sync / expire / expiry-emails / delivery-retry all dead.**
- [x] **Take the app down gracefully:** put padmagnet.com into a maintenance / "service ended"
      state (a static notice page), OR leave it up read-only for now. Don't delete yet.
      **✅ DONE 2026-07-22 — shutdown shutter live: `middleware.js` replaced wholesale, returns
      HTTP 410 + noindex on every page (branded "PadMagnet has closed" notice) and 410 JSON on all
      `/api/*`; `public/robots.txt` = Disallow all. Externally verified (410s, robots, X-Robots-Tag).
      Full app code preserved untouched behind the middleware — REVIVAL POINT = git tag
      `archive/2026-07-22-last-live-app` (restore crons in vercel.json + revert shutter commit
      `c3cb588`, redeploy).**
- [x] **Google Play:** move the app from Production to **Unpublished** (Play Console → app →
      Setup → Advanced → Unpublish). Existing installs keep working; no new installs. Reversible.
      **✅ DONE 2026-07-22 — Chris unpublished via Test and release → Setup → Advanced settings →
      App availability (app was on Open testing, never Production). Verified externally same day:
      store listing URL = HTTP 404, Play search shows no PadMagnet. Existing testers keep installed
      copies. Reversible (re-select Published; may re-trigger review). Dev account (PadMagnet LLC)
      kept per Stage 3. No Play Publishing API existed — Console-only action (unpublish has no API).**
- [x] **Pause mobile builds:** no further EAS builds. (EAS/Expo project can stay; costs nothing
      idle.) **✅ 2026-07-22 — no builds planned; EAS project left idle (free).**
- [x] Announce internally only. Hold here until you're sure. **✅ N/A — no team; Chris is the decider.**

---

## STAGE 2 — Notify users & wind down billing (the careful, legally-clean part)

This is the stage that protects you. Do NOT skip if there are real users or paying customers.

- [x] **Pull the customer/billing picture FIRST.** Check Stripe (LIVE since 2026-03-22) for
      **active subscriptions and recent charges**, and Supabase for active listings/users.
      Stripe Dashboard → Subscriptions (filter active). Do not delete anything until you know
      who's paying. **✅ Stripe side DONE 2026-07-22 (via API): ZERO subscriptions ever existed —
      both products were one-time passes. 4 lifetime charges (3/22–5/27, look like Chris's own
      live-mode tests), 4 customers, nothing refunded/disputed. Supabase active-listings/users
      count still to pull.**
- [x] **Cancel active Stripe subscriptions** at period end (or refund pro-rata if shutting down
      mid-cycle — your call, but don't keep billing for a service you're closing). Disable
      future renewals. **✅ N/A 2026-07-22 — zero subscriptions ever existed; nothing to cancel.**
- [ ] **Notify users** (renters + owners) by email that the service is closing, with a date and
      what happens to their data. Use the existing admin email templates (Admin → Templates) so
      it's on-brand and logged. Give owners a path to export/keep their listing info if relevant.
- [x] **SMS wind-down:** stop all outbound SMS. Plan to release the Twilio number + close the
      A2P campaign in Stage 3. **✅ DONE 2026-07-22 — outbound SMS already impossible (APIs 410
      since the shutter); number + campaign gone (see Stage 3 Twilio).**

---

## STAGE 3 — External services teardown (after users are notified & billing stopped)

Order matters less here; each is independent. Export/screenshot anything you may want as a record.

- [x] **Stripe:** confirm zero active subscriptions; archive products/prices; (optionally) keep
      the account for records — Stripe is fine to leave dormant at $0. Roll/disable the live
      webhook endpoint pointing at padmagnet.com. **✅ DONE 2026-07-22 (via API, read-back
      verified): 0 active subs (none ever existed) · both products (Pro Pass, Premium Pass) +
      both one-time prices archived (`active:false`, default_price unset first — Stripe blocks
      archiving a default price) · webhook `we_1TDcS3IpjiZxeVpLT29lpVp1` → `disabled`. Account
      kept dormant for charge records (4 lifetime charges). All reversible: reactivate products/
      prices + re-enable webhook to restore.**
- [x] **Twilio:** release the PadMagnet phone number, close/withdraw the A2P 10DLC campaign &
      brand. (If the number has value, port it elsewhere instead of releasing.)
      **✅ DONE 2026-07-22 via API, read-back verified: A2P campaign QE2c6890… deregistered ·
      number +12536003665 released (E911 address unassigned first — error 21631 blocks release
      otherwise). Migration to SFRM's account considered and REJECTED (separate top-level accounts
      = support-ticket transfer; 253/WA area code worthless for Stuart FL). Brand (PadMagnet LLC,
      APPROVED) kept — no recurring fee. Account kept dormant with $16.60 prepaid balance.
      Recurring: $0. Auto-recharge confirmed OFF by Chris 2026-07-23. TWILIO FULLY CLOSED.**
- [x] **Google Workspace seat (added to plan 2026-07-22):** the "PadMagnet Team" user
      (hello@padmagnet.com) was the org's only PadMagnet seat (~$16.80/mo Business Standard).
      **✅ DELETED 2026-07-22 by Chris in the Admin console — full delete, Google's Archived-User
      upsell (~$3.36/mo) explicitly declined (mailbox held 0.001 GB, nothing to retain). All
      padmagnet.com aliases (support@, privacy@, legal@, info@, noreply@…) died with the user.
      ~20-day restore window applies. API note: Admin SDK access via gcloud ADC was BLOCKED by
      Google org policy ("app blocked" on restricted admin scopes) — Console was the legitimate
      path. Alias question RESOLVED (Chris, 2026-07-22): NO aliases re-created — ALL padmagnet.com
      email (hello@, privacy@, legal@, everything) intentionally dies/bounces. License billing drop
      confirmed by Chris 2026-07-23. WORKSPACE FULLY CLOSED.**
- [x] **Resend:** remove the padmagnet.com sending domain / API key once final user emails are sent.
      **✅ DONE 2026-07-22 via API, read-back verified: domains padmagnet.com + inbound.padmagnet.com
      deleted · email.received webhook deleted · PadMagnet API key ("supabase for PadMagnet.com")
      deleted, confirmed rejected. ⚠️ ACCOUNT KEPT — it's shared; christopherlundstrom.com domain +
      key verified intact. DNS hygiene: 7 orphaned Resend records purged from the padmagnet.com
      Vercel zone, root SPF rewritten Google-only; Google MX untouched (hello@ still receives,
      verified). 💰 RESOLVED same day: Chris downgraded the shared Resend account to the FREE tier
      (2026-07-22) — the $20/mo Transactional Pro charge is gone. CL's low-volume sending rides free.**
- [ ] **Upstash Redis:** delete the PadMagnet rate-limit database. **(2026-07-13: self-resolving —
      Upstash sent a free-tier inactivity notice; with the project dormant, nothing pings it, so it
      will be archived by Upstash on its own. The only data is ephemeral rate-limit counters, and
      `lib/rate-limit.js` fails OPEN, so archiving cannot take PadMagnet down. On revival: create a
      new free DB and repoint `UPSTASH_REDIS_REST_URL` + `_TOKEN` — no code change.)**
- [x] **xAI (Ask Pad / Grok):** revoke the `XAI_API_KEY` (PadMagnet-only). **✅ DONE 2026-07-22 —
      Chris deleted `padmagnet-askpad-prod` at console.x.ai, and in the same sweep deleted the
      campaign's separate "DEV-MCC Key for Data Mining" key (same xAI account,
      `cmlundstrom@gmail.com`). The account itself stays; on revival mint fresh keys there.
      1PW: `Dev-PadMagnet / Xai API Credentials` now holds a dead value — history note added.**
- [x] **Google Cloud — padmagnet-maps keys (added 2026-07-22):** **✅ DONE via gcloud (API-first).**
      Both API keys deleted ("Server - Geocoding for Owner Comps Locations" + "Google Maps,
      Geolocation, and Places"; 30-day undelete window) and **billing UNLINKED** from the project
      (billingEnabled=false — zero charge risk forever). Live-verified: both old key values return
      REQUEST_DENIED. **Borrowed-key audit for tools.floridapm.net came back clean:** sfrm-tools
      (rent-range / Active Rentals / Market Pulse) runs on its OWN keys from
      `Dev-floridapm.net/Google-SFRM-Tools-Server` (different values, different GCP project),
      verified in local env + production Vercel env + push_env.py mapping + a full CML-Dev source
      sweep (no hardcoded fragments). The `Dev-floridapm.net/Google-Maps-Platform` 1PW item turned
      out to be a stale duplicate of the (now-dead) PadMagnet keys — stale item DELETED from 1PW
      same day (Chris-approved, read-back confirmed gone). Project shutdown also Chris-approved and
      executed same day: `padmagnet-maps` is in DELETE_REQUESTED state (recoverable ~30 days via
      `gcloud projects undelete padmagnet-maps`, then purged permanently).
- [ ] **EAS / Expo:** archive or delete the `@cmlundstrom/padmagnet` project.
- [ ] **Google Play:** once unpublished and the wind-down window has passed, you may remove the
      app. **Keep the PadMagnet LLC Play *developer account* itself** unless you also intend to
      close that business entity — removing one app ≠ closing the account.
- [ ] **Domain (padmagnet.com):** decide keep vs release. Keep it parked/redirecting for at least
      a year (cheap insurance + protects the brand + catches stragglers). Email DNS (MX) can stay
      so replies don't bounce, or be retired with the rest.
- [ ] **Secrets:** revoke/rotate all PadMagnet-only keys (Stripe, Twilio, Resend, xAI, Upstash,
      Supabase service-role). **Do NOT touch the shared Bridge or Brave credentials** unless
      Stage 0 already gave tools its own — see DO-NOT-TOUCH below.
      **Progress: ✅ xAI (both keys deleted 7/22) · ✅ Stripe (secret key expired at dashboard
      7/22, verified 401; replacement key lives only in the dashboard, never deployed; 1PW item
      note updated). Remaining: Twilio, Resend (PadMagnet key only — account is shared!),
      Supabase service-role, Upstash (self-archiving).**

---

## STAGE 4 — Final, irreversible deletion (last; after a cooling-off window)

Only after Stages 0–3 are done and you've sat in the suspended state long enough to be certain.

- [x] **Back up the data one last time:** take a fresh Supabase backup/export of
      `darizrcswflrpyvtldii` and store it in the gitignored `padmagnet\archive\` (and/or a Kopia
      snapshot). Once the project is deleted, the data is gone.
      **✅ DONE 2026-07-22 — `archive\supabase-final-2026-07-22\`: pg_dump custom-format
      `padmagnet-full.dump` (47 MB, 72 TABLE DATA sections, schemas public+auth+storage,
      pg_restore-verified) + readable `schema.sql` + all 41 listing photos + restore README.
      Kopia sweeps it to X10 nightly. Notes: stored pooler URL was stale (aws-0→aws-1) and DB
      password stale → reset via Management API; pg_dump 17.10 installed via winget (service left
      on — Chris to run in admin PS: `Stop-Service postgresql-x64-17; Set-Service
      postgresql-x64-17 -StartupType Disabled`).**
- [x] **Confirm the repo is fully pushed** to GitHub (`cmlundstrom/padmagnet`) so the code
      survives as history even after local cleanup. **✅ main pushed; revival tag
      `archive/2026-07-22-last-live-app` pushed 2026-07-22.**
- [x] **Delete the Vercel `padmagnet` project.** **✅ RESOLVED AS KEEP (2026-07-22): the Vercel
      project (free Hobby) serves the live shutter + holds the domain; Chris chose to let the
      domain ride. Deleting it would kill the tombstone page. Revisit only if the domain is ever
      released.**
- [x] **Delete (or pause) the Supabase `darizrcswflrpyvtldii` project.** Deleting it stops the
      Pro-plan billing. *Pausing*/downgrading first is the safer half-step if unsure.
      **✅ DELETED 2026-07-22 via Management API (Chris confirmed after backup verification).
      Read-back: gone from org; endpoint dark. Pre-delete audit: DB was 100% PadMagnet (no vault
      tables, no tools tenants, no pg_cron). ⚠️ BILLING NOTE: the $25/mo Pro plan is ORG-level
      (org also holds floridapm.net/tools + christopherlundstrom.com) and STAYS for tools; the
      deletion removes padmagnet's ~$10/mo compute line only.**
- [x] **Local cleanup:** archive `C:\Users\chris\CML-Dev\padmagnet` (zip into `archive\`),
      then remove the working copy if desired. GitHub still has the history.
      **✅ RESOLVED 2026-07-22: working copy KEPT in place (three copies of everything now exist:
      local + GitHub + Kopia/X10). No zip needed — the repo dir IS the archive.**
- [x] **Memory hygiene:** update `~/.claude` memory — mark PadMagnet topic files as RETIRED so
      future sessions don't treat it as live. **✅ 2026-07-22 — MEMORY.md PadMagnet section
      rewritten to SHUT DOWN state; `reference_padmagnet_map.md` header updated (map kept as the
      revival index); `reference_email_accounts.md` marked historical earlier today.**
- [x] **✅ DONE 2026-07-23. Full Watchtower pass (Chris, 2026-07-22: do this once the PadMagnet archive is complete).**
      **Built the "Retired" shelf on /admin/watchtower (muted, page bottom): PadMagnet card moved
      there with its 9 connections preserved — each still opens its full dossier drawer. Retired
      projects excluded from live grid, hero totals, spend, alerting, and probe runs; old rest-mute
      row deactivated; all 42 dossiers regenerated (padmagnet__* carry the RETIRED banner); registry
      sharedWith truth updated (Bridge/Brave/CL-Resend). Post-deploy canary sweep: 20/20 probes
      GREEN, 32/33 connections green (1 amber = gus/voice-stack orb kiosk, unrelated to PadMagnet),
      0 red, 0 stale — nothing broken by the archive. Spend now honest at $81/mo. Open follow-ups
      → session decision list (EAS paid-plan check, shared-Vercel-token re-homing, Magnolia probe
      trim).**
      Sweep the Watchtower registry + dossiers to match post-shutdown reality: PadMagnet's 9
      connections → retired/archived (currently just rest-muted); dossier COST lines updated —
      e.g. `christopherlundstrom__resend.md` says "Pro · $20/mo" but the shared Resend account was
      downgraded to FREE on 2026-07-22; `padmagnet__*` dossiers describe live services that no
      longer exist (Stripe dormant, Twilio number released, Resend domains gone, xAI keys dead).
      Also update the EAS/Expo Watchtower probe if it still pings the PadMagnet project.

---

## ⛔ DO-NOT-TOUCH during the entire shutdown (would break tools.floridapm.net)

Unless Stage 0 successfully gave tools its own copies first:

1. **Bridge Interactive MLS account / `miamire` feed / shared `BRIDGE_SERVER_TOKEN`** — kills
   tools' rental-comps sync AND the live Active Rentals tool. Also tied to your brokerage MLS
   membership; shouldn't be cancelled regardless.
2. **Shared Brave Search API key** — degrades the rent-range web pipeline.

Everything else PadMagnet uses is PadMagnet-only and safe to tear down.

---

## One-line summary

> Give tools.floridapm.net its own Bridge token (Stage 0) → take PadMagnet dark but recoverable
> (Stage 1) → notify users + stop billing (Stage 2) → tear down PadMagnet-only services (Stage 3)
> → final backup + delete Vercel/Supabase (Stage 4). Never cancel the shared Bridge/MLS feed or
> Brave key while tools still depends on them.
