# Project Handover & Continuation Instructions

You are now taking over the **PadMagnet App** project from Claude Opus 4.6.
~75% of the project is complete. You are responsible for the remaining ~25%.

---

## Critical Rules (Follow Exactly)

1. **Maintain perfect consistency** with all previous architecture, naming conventions, coding style, component patterns, and decisions made in the first 75%.
2. **Do not introduce new patterns**, refactor existing code unnecessarily, or change established approaches unless Chris explicitly asks.
3. **Always prioritize matching the existing code style**, file structure, and "mental model" of the project.
4. If you notice something that could be improved, **flag it first** and ask for confirmation before changing anything.
5. **Read the memory system first** — 65 memory files at `~/.claude/projects/C--Users-chris/memory/` contain every design decision, feedback rule, reference, and project status. `MEMORY.md` is the index. Read it before any work.

---

## Project Overview

**PadMagnet** is a Tinder-style rental matching app for South Florida (Fort Pierce to Miami).
- **Legal entity**: PadMagnet LLC (used in copyright/legal text). "PadMagnet" (no LLC) for branding/UI.
- **Business model**: Freemium — Free / Explorer ($1.50) / Master ($3.50) tiers for renters. Owners list free for 30 days, paid renewal via Stripe.

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Web + API | Next.js (App Router) on Vercel (Hobby plan, 10s timeout, daily-only crons) |
| Mobile | React Native / Expo (SDK 55), NativeTabs navigation |
| Backend | Supabase (Pro plan, PostgreSQL, Auth, Realtime). **IPv6-only** — migrations via `scripts/run-migrations.mjs` |
| Payments | Stripe (LIVE since 2026-03-22) |
| MLS Data | Bridge Interactive API (RESO Web API), dataset `miamire` |
| SMS | Twilio (A2P registered) |
| AI | Ask Pad co-pilot (OpenAI-backed, tier-gated queries) |
| Testing | **Maestro 2.4.0** E2E testing (see detailed section below) |

### Repository
- **Path**: `C:\Users\chris\OneDrive\Desktop\padmagnet`
- **GitHub**: `cmlundstrom/padmagnet`
- **Branch**: `main` (5 unpushed commits as of handover)
- **Structure**: monorepo — `mobile/` (Expo app), `app/` (Next.js pages/API), `supabase/` (migrations)

### Key Accounts & IDs
- **EAS**: `@cmlundstrom/padmagnet`, project ID `e669b547-8cac-4a4d-a210-d148b3dcc02e`
- **Admin user**: `cmlundstrom@gmail.com` (super_admin)
- **Test users**: `info@floridapm.net` (owner), `application@floridapm.net` (tenant)
- **Bundle ID**: `com.padmagnet.app` (shared iOS + Android)

---

## Key Warnings & Gotchas

- `vercel env pull` is **DESTRUCTIVE** — overwrites `.env.local`. Back up first.
- `vercel link` creates `.vercel` dir that confuses Next.js env loading — delete after CLI use.
- `mobile/.env` is gitignored — `EXPO_PUBLIC_*` vars must also be set on EAS as plaintext.
- **Always uninstall old APK before installing new build** — Android caches cause crashes.
- **Never `router.replace('/')` from inside the app** — navigate to final destination directly.
- **npm**: Must use `--legacy-peer-deps` for mobile installs.
- **Supabase migrations**: Use `scripts/run-migrations.mjs` (needs `DATABASE_URL` in `.env.local`), NOT Supabase CLI.
- **User-facing copy**: "Renter" not "Tenant". Code/DB stays `tenant` for backwards compat.
- **Never present MLS data as property valuations/AVMs** — always "comparative display" framing. IDX compliance.
- **All emails must use admin-editable templates** from DB, never hardcode email content.
- **profiles.email + auth.users.email must stay in sync** — admin dashboard auto-syncs.

---

## Architecture Decisions (Locked In)

