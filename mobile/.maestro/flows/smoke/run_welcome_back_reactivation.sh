#!/usr/bin/env bash
# Wrapper for auth_welcome_back_reactivation.yaml.
#
# Differs from the other smoke wrappers because Maestro's GraalJS http
# shim only exposes get/post/delete (no patch/put), and the seed needs a
# PATCH against profiles to set archived_at. So the wrapper does the
# seed in bash with curl (which handles all verbs) and passes the result
# into Maestro as env vars via `-e` flags.
#
# What this does:
#   1. adb pm clear   → wipes AsyncStorage + cached Supabase session
#   2. adb am start   → relaunches dev client with Metro URL bound
#   3. adb input tap  → dismisses dev menu first-launch dialog (blind)
#   4. seed user      → admin POST /auth/v1/admin/users (auth.users +
#                       trigger creates profiles row)
#   5. archive profile → PATCH /rest/v1/profiles?id=eq.X (sets
#                        archived_at + display_name)
#   6. maestro test   → invokes Maestro with the seeded credentials
#                       passed as -e env vars
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_welcome_back_reactivation.sh
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

echo "[1/6] Clearing app data so no auth session leaks from prior run..."
adb shell pm clear "$APP_ID" >/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/_disable_dev_fab.sh"

echo "[2/6] Re-binding dev client to Metro at ${METRO_URL}..."
adb shell am start -W -a android.intent.action.VIEW -d "$DEV_CLIENT_DEEP_LINK" >/dev/null
sleep 6

echo "[3/6] Tapping the dev menu Continue button (fixed coord) twice..."
adb shell input tap 540 1972 >/dev/null
sleep 3
adb shell input tap 540 1972 >/dev/null
sleep 5

# ─── Seed: create a fresh archived user via REST. Bash handles PATCH; ───
# ─── Maestro's GraalJS http shim does not.                             ───

TIMESTAMP=$(date +%s%3N 2>/dev/null || date +%s000)
SEED_EMAIL="maestro-archived-${TIMESTAMP}@test.padmagnet.com"
SEED_PASSWORD="MaestroTest123!"
SEED_DISPLAY_NAME="Archived Tester"

echo "[4/6] Seeding archived test user ${SEED_EMAIL}..."
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
echo "       created auth user $USER_ID"

ARCHIVED_AT=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
echo "[5/6] Archiving profile $USER_ID at $ARCHIVED_AT..."
PATCH_HTTP=$(curl -s -o /tmp/seed_patch_resp.txt -w "%{http_code}" -X PATCH \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"archived_at\":\"${ARCHIVED_AT}\",\"display_name\":\"${SEED_DISPLAY_NAME}\"}" \
  "${SUPABASE_URL}/rest/v1/profiles?id=eq.${USER_ID}")

if [ "$PATCH_HTTP" -ge 300 ]; then
  echo "Error: profile PATCH HTTP $PATCH_HTTP" >&2
  cat /tmp/seed_patch_resp.txt >&2
  # Best-effort cleanup of the orphan auth user we just created
  curl -s -X DELETE \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    "${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}" >/dev/null || true
  exit 1
fi
echo "       profile archived"

echo "[6/6] Running Maestro smoke (env-vars: ARCHIVED_USER_EMAIL/_PASSWORD/_ID)..."
cd "$MAESTRO_DIR"
exec maestro test \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e ARCHIVED_USER_EMAIL="$SEED_EMAIL" \
  -e ARCHIVED_USER_PASSWORD="$SEED_PASSWORD" \
  -e ARCHIVED_USER_ID="$USER_ID" \
  flows/smoke/auth_welcome_back_reactivation.yaml
