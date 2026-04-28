#!/usr/bin/env bash
# Wrapper for auth_anon_save_migration.yaml.
#
# Proves Fix A (2026-04-28): when an anon renter heart-taps a listing
# then signs up via L1, the new endpoint POST /api/account/migrate-anon
# moves their swipes from the abandoned anon user_id to the new authed
# user_id. Pre-fix, the saved listing was orphaned to the dead anon
# user_id and invisible to the authed user.
#
# Seeds a confirmed user with display_name=NULL so the smoke can
# exercise the same firstTime + intent restoration path that real
# brand-new signups go through.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_anon_save_migration.sh
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

echo "[1/5] Clearing app data..."
adb shell pm clear "$APP_ID" >/dev/null

echo "[2/5] Re-binding dev client to Metro at ${METRO_URL}..."
adb shell am start -W -a android.intent.action.VIEW -d "$DEV_CLIENT_DEEP_LINK" >/dev/null
sleep 6

echo "[3/5] Tapping the dev menu Continue button (fixed coord) twice..."
adb shell input tap 540 1972 >/dev/null
sleep 3
adb shell input tap 540 1972 >/dev/null
sleep 5

TIMESTAMP=$(date +%s%3N 2>/dev/null || date +%s000)
SEED_EMAIL="maestro-anonsave-${TIMESTAMP}@test.padmagnet.com"
SEED_PASSWORD="MaestroAnonSave123!"

echo "[4/5] Seeding test user ${SEED_EMAIL}..."
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

echo "[5/5] Running Maestro smoke (env-vars: ANONSAVE_USER_EMAIL/_PW/_ID)..."
cd "$MAESTRO_DIR"
exec maestro test \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e ANONSAVE_USER_EMAIL="$SEED_EMAIL" \
  -e ANONSAVE_USER_PW="$SEED_PASSWORD" \
  -e ANONSAVE_USER_ID="$USER_ID" \
  flows/smoke/auth_anon_save_migration.yaml
