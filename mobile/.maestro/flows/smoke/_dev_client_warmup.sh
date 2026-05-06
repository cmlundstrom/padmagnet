#!/usr/bin/env bash
# Sourced by smoke wrappers AFTER pm clear + _disable_dev_fab. Handles the
# dev-client-specific warmup that's needed to rebind a freshly-cleared
# expo-dev-client APK to its Metro bundler URL — but is a NO-OP on
# preview/production builds (which don't have expo-dev-client and don't
# need this dance).
#
# What this does on dev-client builds:
#   1. Fires the exp+padmagnet:// deep link to dev-client's Metro-bind URL.
#      pm clear wipes the dev-client's stored Metro URL, so without this
#      the app boots into the dev launcher menu instead of our app.
#   2. Taps the dev-launcher's "Continue to App" button at fixed coords
#      (twice, to handle a 2-step dialog on some Android versions).
#
# What this does on preview/production builds:
#   - Probes for debuggability via `run-as`. Release-signed APKs reject
#     run-as with "package not debuggable", which is the exact same signal
#     we use for the dev-FAB skip.
#   - If non-debuggable, return early. Maestro's `launchApp` (which runs
#     after this helper) handles the app start with a normal activity
#     intent — no Metro rebind needed since the JS bundle is bundled into
#     the APK + OTA-updated.
#
# Discovered 2026-05-06: the inline [2/X] (deep-link) and [3/X] (Continue
# tap) blocks in every wrapper were no-oping silently on preview, but the
# Continue taps at (540, 1972) were occasionally landing on stray UI
# (e.g., owner-home tab buttons), corrupting the smoke's starting state.
APP_ID="${APP_ID:-com.padmagnet.app}"
METRO_URL="${METRO_URL:-http://10.0.0.205:8081}"
DEV_CLIENT_DEEP_LINK="exp+padmagnet://expo-development-client/?url=${METRO_URL}"

# Probe: same signal as _disable_dev_fab.sh. run-as succeeds only on
# debuggable APKs (= dev-client builds for our setup).
if ! adb shell "run-as $APP_ID true" 2>/dev/null; then
  echo "  [_dev_client_warmup] skipped — preview/production build, no Metro rebind needed"
  return 0 2>/dev/null || exit 0
fi

echo "  [_dev_client_warmup] re-binding dev-client to Metro at ${METRO_URL}..."
adb shell am start -W -a android.intent.action.VIEW -d "$DEV_CLIENT_DEEP_LINK" >/dev/null
sleep 6

echo "  [_dev_client_warmup] tapping dev-launcher Continue (fixed coord) twice..."
adb shell input tap 540 1972 >/dev/null
sleep 3
adb shell input tap 540 1972 >/dev/null
sleep 5
