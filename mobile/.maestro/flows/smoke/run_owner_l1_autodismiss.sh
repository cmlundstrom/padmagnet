#!/usr/bin/env bash
# Wrapper for owner_l1_autodismiss.yaml. Same pm-clear + dev-client
# rebind pattern as the other smoke wrappers.
set -euo pipefail

APP_ID="com.padmagnet.app"
METRO_URL="${METRO_URL:-http://10.0.0.205:8081}"
DEV_CLIENT_DEEP_LINK="exp+padmagnet://expo-development-client/?url=${METRO_URL}"
SMOKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(cd "$SMOKE_DIR/../.." && pwd)"

echo "[1/4] Clearing app data..."
adb shell pm clear "$APP_ID" >/dev/null

echo "[2/4] Re-binding dev client to Metro at ${METRO_URL}..."
adb shell am start -W -a android.intent.action.VIEW -d "$DEV_CLIENT_DEEP_LINK" >/dev/null
sleep 6

echo "[3/4] Tapping the dev menu Continue button (fixed coord) twice..."
adb shell input tap 540 1972 >/dev/null
sleep 3
adb shell input tap 540 1972 >/dev/null
sleep 5

echo "[4/4] Running Maestro smoke..."
cd "$MAESTRO_DIR"
exec bash run.sh flows/smoke/owner_l1_autodismiss.yaml
