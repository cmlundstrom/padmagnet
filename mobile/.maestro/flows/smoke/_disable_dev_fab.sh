#!/usr/bin/env bash
# Sourced by smoke wrappers AFTER `pm clear` and BEFORE the dev-client
# deep-link launch. Disables expo-dev-menu's floating "Tools" FAB which
# would otherwise sit at top-right of every screen and intercept maestro
# taps on header Save/Done/X buttons.
#
# Why this exists:
#   - expo-dev-menu defaults `showFab=true` (see DevMenuPreferences.kt).
#   - The FAB is at top-right z-order above app UI.
#   - `pm clear` wipes the SharedPreferences override every smoke run,
#     even if the engineer disabled the FAB in the dev menu manually.
#   - We re-write `showFab=false` to the prefs XML before the app's
#     first read on the next launch, so the FAB never renders.
#
# `isOnboardingFinished=true` also pre-skips the dev-launcher onboarding
# wizard. Both keys are read once on app start.
#
# See feedback_maestro_dev_fab_collision.md for the full diagnosis (the
# notifications_save_persistence smoke surfaced this 2026-05-04).
#
# Preview/production builds are release-signed and exclude expo-dev-client
# (commit 8201886). They have NO floating FAB AND `run-as` is rejected by
# Android with "package not debuggable". So this entire helper is a
# correct no-op on those builds — we detect via run-as probe and skip.
# Discovered 2026-05-06 when the first preview-build overnight batch
# failed 17/22 smokes here. Without this guard, every wrapper exits non-
# zero on `set -euo pipefail` because the run-as commands fail.
APP_ID="${APP_ID:-com.padmagnet.app}"

# Probe: can we run-as this package? Release-signed builds reject with
# stderr "package not debuggable" and exit non-zero.
if ! adb shell "run-as $APP_ID true" 2>/dev/null; then
  echo "  [_disable_dev_fab] skipped — package not debuggable (preview/production build, no dev-FAB to disable)"
  return 0 2>/dev/null || exit 0
fi

adb shell "run-as $APP_ID mkdir -p shared_prefs" >/dev/null
echo '<?xml version="1.0" encoding="utf-8" standalone="yes" ?>
<map>
    <boolean name="isOnboardingFinished" value="true" />
    <boolean name="showFab" value="false" />
</map>' | adb shell "run-as $APP_ID sh -c 'cat > shared_prefs/expo.modules.devmenu.sharedpreferences.xml'" >/dev/null
