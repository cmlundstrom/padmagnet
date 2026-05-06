#!/usr/bin/env bash
# Wrapper for anon_upgrade.yaml. Provides the pm-clear + dev-client
# Metro re-bind that _shared/launch_fresh.yaml stopped doing internally
# after the 2026-04-27 dev-client contract change.
set -euo pipefail

APP_ID="com.padmagnet.app"
METRO_URL="${METRO_URL:-http://10.0.0.205:8081}"
DEV_CLIENT_DEEP_LINK="exp+padmagnet://expo-development-client/?url=${METRO_URL}"
SMOKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(cd "$SMOKE_DIR/../.." && pwd)"

echo "[1/4] Clearing app data..."
adb shell pm clear "$APP_ID" >/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/_disable_dev_fab.sh"

source "$(dirname "${BASH_SOURCE[0]}")/_dev_client_warmup.sh"

echo "[4/4] Running Maestro smoke..."
cd "$MAESTRO_DIR"
exec bash run.sh flows/smoke/anon_upgrade.yaml
