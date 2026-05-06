#!/usr/bin/env bash
# Wrapper for magic_link_warm_owner.yaml.
#
# Owner warm variant: app warms to anon owner on Profile tab where the
# sign-in card lives. Tap the sign-in card opens AuthBottomSheet with
# context='owner_profile' (sets auth_return_to). Then openLink fires
# the magic-link URL → warm-launch deep-link delivery → setSession →
# resolvePostLoginDestination routes back to Profile (intent honored).
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_magic_link_warm_owner.sh
set -euo pipefail

APP_ID="com.padmagnet.app"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HELPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../helpers" && pwd)"

echo "[1/3] pm clear + warm OTA bundle..."
adb shell pm clear "$APP_ID" >/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/_warmup_ota.sh"

MINT_OUT=$(bash "$HELPER_DIR/mint_magic_link_url.sh" owner "ML Warm Owner")
USER_ID=$(echo "$MINT_OUT" | cut -d'|' -f1)
EMAIL=$(echo "$MINT_OUT" | cut -d'|' -f2)
DEEP_LINK_URL=$(echo "$MINT_OUT" | cut -d'|' -f3)
echo "  USER_ID=$USER_ID"
echo "  EMAIL=$EMAIL"

echo "[2/3] Run maestro flow (warms anon owner then fires openLink)..."
cd "$SCRIPT_DIR"
exec bash run.sh \
  -e MAGIC_LINK_URL="${DEEP_LINK_URL}" \
  -e SEED_USER_ID="${USER_ID}" \
  -e SEED_EMAIL="${EMAIL}" \
  -e SEED_ROLE="owner" \
  flows/smoke/magic_link_warm_owner.yaml