- **Auth**: ALL auth flows go through `mobile/lib/auth.js` — never inline Supabase auth calls. AsyncStorage for token persistence (not SecureStore — caused deadlocks). Role sync via REST API.
- **Navigation**: NativeTabs (replaced old tab system). Dual-role system (tenant + owner) with role switching.
- **Manila Card**: SVG path rendering (3.0), not LinearGradient. Exact gradient colors in `reference_manila_folder_style.md`.
- **Design system**: `reference_mobile_design_system.md` is the **single source of truth** for all colors, fonts, spacing, radius, screen styles, badges, chips, alerts, keyboard rules, CTA colors, text highlights, permission dialogs.
- **Art direction**: Indiana Jones / Mad Max / steampunk nostalgia for modals, overlays, special surfaces.
- **Keyboard handling**: Use Keyboard listeners + reanimated translateY at 78%, NOT KeyboardAvoidingView (broken in Modal on Android).
- **Communications**: Email-only for MLS agents, SMS+email for owners. Full plan at `docs/COMMS_PLAN.md`.

---

## Currently Installed Build on S10

- **Build ID**: `251b5712-0bca-4089-b9b5-11ba91a8b702` (preview profile)
- **Commit**: `597d92ffa4cfd8209803fe04b7a47c0627e6a1bb`
- **Installed**: 2026-04-15 23:00:17
- **Includes**: All Stage 3 testIDs, Manila Card 3.0, auth token cache fix, centralized isAnon, map upgrades, sender labels, password eyeball toggle
- **Does NOT include**: The two Stage 4 smoke flow commits (`d4324cc`, `19c3df7`) — those are Maestro YAML files only, no app code changes needed

---

## Maestro E2E Testing — EXACT Current State

This is the active workstream. Here is precisely where things stand:

### Environment (Windows 11 + Git Bash)
| Component | Path / Version |
|-----------|---------------|
| Maestro CLI | `2.4.0` at `C:\Users\chris\.maestro\bin\maestro.bat` |
| JDK | 21 LTS at `C:\Program Files\Android\Android Studio\jbr` |
| Android SDK | `C:\Users\chris\AppData\Local\Android\Sdk` |
| Test device | Galaxy S10, serial `RF8R51L94GR`, USB debugging authorized |
| App package | `com.padmagnet.app` |
| MCP config | `padmagnet/.mcp.json` (git root, NOT `mobile/`) |
| `~/.bashrc` | Exports `ANDROID_HOME`, `JAVA_HOME`, `PATH` for SDK/JBR/Maestro |

### Stage Progress
| Stage | Status |
|-------|--------|
| 1. Environment setup | **COMPLETE** — Maestro installed, S10 pipeline verified |
| 2. Scaffold | **COMPLETE** — committed as `e0247f6` |
| 3. testID source audit | **COMPLETE** — 12 source edits across 10 files, 3 element files |
| 3. testID live verification | **COMPLETE** — 15 of 18 testIDs confirmed on S10 via `maestro hierarchy` |
| 4. Smoke flows | **IN PROGRESS** — 2 flows passing (`anon_upgrade`, `owner_entry`) |
| 5. CI wiring | **PENDING** — EAS post-build hook or GitHub Actions |

### Maestro File Structure
```
padmagnet/
├── .mcp.json                           # Maestro MCP server config (at git root)
└── mobile/.maestro/
    ├── config.yaml                     # Flow discovery + tag exclusion
    ├── .gitignore
    ├── run.sh                          # Pulls secrets from ../../.env.local, passes to maestro test -e
    ├── elements/
    │   ├── role_gate.js                # Text selectors (verified)
    │   ├── auth.js                     # testIDs: email, password, sign-in, L1, L2
    │   ├── listings.js                 # testIDs: swipe deck, detail, owner create
    │   ├── messages.js                 # testIDs: inbox, conversation
    │   └── loadElements.yaml           # Runs all 4 JS files to populate output.*
    ├── helpers/
    │   ├── seed_test_renter.js         # Supabase admin API, creates renter with MaestroTest123!
    │   ├── seed_test_owner.js          # Same for owner role
    │   └── cleanup_test_users.js       # Deletes seeded users by output.seed.*.userId
    └── flows/
        ├── _shared/
        │   ├── launch_fresh.yaml       # clearState + assertVisible role gate
        │   ├── choose_renter.yaml      # Taps "Find a Rental"
        │   └── choose_owner.yaml       # Taps "List My Property"
        └── smoke/
            ├── anon_upgrade.yaml       # ✅ PASSING — renter anon→auth, verifies swipe+messages survive
            └── owner_entry.yaml        # ✅ PASSING — owner L1→dismiss→grid→auth→create wizard
```

