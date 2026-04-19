# Auth Simplification Plan — Profile Email Editing

**Date:** 2026-04-19
**Goal:** Eliminate in-app profile email editing as a free-form field. Replace with a dedicated Change Email re-auth flow. Preserve all anon (looky-loo) browse paths. Apply consistent anon gating across both renter and owner profile surfaces.
**Checkpoint:** `pre-auth-simplification` tag at `d87156a`

---

## Why this is needed

Two compounding bugs surfaced for anon users on Profile → Edit:
1. Crash: `Cannot read property 'id' of null` (no null-guard in save handler)
2. Confusing UX: "edit your email" implies you can claim any address; in reality you can only collide with existing accounts

Root cause: email is *auth identity*, not a profile attribute. Letting users free-text-edit identity from a profile screen creates a mental model mismatch. The fix is to remove the foot-gun, not improve its error messaging.

---

## Architecture decision

**Email = auth identity, not profile field.** The `profiles.email` column stays (used by cron/Stripe/notifications), but it is now strictly a *cache* synced from `auth.users.email` via the `handle_new_user` trigger and the `/auth/confirm` server route. No client-side path mutates it directly.

Profile editing splits into two distinct surfaces:
- **Edit Profile** (`/settings/edit-profile`): display name + phone only. No email field.
- **Change Email** (`/settings/change-email`): dedicated re-auth flow. Single input "new email", confirmation link sent, existing `/auth/confirm` route completes the sync.

Anon users see neither editor. They see a clear "Sign in to manage your account" card on the Profile screen.

---

## Surfaces touched (from comprehensive trace)

### Mobile
| File | Change |
|---|---|
| `mobile/app/settings/edit-profile.js` | Remove email field + email logic. Add hard isAnon guard with redirect. Rename to "Edit Profile · Name & Phone" copy. |
| `mobile/app/settings/change-email.js` | **NEW** — dedicated change-email screen with re-auth gate, current-email display, new-email input, OTP send |
| `mobile/components/screens/ProfileCard.js` | Keep email display (read-only). Remove the "Edit" pill that routes to /settings/edit-profile (was the source of confusion). Add a small anon-state branch: when no email set + anon, show "Sign In to add your contact info" |
| `mobile/app/(tenant)/profile.js` | Add isAnon gate to mirror owner's pattern. When anon: hide ProfileCard + SETTINGS edit/account items, show "Sign In" CTA card. Add Change Email menu item next to Edit Profile (auth-only). |
| `mobile/app/(owner)/profile.js` | Same: when authed, add Change Email menu item next to existing Edit Profile. |
| `mobile/app/settings/_layout.js` | Register `change-email` screen in the Stack |
| `mobile/components/auth/AuthBottomSheet.js` | Add new contexts `profile_edit` and `profile_email_change` → both return to current role's profile screen |

### Backend (verified, NO CHANGES NEEDED)
| Surface | Why no change |
|---|---|
| `app/auth/confirm/route.js` | Already verifies OTP + syncs email to profiles.email. Idempotent. Reusable as-is for the new flow. |
| `app/email-confirmed/page.js` | Already handles `type=email_change` success/error paths. |
| Supabase email_change template | Already configured per the existing memory `profile-edit-email-change.md`. Routes through `/auth/confirm` not `/auth/callback`. |
| `handle_new_user` trigger | Already syncs email on auth.users INSERT (signup path). |
| `supabase.auth.updateUser({email})` | The same Supabase call we're using today; just isolated to its own dedicated screen. |
| `/api/admin/users` PATCH (super_admin email edit) | Stays — separate admin-only path. |
| Cron jobs (expiry-emails) | Read profiles.email; sync still happens via `/auth/confirm` so no behavior change. |
| Stripe checkout | Reads `user.email` from auth session; unaffected. |

### Database (NO MIGRATION)
- `profiles.email` column stays (cache for cron/Stripe/admin reads)
- No schema changes
- No data migration

---

## Anon browsing preservation

Verified anon paths that stay 100% functional:
- Welcome → choose role → swipe deck (calls signInAnonymously)
- Browse listings, view detail, see photos
- Owner anon → manila card → AuthBottomSheet on action
- Tenant anon → swipe → AuthBottomSheet on first message
- Profile tab → visible, but shows sign-in card instead of broken editor

Nothing in this plan adds gating to non-profile surfaces.

---

## Implementation order (sequential, each commit-able independently)

1. **AuthBottomSheet contexts** — add `profile_edit` + `profile_email_change`. Both → current role's profile.
2. **New `change-email.js` screen** — re-auth gated. Calls `auth.updateUser`. Same "Email Already In Use" alert as today, plus a "That's already your current email" guard.
3. **Register in `_layout.js`** — Stack.Screen entry.
4. **Strip email from `edit-profile.js`** — keep display_name + phone fields. Add hard isAnon guard with redirect. Drop dead email-collision code.
5. **Update `ProfileCard.js`** — remove the "Edit" pill (was the worst confuser). Keep info display. Add anon-state branch.
6. **Update `(tenant)/profile.js`** — isAnon gate mirroring owner's pattern. New SETTINGS menu items: Edit Profile (name+phone) + Change Email (separate). Anon sees Sign In card.
7. **Update `(owner)/profile.js`** — add Change Email menu item next to Edit Profile (authed users only).
8. **Maestro flows** — `change_email.yaml`, `anon_profile_signin.yaml`. Add to smoke suite.
9. **Run smoke regression** + new flows on S10 via dev client (hot reload — no rebuild).
10. **Document in memory** — feedback memory: "email is auth identity, not a profile field"; reference memory: new Change Email flow architecture.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Existing authed users have stale `profiles.email` ≠ `auth.users.email` | The new Change Email flow will sync them on first use. Optionally add a one-time admin sweep but defer until needed. |
| User on a stale build attempting edit-profile email | Hard isAnon guard + email field removed = falls through cleanly to "Saved" alert on display_name update. |
| Magic link arrives before user opens app | Existing `/auth/confirm` is server-side; doesn't require app to be open. Sync happens regardless. |
| Anon user deep-links to `/settings/change-email` | Hard guard at top of screen redirects to `/welcome`. |
| Maestro existing smoke flows reference removed Edit Profile email field | Update flows; the existing 7 smoke flows don't currently exercise email editing per source review. |
| Owner role's existing Edit Profile menu hits the same crash | Same fix applies — this plan covers both roles symmetrically. |

---

## Acceptance tests (Maestro)

1. **change_email_authed.yaml** — sign in → /settings/change-email → enter new email → confirm "Verification Sent" alert
2. **change_email_collision.yaml** — sign in → /settings/change-email → enter existing user's email → expect "Email Already In Use" + Sign Out CTA
3. **change_email_same.yaml** — sign in → /settings/change-email → enter own current email → expect "That's already your email" guard
4. **anon_profile_signin.yaml** — anon → tap Profile tab → see Sign In card → tap → AuthBottomSheet appears with profile_edit context
5. **edit_profile_no_email.yaml** — sign in → /settings/edit-profile → confirm Email field is gone, only Display Name + Phone
6. **anon_browse_unaffected.yaml** — anon → swipe deck loads → tap listing → detail loads (regression check)

---

## Rollback

If anything breaks: `git reset --hard pre-auth-simplification` reverts every change. Migrations: none, so nothing to rollback DB-side.
