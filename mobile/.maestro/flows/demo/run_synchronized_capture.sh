#!/usr/bin/env bash
# DRAFT — DO NOT RUN WITHOUT CHRIS'S SIGN-OFF.
#
# Orchestrates one demo capture take. Per-take steps:
#   1. Reset DB chat state (re-time baseline + delete prior live sends)
#   2. Start adb screenrecord on both phones in parallel (35s max each)
#   3. Kick off Maestro flows on both phones in parallel
#   4. Wait for both Maestro flows to finish
#   5. Wait for screen recordings to self-terminate (--time-limit 35)
#   6. Pull both MP4s into recordings/take-NN/
#   7. Print summary + open the output folder
#
# Usage:
#   cd mobile/.maestro
#   bash flows/demo/run_synchronized_capture.sh           # take=1
#   bash flows/demo/run_synchronized_capture.sh 3         # take=3
#
# Output:
#   recordings/take-NN/owner_capture_S10.mp4
#   recordings/take-NN/renter_capture_S24.mp4
#   recordings/take-NN/SUMMARY.txt

set -uo pipefail   # NOT -e: we want to continue past minor failures + report

# ── Constants ────────────────────────────────────────────────────────
S10_SERIAL="RF8R51L94GR"   # Maverick — Owner
S24_SERIAL="R5CX153GL5R"   # Goose — Renter

TAKE="${1:-1}"
TAKE_PADDED=$(printf '%02d' "$TAKE")

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$MAESTRO_DIR/../.." && pwd)"
OUT_DIR="$MAESTRO_DIR/recordings/take-$TAKE_PADDED"

OWNER_FLOW="$SCRIPT_DIR/owner_capture.yaml"
RENTER_FLOW="$SCRIPT_DIR/renter_capture.yaml"
RESET_SCRIPT="$REPO_ROOT/scripts/reset-demo-chat-state.mjs"

mkdir -p "$OUT_DIR"
SUMMARY="$OUT_DIR/SUMMARY.txt"

# ── Pre-flight ───────────────────────────────────────────────────────
echo "=== Demo capture take $TAKE_PADDED ===" | tee "$SUMMARY"
echo "Output: $OUT_DIR" | tee -a "$SUMMARY"
echo "Started: $(date)" | tee -a "$SUMMARY"
echo "" | tee -a "$SUMMARY"

# Verify both devices visible
DEVICES=$(adb devices | grep -E "^($S10_SERIAL|$S24_SERIAL)\s+device$" | wc -l)
if [ "$DEVICES" -ne 2 ]; then
  echo "✗ Need both S10 ($S10_SERIAL) and S24 ($S24_SERIAL) connected. Found $DEVICES/2." | tee -a "$SUMMARY"
  adb devices | tee -a "$SUMMARY"
  exit 1
fi
echo "✓ Both devices connected" | tee -a "$SUMMARY"

# ── 1. Reset DB state ─────────────────────────────────────────────────
# cd to repo root so the reset script's relative .env.local path resolves.
echo "" | tee -a "$SUMMARY"
echo "[1/6] Resetting demo chat state..." | tee -a "$SUMMARY"
( cd "$REPO_ROOT" && RESET_LIVE=1 node "$RESET_SCRIPT" ) 2>&1 | tee -a "$SUMMARY"
RESET_RC=${PIPESTATUS[0]}
if [ "$RESET_RC" -ne 0 ]; then
  echo "✗ State reset failed — aborting take" | tee -a "$SUMMARY"
  exit 1
fi