### How to Run Maestro Tests
```bash
# Ensure S10 is connected
adb devices  # Should show RF8R51L94GR

# Source bash profile for JAVA_HOME etc.
source ~/.bashrc

# Run a single flow
cd C:/Users/chris/OneDrive/Desktop/padmagnet/mobile/.maestro
bash run.sh flows/smoke/anon_upgrade.yaml

# Run all smoke flows
bash run.sh flows/smoke/
```

### Verified testIDs (15 confirmed live)
| testID | Component | Surface |
|--------|-----------|---------|
| `auth-sheet-email-input` | AuthBottomSheet | Auth sheet |
| `auth-sheet-password-input` | AuthBottomSheet | Auth sheet |
| `auth-sheet-sign-in-cta` | AuthBottomSheet | Auth sheet |
| `manila-l1-primary-cta` | ManilaFolderStack | Owner home L1 (scroll to expose) |
| `manila-l1-dismiss` | ManilaFolderStack | Owner home L1 (scroll to expose) |
| `manila-l2-enable-location-cta` | ManilaFolderStack | Owner home L2 |
| `swipe-deck-container` | CardStack | Tenant swipe |
| `swipe-deck-card` | SwipeCard | Tenant swipe (x2 instances) |
| `swipe-deck-like-button` | swipe.js | Tenant swipe |
| `swipe-deck-pass-button` | swipe.js | Tenant swipe |
| `back-button` | BackButton | Listing detail (shared across all headers) |
| `listing-detail-contact-owner` | listing/[id].js | Listing detail |
| `owner-create-address-input` | owner/create.js | Create wizard (Property Address card) |
| `owner-create-submit-cta` | owner/create.js | Create wizard (floating publish button) |
| `messages-inbox-empty` | EmptyState | Messages (empty state) |

### testIDs NOT yet verified (3 remaining — low risk)
| testID | Why | Risk |
|--------|-----|------|
| `owner-create-price-input` | Inside collapsed SmartCard accordion | Low — same Input component |
| `messages-inbox-list` | Needs user with conversations | Low — FlatList sibling of working EmptyState |
| `conversation-*` (5 IDs) | Need active conversation thread | Medium — different components |

### testID Surfaces NOT yet audited (Stage 3 gaps, surfaces 8-13)
- Profile screen
- Settings + sub-screens
- Owner 14-screen create wizard (beyond create.js entry points)
- Location soft-ask overlay
- Smart Prompt Cards

