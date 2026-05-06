#!/usr/bin/env bash
# Wrapper for auth_l1_firsttime_interposition.yaml.
#
# Verifies that signing in via the L1 sheet (password path) routes a
# renter with NO display_name to /settings/edit-profile?firstTime=true,
# NOT to the original L1 surface (Messages tab in this smoke).
#
# Pre-fix: the L1 sheet's handlePassword closed the sheet on success
# without consulting resolvePostLoginDestination — only auth-callback.js
# (magic-link) and index.js (cold launch) ran the resolver. Renters who
# password-signed-in from the L1 sheet stayed on Messages with a NULL
# display_name. Fix wires routeAfterSignIn into all 4 sign-in handlers.
#
# Seed differs from the Welcome-Back smoke: we do NOT PATCH the profile
# row at all. The handle_new_user trigger leaves display_name NULL for
# email signups (migration 076), which is exactly the no-name fixture
# we need for the firstTime interposition path.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_l1_firsttime_interposition.sh
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

source "$(dirname "${BASH_SOURCE[0]}")/_dev_client_warmup.sh"

# ─── Seed a fresh email-signup user. handle_new_user trigger leaves ───
# ─── display_name NULL for email signups (migration 076), which is   ───
# ─── exactly the firstTime fixture we want.                          ───

TIMESTAMP=$(date +%s%3N 2>/dev/null || date +%s000)
SEED_EMAIL="maestro-noname-${TIMESTAMP}@test.padmagnet.com"
SEED_PASSWORD="MaestroTest123!"

echo "[4/5] Seeding no-name test user ${SEED_EMAIL}..."
CREATE_BODY=$(curl -s -X POST \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SEED_EMAIL}\",\"password\":\"${SEED_PASSWORD}\",\"email_confirm\":true}" \
  "${SUPABASE_URL}/auth/v1/admin/users")

USER_ID=$(printf '%s' "$CREATE_BODY" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or '')" 2>/dev/null || echo "")
if [ -z "$USER_ID" ]; then
  echo "Error: admin create did not return a user id. Response:" >&2
  echo "$CREATE_BODY" >&2
  exit 1
fi
echo "       created auth user $USER_ID (display_name NULL by trigger default)"

echo "[5/5] Running Maestro smoke (env-vars: NONAME_USER_EMAIL/_PASSWORD/_ID)..."
cd "$MAESTRO_DIR"
exec maestro test \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e NONAME_USER_EMAIL="$SEED_EMAIL" \
  -e NONAME_USER_PASSWORD="$SEED_PASSWORD" \
  -e NONAME_USER_ID="$USER_ID" \
  flows/smoke/auth_l1_firsttime_interposition.yaml