# ── 2. Start screen recordings (background) ──────────────────────────
# adb shell needs the entire remote command as a single quoted string,
# otherwise --flags get parsed by the local shell before being forwarded
# and the device's screenrecord sees no output-file arg.
echo "" | tee -a "$SUMMARY"
echo "[2/6] Starting screen recordings (35s max each)..." | tee -a "$SUMMARY"
adb -s "$S10_SERIAL" shell "screenrecord --time-limit 35 --bit-rate 8000000 /sdcard/owner_capture.mp4" </dev/null >/dev/null 2>&1 &
S10_REC_PID=$!
adb -s "$S24_SERIAL" shell "screenrecord --time-limit 35 --bit-rate 8000000 /sdcard/renter_capture.mp4" </dev/null >/dev/null 2>&1 &
S24_REC_PID=$!
echo "✓ S10 recording (pid $S10_REC_PID), S24 recording (pid $S24_REC_PID)" | tee -a "$SUMMARY"

# Brief delay so screenrecord stabilizes before app launch
sleep 2

# ── 3. Run Maestro flows in parallel ─────────────────────────────────
# CRITICAL: --device must come BEFORE the `test` subcommand on Maestro CLI.
# Using ANDROID_SERIAL env var DOES NOT propagate to the Maestro JVM —
# both flows ended up driving the same device. Per `maestro --help`, the
# correct flag is --device (alias --udid) at the parent command level.
#
# CRITICAL: --debug-output gives each Maestro instance its own debug log
# directory, preventing the file-lock conflict at end-of-run zip cleanup
# which previously caused JVMs to hang during their finalize step.
echo "" | tee -a "$SUMMARY"
echo "[3/6] Launching Maestro on both devices..." | tee -a "$SUMMARY"
S10_LOG="$OUT_DIR/owner_maestro.log"
S24_LOG="$OUT_DIR/renter_maestro.log"
S10_DEBUG="$OUT_DIR/owner_debug"
S24_DEBUG="$OUT_DIR/renter_debug"

# --flatten-debug-output suppresses the timestamped subdir Maestro otherwise
# creates in $TEMP\mobile_dev\maestro\Logs\<ts>; without this the post-run
# zip step crashes on a missing directory when two JVMs race the same path.
maestro --device "$S10_SERIAL" test --flatten-debug-output --debug-output "$S10_DEBUG" "$OWNER_FLOW" >"$S10_LOG" 2>&1 &
S10_MAESTRO_PID=$!
echo "  S10 maestro launched (pid $S10_MAESTRO_PID)" | tee -a "$SUMMARY"

# Stagger the second Maestro launch by 3s so the first JVM finishes its
# gRPC port-forwarding bootstrap before the second one starts setting up.
# Without this stagger, both JVMs race for adb's forward-table and one hits
# StatusRuntimeException UNAVAILABLE. Renter flow's 18s extendedWaitUntil
# absorbs the 3s offset cleanly.
sleep 3

maestro --device "$S24_SERIAL" test --flatten-debug-output --debug-output "$S24_DEBUG" "$RENTER_FLOW" >"$S24_LOG" 2>&1 &
S24_MAESTRO_PID=$!
echo "  S24 maestro launched (pid $S24_MAESTRO_PID, +3s stagger)" | tee -a "$SUMMARY"

# ── 4. Wait for Maestro flows ────────────────────────────────────────
# Git Bash's `wait $PID` hangs indefinitely when the JVM child crashes
# during its post-run zip cleanup (Windows file-lock quirks). Replace
# with a polling loop using `kill -0` (signal-0 = is-process-alive
# probe) plus a hard 90s safety cap.
poll_until_done() {
  local PID=$1; local LABEL=$2; local MAX=${3:-90}; local C=0
  while kill -0 "$PID" 2>/dev/null; do
    sleep 1; C=$((C + 1))
    if [ $C -ge $MAX ]; then
      echo "  ⚠️  $LABEL (pid $PID) didn't exit within ${MAX}s — force-killing" | tee -a "$SUMMARY"
      kill -9 "$PID" 2>/dev/null || true
      return 1
    fi
  done
  return 0
}

