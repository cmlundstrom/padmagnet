# Maestro smoke session — 2026-04-22

**Build**: EAS preview `407753f8-982f-4341-a379-a62239c06bad`
**Commit**: `65e503d` ("ManilaCard: remove fold-line effect globally")
**APK**: https://expo.dev/artifacts/eas/8XHidmrqSKHGWkX8Uaq4aF.apk
**Device**: Samsung Galaxy S10 (`RF8R51L94GR`)

## Results — 10/11 passed on first run

| Flow | Duration | Result |
|---|---|---|
| android_back_button | 1m 00s | ✅ |
| anon_profile_simplified | 2m 02s | ✅ |
| anon_upgrade | 2m 05s | ✅ |
| conversation_sender_label | 1m 35s | ✅ |
| delete_account | 2m 49s | ✅ |
| edit_profile_no_email | 2m 45s | ✅ |
| owner_entry | 2m 14s | ❌ → fixed (see below) |
| owner_l1_autodismiss | 1m 27s | ✅ |
| password_eyeball | 1m 21s | ✅ |
| role_switch | 2m 43s | ✅ |
| sign_out | 2m 19s | ✅ |

## The one failure

`owner_entry` asserted `"Welcome to the Listing Studio"` visible and then tapped `"Got it"`. Both strings were rebranded in commit `89672fb` (studio tooltip full art treatment):
- Headline: `"Welcome to the Listing Studio"` → `"Your Property, Your Story"`
- CTA: `"Got it"` → `"Let's Build It"`

The flow was asserting stale copy. Code is correct; test was out of date.

**Fix applied**: updated `mobile/.maestro/flows/smoke/owner_entry.yaml` to match new copy. Comment added referencing the source commit so future readers understand the change.

## Session context

Full suite ran at 2026-04-22 ~09:32 ET against a fresh install of the preview build. APK installed via `adb install` after full `uninstall` → no stale state carried over. Total runtime ~23 minutes.

Raw log: `full-suite.log` in this folder.
