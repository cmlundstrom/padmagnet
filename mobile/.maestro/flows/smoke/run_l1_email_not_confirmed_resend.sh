#!/usr/bin/env bash
# Wrapper for auth_l1_email_not_confirmed_resend.yaml.
#
# Proves the B2 fix: when signIn fails with "Email not confirmed", the
# new L1 code calls supabase.auth.resend() for real and shows an
# honest "We just resent your confirmation link" alert. The previous
# code claimed to send an email but never actually called resend.
#
# Wrapper seeds an UNconfirmed user via REST (omits email_confirm so
# email_confirmed_at is null) so the next signIn returns the
# "Email not confirmed" error path.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_l1_email_not_confirmed_resend.sh
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

# ─── Seed an UNCONFIRMED user. Note: omit email_confirm so the new   ───
# ─── auth.users row has email_confirmed_at=null. signIn against it   ───
# ─── then triggers the "Email not confirmed" error path that fires   ───
# ─── our resend logic.                                                ───

TIMESTAMP=$(date +%s%3N 2>/dev/null || date +%s000)
PENDING_EMAIL="maestro-pending-${TIMESTAMP}@test.padmagnet.com"
KNOWN_PASSWORD="MaestroPending123!"

echo "[4/5] Seeding unconfirmed test user ${PENDING_EMAIL}..."
CREATE_BODY=$(curl -s -X POST \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${PENDING_EMAIL}\",\"password\":\"${KNOWN_PASSWORD}\"}" \
  "${SUPABASE_URL}/auth/v1/admin/users")

USER_ID=$(printf '%s' "$CREATE_BODY" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or '')" 2>/dev/null || echo "")
if [ -z "$USER_ID" ]; then
  echo "Error: admin create did not return a user id. Response:" >&2
  echo "$CREATE_BODY" >&2
  exit 1
fi
echo "       created auth user $USER_ID (unconfirmed)"

echo "[5/5] Running Maestro smoke (env-vars: PENDING_USER_EMAIL/_PW/_ID)..."
cd "$MAESTRO_DIR"
exec maestro test \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e PENDING_USER_EMAIL="$PENDING_EMAIL" \
  -e PENDING_USER_PW="$KNOWN_PASSWORD" \
  -e PENDING_USER_ID="$USER_ID" \
  flows/smoke/auth_l1_email_not_confirmed_resend.yaml
