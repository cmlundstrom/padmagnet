#!/usr/bin/env bash
# Wrapper for smart_prompts_journey_full.yaml — the FULL 6-prompt
# extended journey (budget/3 → pets/8 → beds/15 → location/25 (skip)
# → type/40 → features/60). pm-clear + _disable_dev_fab +
# dev-client rebind.
#
# Run STANDALONE only — NOT in run_overnight_batch.sh. The 60-swipe
# version is ~6x slower in batch position 10+ due to deck exhaustion
# + cumulative level-ups (verified 2026-05-05). The shorter
# 3-prompt smart_prompts_journey.yaml lives in the batch.
#
# Run pre-launch or after touching swipe.js / SmartPromptCard.js /
# preferences upsert flow.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_smart_prompts_journey_full.sh
set -euo pipefail

APP_ID="com.padmagnet.app"
METRO_URL="${METRO_URL:-http://10.0.0.205:8081}"
DEV_CLIENT_DEEP_LINK="exp+padmagnet://expo-development-client/?url=${METRO_URL}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/4] Clearing app data so no auth session leaks from prior run..."
adb shell pm clear "$APP_ID" >/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/_disable_dev_fab.sh"

source "$(dirname "${BASH_SOURCE[0]}")/_dev_client_warmup.sh"

echo "[4/4] Running Maestro smoke (60 swipes, ~5 min standalone)..."
cd "$SCRIPT_DIR/.."
exec bash run.sh flows/smoke/smart_prompts_journey_full.yaml
