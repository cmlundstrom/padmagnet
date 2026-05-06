#!/usr/bin/env bash
# Mints a magic-link deep-link URL for a freshly-seeded test user.
# Replaces the email-tap step in automated magic-link smoke tests.
#
# Flow:
#   1. Create test user via Supabase admin API (POST /auth/v1/admin/users).
#   2. Mint magic link via admin generate_link API. Returns action_link
#      (the Supabase verify URL with embedded token).
#   3. HEAD-request the action_link with --max-redirs 0 to capture the
#      Location header — that's the final URL with tokens in the hash:
#      https://padmagnet.com/auth/mobile-callback?nonce=...#access_token=...
#   4. Print USER_ID|EMAIL|DEEP_LINK_URL to stdout (pipe-separated).
#
# Usage:
#   bash mint_magic_link_url.sh <role> <display_name>
#   role: 'tenant' (default) or 'owner'
#   display_name: human-readable test name (default 'Magic Link Test')
#
# Exit non-zero on any HTTP failure with stderr explanation.
#
# Environment requires (sourced from repo-root .env.local):
#   NEXT_PUBLIC_SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
set -euo pipefail

ROLE="${1:-tenant}"
DISPLAY_NAME="${2:-Magic Link Test}"

# Read .env.local. The file isn't always shell-safe (comments, multi-line
# values), so extract only the two keys we need via grep+cut, matching the
# pattern used by mobile/.maestro/run.sh.
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env.local not found at $ENV_FILE" >&2
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
SUPABASE_SERVICE_ROLE_KEY=$(extract_env "SUPABASE_SERVICE_ROLE_KEY")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from $ENV_FILE" >&2
  exit 1
fi
TS=$(date +%s%N)
EMAIL="maestro-magiclink-${TS}@test.padmagnet.com"
PASSWORD="MagicLink${TS}!"

# 1. Create user
CREATE_RESP=$(curl -sS -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"email_confirm\":true,\"user_metadata\":{\"role\":\"${ROLE}\",\"display_name\":\"${DISPLAY_NAME}\"}}")

USER_ID=$(echo "$CREATE_RESP" | python -c "import sys,json
try:
    d = json.load(sys.stdin)
    print(d['id'])
except Exception as e:
    sys.stderr.write(f'create_user parse failed: {e}\\n')
    sys.exit(1)" 2>&1) || { echo "ERROR: create user response: $CREATE_RESP" >&2; exit 1; }

# 2. Generate magic link.
# redirect_to MUST be top-level for the Supabase admin API (per the response
# format observed 2026-05-05 — options.redirect_to is silently ignored).
# The redirect_to value MUST also be on the Supabase email-auth allowlist
# (Authentication → URL Configuration → Redirect URLs) — padmagnet.com itself
# is the Site URL so the bare path is implicitly allowed.
LINK_RESP=$(curl -sS -X POST "${SUPABASE_URL}/auth/v1/admin/generate_link" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"magiclink\",\"email\":\"${EMAIL}\",\"redirect_to\":\"https://padmagnet.com/auth/mobile-callback\"}")

# action_link is at the TOP LEVEL of the response (not nested in 'properties').
ACTION_LINK=$(echo "$LINK_RESP" | python -c "import sys,json
try:
    d = json.load(sys.stdin)
    print(d['action_link'])
except Exception as e:
    sys.stderr.write(f'generate_link parse failed: {e}\\n')
    sys.exit(1)" 2>&1) || { echo "ERROR: generate_link response: $LINK_RESP" >&2; exit 1; }

# 3. GET the action_link WITHOUT following redirects to capture the
# tokens-bearing Location header. Plain `curl` doesn't follow redirects
# unless -L is set; %{redirect_url} reports the Location of the first
# 3xx response. -I (HEAD) is rejected by Supabase verify with 405, so
# this is GET with body discarded.
DEEP_LINK_URL=$(curl -sS --max-time 10 -o /dev/null -w "%{redirect_url}" "${ACTION_LINK}")

if [ -z "$DEEP_LINK_URL" ]; then
  echo "ERROR: action_link did not redirect. action_link=$ACTION_LINK" >&2
  echo "Headers from action_link:" >&2
  curl -sS --max-time 10 -D - -o /dev/null "${ACTION_LINK}" >&2
  exit 1
fi

# Sanity check: redirect URL must contain access_token (in hash).
if ! echo "$DEEP_LINK_URL" | grep -q "access_token="; then
  echo "ERROR: redirect URL missing access_token. URL=$DEEP_LINK_URL" >&2
  exit 1
fi

# 4. Pipe-separated output
echo "${USER_ID}|${EMAIL}|${DEEP_LINK_URL}"
