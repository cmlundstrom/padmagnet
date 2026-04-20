#!/usr/bin/env bash
set -euo pipefail

# Runs a Maestro flow against PadMagnet, pulling Supabase credentials from
# the repo-root .env.local at runtime (no duplicated secrets files).
#
# Usage:
#   ./run.sh flows/smoke/anon_upgrade.yaml
#   ./run.sh flows/smoke/

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MAESTRO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

# Optional: credentials for real-account flows (e.g. owner_l1_autodismiss
# uses info@floridapm.net which already owns listings). Absent for flows
# that only seed throwaway users via the Admin API.
MAESTRO_OWNER_TEST_EMAIL=$(extract_env "MAESTRO_OWNER_TEST_EMAIL")
MAESTRO_OWNER_TEST_PASSWORD=$(extract_env "MAESTRO_OWNER_TEST_PASSWORD")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: required Supabase vars missing from $ENV_FILE" >&2
  exit 1
fi

cd "$MAESTRO_DIR"
exec maestro test \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e MAESTRO_OWNER_TEST_EMAIL="$MAESTRO_OWNER_TEST_EMAIL" \
  -e MAESTRO_OWNER_TEST_PASSWORD="$MAESTRO_OWNER_TEST_PASSWORD" \
  "$@"
