#!/usr/bin/env bash
# Sequential smoke-suite runner. Iterates each named wrapper, captures
# pass/fail + duration, writes a summary file. Each wrapper script does
# its own pm-clear + dev-client rebind, so failures don't bleed forward.
#
# Usage: cd mobile/.maestro && ./flows/smoke/run_overnight_batch.sh
#
# The summary file (run_overnight_batch.summary) is the parseable output
# Claude reads at the end.

set +e  # don't bail on first failure — collect all results
START_TS=$(date +%s)
SMOKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(cd "$SMOKE_DIR/../.." && pwd)"
LOG_DIR="$MAESTRO_DIR/overnight-logs-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"
SUMMARY="$LOG_DIR/SUMMARY.txt"

# List of wrappers to run (relative to .maestro dir). Order matters —
# auth-related smokes first since today's commits are auth-heavy. Each
# entry is "wrapper-script | description".
SMOKES=(
  "flows/smoke/run_l1_wrong_pw_account_exists.sh|renter L1 wrong-pw → Account exists (B3 fix)"
  "flows/smoke/run_l1_email_not_confirmed_resend.sh|renter L1 email_not_confirmed resend (B2 fix)"
  "flows/smoke/run_l1_firsttime_interposition.sh|renter L1 firstTime Edit Profile interposition"
  "flows/smoke/run_welcome_back_reactivation.sh|Welcome-Back archived-user reactivation"
  "flows/smoke/run_owner_l1_autodismiss.sh|owner L1 autodismiss with active listings (info@floridapm.net)"
  "flows/smoke/run_anon_save_migration.sh|anon swipes migrate to authed user_id (Fix A)"
  "flows/smoke/run_auth_intent_preserves_listing.sh|post-auth intent restoration to listing message (Fix B)"
  "flows/smoke/run_renter_onboarding.sh|renter firstTime Edit Profile end-to-end save"
)

PASS_COUNT=0
FAIL_COUNT=0

echo "=== Overnight smoke batch — $(date) ===" | tee "$SUMMARY"
echo "Log dir: $LOG_DIR" | tee -a "$SUMMARY"
echo "" | tee -a "$SUMMARY"

cd "$MAESTRO_DIR"

for entry in "${SMOKES[@]}"; do
  WRAPPER="${entry%%|*}"
  DESC="${entry##*|}"
  NAME="$(basename "$WRAPPER" .sh)"
  LOG="$LOG_DIR/${NAME}.log"

  echo "" | tee -a "$SUMMARY"
  echo "── $NAME ── $DESC" | tee -a "$SUMMARY"
  T0=$(date +%s)

  bash "$WRAPPER" >"$LOG" 2>&1
  RC=$?

  T1=$(date +%s)
  DURATION=$((T1-T0))

  if [ $RC -eq 0 ]; then
    echo "  PASS in ${DURATION}s" | tee -a "$SUMMARY"
    PASS_COUNT=$((PASS_COUNT+1))
  else
    echo "  FAIL in ${DURATION}s (exit $RC)" | tee -a "$SUMMARY"
    echo "  --- last 30 lines of log ---" | tee -a "$SUMMARY"
    tail -30 "$LOG" | sed 's/^/    /' | tee -a "$SUMMARY"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
done

END_TS=$(date +%s)
TOTAL=$((END_TS-START_TS))

echo "" | tee -a "$SUMMARY"
echo "=== Done in ${TOTAL}s — PASS: $PASS_COUNT, FAIL: $FAIL_COUNT ===" | tee -a "$SUMMARY"
echo "" | tee -a "$SUMMARY"
echo "(Per-smoke logs in $LOG_DIR)" | tee -a "$SUMMARY"

# exit 0 always — Claude reads the SUMMARY for pass/fail breakdown
exit 0
