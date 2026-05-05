#!/usr/bin/env bash
# Wrapper for auth_owner_firsttime_interposition.yaml.
#
# Verifies that signing in via the OWNER L1 sheet (manila-l1-primary-cta
# on owner home) routes a no-display_name owner to the firstTime Edit
# Profile screen, NOT directly to /owner/create or /(owner)/listings.
#
# Pre-fix (before commit d4839c3 on 2026-05-03): owners short-circuited
# in lib/routing.js — `if (role === 'owner') return intendedDest || '/(owner)/home'`
# bypassed maybeInterposeFirstTimeProfile entirely. Owners signing up
# from the L1 manila card landed on the listing studio with NULL
# display_name. Renters seeing inbound messages saw blank "from" labels.
# Fix extends interposition to BOTH roles.
#
# Seed differs from the renter version: we set user_metadata.role='owner'
# on creation so the handle_new_user trigger writes profiles.role='owner'
# (otherwise the trigger defaults to 'tenant').
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_owner_l1_firsttime_interposition.sh
set -euo pipefail

APP_ID="com.padmagnet.app"
METRO_URL="${METRO_URL:-http://10.0.0.205:8081}"
DEV_CLIENT_DEEP_LINK="exp+padmagnet://expo-development-client/?url=${METRO_URL}"
SMOKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(cd "$SMOKE_DIR/../.." && pwd)"
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

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: required Supabase vars missing from $ENV_FILE" >&2
  exit 1
fi

echo "[1/5] Clearing app data so no auth session leaks from prior run..."
adb shell pm clear "$APP_ID" >/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/_disable_dev_fab.sh"

echo "[2/5] Re-binding dev client to Metro at ${METRO_URL}..."
adb shell am start -W -a android.intent.action.VIEW -d "$DEV_CLIENT_DEEP_LINK" >/dev/null
sleep 6

echo "[3/5] Tapping the dev menu Continue button (fixed coord) twice..."
adb shell input tap 540 1972 >/dev/null
sleep 3
adb shell input tap 540 1972 >/dev/null
sleep 5

# ─── Seed a fresh owner user with display_name=NULL. user_metadata.role
# ─── is the field handle_new_user trigger reads to set profiles.role.

TIMESTAMP=$(date +%s%3N 2>/dev/null || date +%s000)
SEED_EMAIL="maestro-noname-owner-${TIMESTAMP}@test.padmagnet.com"
SEED_PASSWORD="MaestroTest123!"

echo "[4/5] Seeding no-name OWNER test user ${SEED_EMAIL}..."
CREATE_BODY=$(curl -s -X POST \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SEED_EMAIL}\",\"password\":\"${SEED_PASSWORD}\",\"email_confirm\":true,\"user_metadata\":{\"role\":\"owner\"}}" \
  "${SUPABASE_URL}/auth/v1/admin/users")

USER_ID=$(printf '%s' "$CREATE_BODY" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or '')" 2>/dev/null || echo "")
if [ -z "$USER_ID" ]; then
  echo "Error: admin create did not return a user id. Response:" >&2
  echo "$CREATE_BODY" >&2
  exit 1
fi
echo "       created auth user $USER_ID with role=owner (display_name NULL by trigger default)"

echo "[5/5] Running Maestro smoke (env-vars: NONAME_OWNER_EMAIL/_PASSWORD/_ID)..."
cd "$MAESTRO_DIR"
exec maestro test \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e NONAME_OWNER_EMAIL="$SEED_EMAIL" \
  -e NONAME_OWNER_PASSWORD="$SEED_PASSWORD" \
  -e NONAME_OWNER_ID="$USER_ID" \
  -e NONAME_USER_ID="$USER_ID" \
  flows/smoke/auth_owner_firsttime_interposition.yaml
