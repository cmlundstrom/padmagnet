#!/usr/bin/env bash
# Wrapper for magic_link_warm_renter.yaml.
#
# Same mint pattern as the cold variant — wrapper force-stops + mints URL
# via Supabase admin API. Maestro then warms the app to anon-renter on
# Messages tab BEFORE firing openLink. Tests the warm-launch deep-link
# path that hit Chris in 2026-05-05 production-equivalent testing
# (root cause: Linking.useURL was deprecated and missed warm-launch URLs;
# fixed by switching to Linking.useLinkingURL in commit fa2100b).
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_magic_link_warm_renter.sh
set -euo pipefail

APP_ID="com.padmagnet.app"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HELPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../helpers" && pwd)"

echo "[1/3] pm clear + warm OTA bundle..."
adb shell pm clear "$APP_ID" >/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/_warmup_ota.sh"

MINT_OUT=$(bash "$HELPER_DIR/mint_magic_link_url.sh" tenant "ML Warm Renter")
USER_ID=$(echo "$MINT_OUT" | cut -d'|' -f1)
EMAIL=$(echo "$MINT_OUT" | cut -d'|' -f2)
DEEP_LINK_URL=$(echo "$MINT_OUT" | cut -d'|' -f3)
echo "  USER_ID=$USER_ID"
echo "  EMAIL=$EMAIL"

echo "[2/3] Run maestro flow (warms app then fires openLink)..."
cd "$SCRIPT_DIR"
exec bash run.sh \
  -e MAGIC_LINK_URL="${DEEP_LINK_URL}" \
  -e SEED_USER_ID="${USER_ID}" \
  -e SEED_EMAIL="${EMAIL}" \
  -e SEED_ROLE="renter" \
  flows/smoke/magic_link_warm_renter.yaml
