#!/usr/bin/env bash
# Wrapper for notifications_save_persistence.yaml. pm-clear + dev-client
# rebind. The smoke itself seeds the test renter via runScript inside
# Maestro. Same pattern as run_settings_navigation.sh.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_notifications_save_persistence.sh
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
adb shell input tap 540 1972 >/dev/null
sleep 3
adb shell input tap 540 1972 >/dev/null
sleep 5

echo "[4/4] Running Maestro smoke..."
cd "$SCRIPT_DIR/.."
exec bash run.sh flows/smoke/notifications_save_persistence.yaml