### Maestro Flow Authoring Gotchas (CRITICAL — learned the hard way)
1. **`hideKeyboard` required** between email and password input — keyboard covers `auth-sheet-password-input`
2. **`assertVisible` does NOT support per-step `timeout`** in Maestro 2.4.0 — use global default
3. **`extendedWaitUntil` does NOT exist** in Maestro 2.4.0 — don't use it
4. **Below-fold testIDs invisible in hierarchy** — use `scrollUntilVisible` or `swipe` before targeting
5. **SmartCard accordion** — owner create cards use `{expanded && children}`, testIDs inside collapsed cards are NOT in DOM
6. **Bottom tab "Messages" text conflicts** with Android system — can accidentally hit system Home. Use point coordinates or index if needed
7. **Samsung Pass save-password dialog** blocks flows — always add `tapOn: { text: "Not now", optional: true }` after sign-in steps
8. **`pressKey: back` can exit the app** — prefer tapping `back-button` testID instead
9. **Maestro `hierarchy` only shows on-screen elements** — off-screen items not in the JSON
10. **`maestro test` does NOT accept YAML from stdin** — must write to file first
11. **`tags:` in flow YAML header is NOT supported** in 2.4.0 — causes "Unknown Property: timeout" error (misleading)
12. **`launchApp` returns before rendering** — always gate with `assertVisible` on a known element before screenshots
13. **`run.sh`** extracts `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from `../../.env.local` and passes via `maestro test -e`

### Next Maestro Work (Stage 4 continuation)
Possible next smoke flows:
- **`save_limit_gate`** — anon renter likes enough listings to hit save limit, auth sheet triggers
- **`role_switch`** — sign in as tenant, switch to owner role, verify navigation works
- **`owner_create_full`** — fill out create wizard address + details, verify form state

After smoke flows: **Stage 5** — CI wiring (EAS post-build hook or GitHub Actions to auto-run flows)

---

## Tool Calls You'll Need Chris to Approve Frequently

These are the most common tool calls in this project. Chris will need to approve them unless he's configured auto-allow:

| Tool | Common Usage | Frequency |
|------|-------------|-----------|
| `Bash` | `adb` commands, `maestro test/hierarchy`, `git` operations, `npm/npx`, `curl` to Supabase API | Very high |
| `Read` | Reading source files, screenshots, memory files | Very high |
| `Edit` | Modifying source code, YAML flows, memory files | High |
| `Write` | Creating new flow files, new components | Medium |
| `Grep` | Searching codebase for patterns, testIDs, function names | High |
| `Glob` | Finding files by pattern | Medium |

Specific commands Chris has repeatedly approved:
- `source ~/.bashrc && maestro test ...` — running Maestro flows
- `source ~/.bashrc && maestro hierarchy > /tmp/...` — capturing view hierarchy
- `adb shell ...` — ADB commands to S10
- `adb devices` — checking device connection
- `git add/commit/status/diff/log` — git operations
- `curl -X POST/DELETE .../auth/v1/admin/users` — seeding/cleaning test users via Supabase admin API
- `cd C:/Users/chris/OneDrive/Desktop/padmagnet && ...` — working in repo

---

## Remaining Work (the ~25%)

### Immediate (Maestro — continue from here)
- Write 2-3 more smoke flows (save_limit_gate, role_switch, owner_create_full)
- Complete Stage 3 testID audit for surfaces 8-13 (Profile, Settings, Owner wizard, Location overlay, Smart Prompt Cards)
- Stage 5: CI wiring

### Pre-Launch Blockers
- Android SHA-1 fingerprint on Google Maps production key
- GCP budget alert
- Auth deep links — magic link redirect URLs to `padmagnet://`
- Twilio A2P campaign resubmission
- EAS production build (AAB for Play Store)
- Android back button broken on listing detail screen
- Owner Messages screen UX fixes (bridge pill layout, sign-in CTA visibility)

### Feature Work
- Smart Prompt Cards visual polish (6 swipe-triggered preference cards)
- Owner workflow — anon-first owner entry, auth gating, listing enhancements
- Owners admin panel upgrade
- Owner Grok + PM knowledge base (deferred — embed floridapm.net in owner-only prompt)

### Testing Backlog
- Token cache fix verification (sign in as `info@floridapm.net` → verify listings + messages load)
- L1 auto-dismiss (should not show for user with active listing)
- Sender label format "Sarah Mitchell (Renter)" split styling
- Password eyeball toggle
- Map satellite view + stem markers

---

## How to Resume

1. **Read `MEMORY.md`** — it's the index to all 65 memory files. Start there.
2. **Check git status** — `cd C:\Users\chris\OneDrive\Desktop\padmagnet && git log --oneline -10 && git status`
3. **Plug in S10** — verify with `adb devices` (serial `RF8R51L94GR`)
4. **Source bashrc** — `source ~/.bashrc` (sets JAVA_HOME, ANDROID_HOME, PATH for Maestro)
5. **Run existing smoke flows** to confirm they still pass: `cd mobile/.maestro && bash run.sh flows/smoke/`
6. **Ask Chris** what to work on next

---

## Your Task

1. First, carefully review the memory system at `~/.claude/projects/C--Users-chris/memory/MEMORY.md` and acknowledge this context.
2. Confirm that you understand the project and will continue exactly in the established style without drift.
3. Ask any clarifying questions if needed.
4. Then wait for Chris's next instruction on what to build or fix next.

We are switching to Claude Opus 4.7 specifically for its improved reliability on complex, long-running coding tasks and better instruction following. Help finish the app cleanly and consistently.

**Let's continue building PadMagnet.**
