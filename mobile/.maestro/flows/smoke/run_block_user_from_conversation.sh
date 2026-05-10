#!/usr/bin/env bash
# Wrapper for block_user_from_conversation.yaml.
#
# Smoke uses persistent marketing fixtures (Goose renter, Maverick
# owner) since they have a real seeded conversation. Wrapper extracts
# the marketing credentials from .env.local and passes them as Maestro
# env vars (BLOCKER_EMAIL/PASSWORD) so the smoke signs in as Goose.
#
# Cleanup of the user_blocks row is handled INSIDE the smoke (pre-flight
# + post-action runScript hooks), so this wrapper only handles
# pm-clear + auth-state hygiene.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_block_user_from_conversation.sh
set -euo pipefail

APP_ID="com.padmagnet.app"
METRO_URL="${METRO_URL:-http://10.0.0.205:8081}"
DEV_CLIENT_DEEP_LINK="exp+padmagnet://expo-development-client/?url=${METRO_URL}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$MAESTRO_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found" >&2
  exit 1
fi

extract_env() {
  local key="$1"
  local value
  value=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d'=' -f2-)
  value="${value%$'\r'}"
  value="${value#\"}"; value="${value%\"}"
  value="${value#\'}"; value="${value%\'}"
  printf '%s' "$value"
}

SUPABASE_URL=$(extract_env "NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY=$(extract_env "NEXT_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY=$(extract_env "SUPABASE_SERVICE_ROLE_KEY")
GOOSE_PW=$(extract_env "PADMAGNET_MARKETING_RENTER_PW")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$GOOSE_PW" ]; then
  echo "Error: required env vars missing from $ENV_FILE" >&2
  echo "       (need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + PADMAGNET_MARKETING_RENTER_PW)" >&2
  exit 1
fi

# Marketing fixture emails are hardcoded in setup-marketing-fixtures.mjs
BLOCKER_EMAIL="goose@padmagnet.com"
BLOCKED_EMAIL="maverick@padmagnet.com"

echo "[1/4] Clearing app data so no auth session leaks from prior run..."
adb shell pm clear "$APP_ID" >/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/_disable_dev_fab.sh"

source "$(dirname "${BASH_SOURCE[0]}")/_dev_client_warmup.sh"

echo "[4/4] Running Maestro smoke (Goose blocks Maverick)..."
cd "$MAESTRO_DIR"
exec maestro test \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e BLOCKER_EMAIL="$BLOCKER_EMAIL" \
  -e BLOCKED_EMAIL="$BLOCKED_EMAIL" \
  -e BLOCKER_PASSWORD="$GOOSE_PW" \
  flows/smoke/block_user_from_conversation.yaml
