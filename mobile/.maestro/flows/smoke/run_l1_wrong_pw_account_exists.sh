#!/usr/bin/env bash
# Wrapper for auth_l1_wrong_pw_account_exists.yaml.
#
# Proves the email-enumeration silent-fail fix (B3): when a user types
# an existing email + wrong password and taps "Create new account" in
# the JIT signup alert, Supabase silently returns no-session. The new
# code detects this (empty identities array) and shows an honest
# "Account exists" alert instead of the prior "Check your email" lie.
#
# Wrapper seeds a real user via REST so the smoke has a deterministic
# fixture for the existing-email case.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_l1_wrong_pw_account_exists.sh
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

echo "[2/5] Re-binding dev client to Metro at ${METRO_URL}..."
adb shell am start -W -a android.intent.action.VIEW -d "$DEV_CLIENT_DEEP_LINK" >/dev/null
sleep 6

echo "[3/5] Tapping the dev menu Continue button (fixed coord) twice..."
adb shell input tap 540 1972 >/dev/null
sleep 3
adb shell input tap 540 1972 >/dev/null
sleep 5

# ─── Seed an existing email-confirmed user. The smoke will type this ───
# ─── email + a DIFFERENT password to trigger the wrong-PW path.       ───

TIMESTAMP=$(date +%s%3N 2>/dev/null || date +%s000)
EXISTING_EMAIL="maestro-existing-${TIMESTAMP}@test.padmagnet.com"
KNOWN_PASSWORD="MaestroKnown123!"
WRONG_PASSWORD="MaestroWrong999!"

echo "[4/5] Seeding existing test user ${EXISTING_EMAIL}..."
CREATE_BODY=$(curl -s -X POST \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EXISTING_EMAIL}\",\"password\":\"${KNOWN_PASSWORD}\",\"email_confirm\":true}" \
  "${SUPABASE_URL}/auth/v1/admin/users")

USER_ID=$(printf '%s' "$CREATE_BODY" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or '')" 2>/dev/null || echo "")
if [ -z "$USER_ID" ]; then
  echo "Error: admin create did not return a user id. Response:" >&2
  echo "$CREATE_BODY" >&2
  exit 1
fi
echo "       created auth user $USER_ID (known PW: $KNOWN_PASSWORD)"

echo "[5/5] Running Maestro smoke (env-vars: EXISTING_USER_EMAIL/_KNOWN_PW/_WRONG_PW/_ID)..."
cd "$MAESTRO_DIR"
exec maestro test \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e EXISTING_USER_EMAIL="$EXISTING_EMAIL" \
  -e EXISTING_USER_KNOWN_PW="$KNOWN_PASSWORD" \
  -e EXISTING_USER_WRONG_PW="$WRONG_PASSWORD" \
  -e EXISTING_USER_ID="$USER_ID" \
  flows/smoke/auth_l1_wrong_pw_account_exists.yaml
