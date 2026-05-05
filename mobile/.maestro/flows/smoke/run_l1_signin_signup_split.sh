#!/usr/bin/env bash
# Wrapper for auth_l1_signin_signup_split.yaml.
# Same pattern as run_renter_onboarding.sh: wipes app data + re-binds
# the dev client to Metro before invoking maestro, because clearState
# inside the YAML kills the dev client's Metro URL.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_l1_signin_signup_split.sh
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
# dialog, second is idempotent if the first already worked. The Maestro
# YAML includes a runFlow.when "Continue" fallback as a safety net.
adb shell input tap 540 1972 >/dev/null
sleep 3
adb shell input tap 540 1972 >/dev/null
sleep 5

echo "[4/4] Running Maestro smoke..."
cd "$SCRIPT_DIR/.."
exec bash run.sh flows/smoke/auth_l1_signin_signup_split.yaml
