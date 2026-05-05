#!/usr/bin/env bash
# Wrapper for renter_first_time_onboarding.yaml that guarantees a clean
# auth state before the flow runs. The smoke itself uses
# `launchApp: stopApp: true` (which preserves the dev client's Metro
# URL); this wrapper is what wipes app data and re-binds Metro.
#
# Why a wrapper instead of `clearState: true` in the YAML?
#   - clearState wipes the dev client's cached Metro URL and lands on
#     the dev launcher, where `dev_client_reconnect.yaml`'s mDNS-based
#     auto-discover ("Fetch development servers") is unreliable on this
#     network.
#   - The deep-link approach (exp+padmagnet://expo-development-client)
#     works deterministically but Maestro's runScript can't shell out.
#
# What this does:
#   1. adb pm clear   → wipes AsyncStorage + cached Supabase session
#   2. adb am start   → relaunches dev client with Metro URL bound
#   3. adb input tap  → dismisses the dev menu first-launch dialog
#                       (only appears immediately after pm clear)
#   4. maestro test   → runs the actual smoke
#
# Usage:
#   cd mobile/.maestro && ./flows/smoke/run_renter_onboarding.sh
set -euo pipefail

APP_ID="com.padmagnet.app"
METRO_URL="${METRO_URL:-http://10.0.0.205:8081}"
DEV_CLIENT_DEEP_LINK="exp+padmagnet://expo-development-client/?url=${METRO_URL}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/4] Clearing app data so no auth session leaks from prior run..."
adb shell pm clear "$APP_ID" >/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/_disable_dev_fab.sh"

echo "[2/4] Re-binding dev client to Metro at ${METRO_URL}..."
adb shell am start -W -a android.intent.action.VIEW -d "$DEV_CLIENT_DEEP_LINK" >/dev/null
sleep 6

echo "[3/4] Tapping the dev menu Continue button (fixed coord) twice..."
# uiautomator dump hangs on this Compose-rendered first-launch dialog,
# so we use a fixed-coord blind tap. (540, 1972) is the bounds-center on
# 1080x2280 devices. Tap twice with a small gap — first to dismiss the
# dialog, second is idempotent if the first already worked.
adb shell input tap 540 1972 >/dev/null
sleep 3
adb shell input tap 540 1972 >/dev/null
sleep 5

echo "[4/4] Running Maestro smoke..."
cd "$SCRIPT_DIR/.."
exec bash run.sh flows/smoke/renter_first_time_onboarding.yaml
