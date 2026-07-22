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

- [ ] **Bridge MLS:** In the Bridge Interactive developer console, mint a **second/separate
      server token** (or a separate application) for tools.floridapm.net. Update
      `CML-Dev\sfrm-tools\.env.local` and push to Vercel via
      `CML-Dev\sfrm-tools\tools\push_env.py`. Redeploy tools and confirm a rent-range run +
      Active Rentals still return live data.
      - *If Bridge can't issue a second token on this membership:* leave the shared token in
        place and simply **never cancel the Bridge/MLS feed** during this shutdown (see
        Stage 4 DO-NOT-TOUCH). The feed is tied to the brokerage's MLS membership anyway.
- [ ] **Brave Search:** Either mint a separate Brave API key for tools and push it, or note
      that the Brave account/key must survive PadMagnet's shutdown. (Low stakes — Brave only
      supplies *supplemental* comps; rent-range degrades gracefully without it.)
- [ ] Verify tools.floridapm.net end-to-end one more time. **Only proceed once tools no
      longer shares any live credential with PadMagnet** (or the survivors are explicitly on
      the DO-NOT-TOUCH list).

---

## STAGE 1 — Reversible suspension (take PadMagnet offline, keep everything)

Nothing here is permanent. This is the "go dark but recoverable" state. Sit here as long as
you want before committing to deletion.

- [ ] **Stop the crons** (so no sync/expiry/billing jobs run): disable the Vercel cron jobs
      for the `padmagnet` project (IDX sync, expire sweep, delivery-retry). Vercel dashboard →
      project → Settings → Cron Jobs → disable.
- [ ] **Take the app down gracefully:** put padmagnet.com into a maintenance / "service ended"
      state (a static notice page), OR leave it up read-only for now. Don't delete yet.
- [ ] **Google Play:** move the app from Production to **Unpublished** (Play Console → app →
      Setup → Advanced → Unpublish). Existing installs keep working; no new installs. Reversible.
- [ ] **Pause mobile builds:** no further EAS builds. (EAS/Expo project can stay; costs nothing
      idle.)
- [ ] Announce internally only. Hold here until you're sure.

---

## STAGE 2 — Notify users & wind down billing (the careful, legally-clean part)

This is the stage that protects you. Do NOT skip if there are real users or paying customers.

- [ ] **Pull the customer/billing picture FIRST.** Check Stripe (LIVE since 2026-03-22) for
      **active subscriptions and recent charges**, and Supabase for active listings/users.
      Stripe Dashboard → Subscriptions (filter active). Do not delete anything until you know
      who's paying.
- [ ] **Cancel active Stripe subscriptions** at period end (or refund pro-rata if shutting down
      mid-cycle — your call, but don't keep billing for a service you're closing). Disable
      future renewals.
- [ ] **Notify users** (renters + owners) by email that the service is closing, with a date and
      what happens to their data. Use the existing admin email templates (Admin → Templates) so
      it's on-brand and logged. Give owners a path to export/keep their listing info if relevant.
- [ ] **SMS wind-down:** stop all outbound SMS. Plan to release the Twilio number + close the
      A2P campaign in Stage 3.

---

## STAGE 3 — External services teardown (after users are notified & billing stopped)

Order matters less here; each is independent. Export/screenshot anything you may want as a record.

- [ ] **Stripe:** confirm zero active subscriptions; archive products/prices; (optionally) keep
      the account for records — Stripe is fine to leave dormant at $0. Roll/disable the live
      webhook endpoint pointing at padmagnet.com.
- [ ] **Twilio:** release the PadMagnet phone number, close/withdraw the A2P 10DLC campaign &
      brand. (If the number has value, port it elsewhere instead of releasing.)
- [ ] **Resend:** remove the padmagnet.com sending domain / API key once final user emails are sent.
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

---

## STAGE 4 — Final, irreversible deletion (last; after a cooling-off window)

Only after Stages 0–3 are done and you've sat in the suspended state long enough to be certain.

- [ ] **Back up the data one last time:** take a fresh Supabase backup/export of
      `darizrcswflrpyvtldii` and store it in the gitignored `padmagnet\archive\` (and/or a Kopia
      snapshot). Once the project is deleted, the data is gone.
- [ ] **Confirm the repo is fully pushed** to GitHub (`cmlundstrom/padmagnet`) so the code
      survives as history even after local cleanup.
- [ ] **Delete the Vercel `padmagnet` project.**
- [ ] **Delete (or pause) the Supabase `darizrcswflrpyvtldii` project.** Deleting it stops the
      Pro-plan billing. *Pausing*/downgrading first is the safer half-step if unsure.
- [ ] **Local cleanup:** archive `C:\Users\chris\CML-Dev\padmagnet` (zip into `archive\`),
      then remove the working copy if desired. GitHub still has the history.
- [ ] **Memory hygiene:** update `~/.claude` memory — mark PadMagnet topic files as RETIRED so
      future sessions don't treat it as live.

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
