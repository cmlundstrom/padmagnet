#!/usr/bin/env bash
# Wrapper for magic_link_cold_renter.yaml.
#
# Pre-flight (bash):
#   1. Force-stop the app — guarantees the next openLink is a TRUE cold
#      launch via deep-link delivery (no welcome screen, no anon session).
#   2. Mint a magic-link URL via Supabase admin API + curl-follow the 302
#      to capture tokens-bearing URL.
#
# Maestro flow then:
#   1. openLink the URL → app cold-launches via App Links → AuthCallbackScreen
#   2. Asserts authed renter state (swipe deck visible)
#   3. Cleans up the seeded user
#
# pm clear ensures clean state per smoke (no stale auth session leaking from
# a previous test). Cost: pm clear wipes the cached OTA bundle, so the
# warmup helper triggers an OTA download + apply cycle before the smoke
# runs. Once a production build ships with the auth-callback fixes in its
# bundled bundle, the warmup becomes unnecessary and can be removed.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_magic_link_cold_renter.sh
set -euo pipefail

APP_ID="com.padmagnet.app"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HELPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../helpers" && pwd)"

echo "[1/3] pm clear + warm OTA bundle..."
adb shell pm clear "$APP_ID" >/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/_warmup_ota.sh"

echo "[2/3] Mint magic-link URL for fresh test renter..."
MINT_OUT=$(bash "$HELPER_DIR/mint_magic_link_url.sh" tenant "ML Cold Renter")
USER_ID=$(echo "$MINT_OUT" | cut -d'|' -f1)
EMAIL=$(echo "$MINT_OUT" | cut -d'|' -f2)
DEEP_LINK_URL=$(echo "$MINT_OUT" | cut -d'|' -f3)
echo "  USER_ID=$USER_ID"
echo "  EMAIL=$EMAIL"
echo "  URL=${DEEP_LINK_URL:0:80}..."

echo "[3/3] Run maestro flow..."
cd "$SCRIPT_DIR"
exec bash run.sh \
  -e MAGIC_LINK_URL="${DEEP_LINK_URL}" \
  -e SEED_USER_ID="${USER_ID}" \
  -e SEED_EMAIL="${EMAIL}" \
  -e SEED_ROLE="renter" \
  flows/smoke/magic_link_cold_renter.yaml
