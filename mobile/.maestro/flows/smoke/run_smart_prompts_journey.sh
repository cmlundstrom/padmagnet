#!/usr/bin/env bash
# Wrapper for smart_prompts_journey.yaml. pm-clear + dev-client rebind.
# Smoke seeds named owner via runScript inside Maestro.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_smart_prompts_journey.sh
set -euo pipefail

APP_ID="com.padmagnet.app"
METRO_URL="${METRO_URL:-http://10.0.0.205:8081}"
DEV_CLIENT_DEEP_LINK="exp+padmagnet://expo-development-client/?url=${METRO_URL}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/4] Clearing app data so no auth session leaks from prior run..."
adb shell pm clear "$APP_ID" >/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/_disable_dev_fab.sh"

source "$(dirname "${BASH_SOURCE[0]}")/_dev_client_warmup.sh"

echo "[4/4] Running Maestro smoke..."
cd "$SCRIPT_DIR/.."
exec bash run.sh flows/smoke/smart_prompts_journey.yaml