echo "" | tee -a "$SUMMARY"
echo "[4/6] Waiting for Maestro flows to finish..." | tee -a "$SUMMARY"
poll_until_done "$S10_MAESTRO_PID" "S10 maestro" 90
S10_MAESTRO_RC=$?
poll_until_done "$S24_MAESTRO_PID" "S24 maestro" 90
S24_MAESTRO_RC=$?
echo "✓ S10 maestro done (rc=$S10_MAESTRO_RC), S24 maestro done (rc=$S24_MAESTRO_RC)" | tee -a "$SUMMARY"

# ── 5. Wait for screen recordings to self-terminate ──────────────────
# Same polling pattern as Maestro wait — adb shell backgrounded calls
# also confuse Git Bash's `wait`.
echo "" | tee -a "$SUMMARY"
echo "[5/6] Waiting for screen recordings (--time-limit 35) to finish..." | tee -a "$SUMMARY"
poll_until_done "$S10_REC_PID" "S10 screenrecord" 50
poll_until_done "$S24_REC_PID" "S24 screenrecord" 50
echo "✓ Screen recordings finalized on devices" | tee -a "$SUMMARY"

# ── 6. Pull MP4s + cleanup ────────────────────────────────────────────
# Two Git Bash gotchas to handle here:
#   1. /sdcard/... (Android remote path) gets translated by Git Bash
#      into "C:/Program Files/Git/sdcard/..." — fixed via MSYS_NO_PATHCONV=1.
#   2. $OUT_DIR via `pwd` returns Unix-style "/c/Users/chris/..." which
#      adb on Windows can't write to — fixed via `cygpath -w` to convert
#      back to native "C:\Users\chris\..." for the local destination.
#
# Only rm the on-device file if the pull succeeded — otherwise we lose
# the recording forever on a transient pull failure.
WIN_OUT_DIR=$(cygpath -w "$OUT_DIR" 2>/dev/null || echo "$OUT_DIR")

echo "" | tee -a "$SUMMARY"
echo "[6/6] Pulling MP4s..." | tee -a "$SUMMARY"

if MSYS_NO_PATHCONV=1 adb -s "$S10_SERIAL" pull /sdcard/owner_capture.mp4 "$WIN_OUT_DIR\\owner_capture_S10.mp4" 2>&1 | tee -a "$SUMMARY"; then
  MSYS_NO_PATHCONV=1 adb -s "$S10_SERIAL" shell "rm /sdcard/owner_capture.mp4" 2>/dev/null || true
else
  echo "  ⚠️  S10 pull failed — leaving /sdcard/owner_capture.mp4 in place for manual recovery" | tee -a "$SUMMARY"
fi

if MSYS_NO_PATHCONV=1 adb -s "$S24_SERIAL" pull /sdcard/renter_capture.mp4 "$WIN_OUT_DIR\\renter_capture_S24.mp4" 2>&1 | tee -a "$SUMMARY"; then
  MSYS_NO_PATHCONV=1 adb -s "$S24_SERIAL" shell "rm /sdcard/renter_capture.mp4" 2>/dev/null || true
else
  echo "  ⚠️  S24 pull failed — leaving /sdcard/renter_capture.mp4 in place for manual recovery" | tee -a "$SUMMARY"
fi

# ── Summary ──────────────────────────────────────────────────────────
echo "" | tee -a "$SUMMARY"
echo "=== Take $TAKE_PADDED complete ===" | tee -a "$SUMMARY"
echo "Finished: $(date)" | tee -a "$SUMMARY"
ls -lh "$OUT_DIR" | tee -a "$SUMMARY"
echo "" | tee -a "$SUMMARY"

if [ "$S10_MAESTRO_RC" -eq 0 ] && [ "$S24_MAESTRO_RC" -eq 0 ]; then
  echo "✅ Both flows GREEN. Recordings ready at $OUT_DIR/" | tee -a "$SUMMARY"
  exit 0
else
  echo "⚠️  Maestro RED on one or both devices. Logs: $S10_LOG | $S24_LOG" | tee -a "$SUMMARY"
  exit 1
fi
