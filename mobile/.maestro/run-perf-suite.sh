#!/usr/bin/env bash
# One-shot runner for the 6 perf flows. Runs them sequentially (single
# device), captures pass/fail per flow, prints a clean summary at the end.
#
# Usage: ./run-perf-suite.sh [output-file]
# If output-file is omitted, results go to perf-suite-$(date).log

set +e  # do not abort on first failure — we want a full report

cd "$(dirname "${BASH_SOURCE[0]}")"

OUT="${1:-perf-suite-$(date +%Y%m%d-%H%M%S).log}"
SUMMARY="${OUT%.log}.summary"

FLOWS=(
  "flows/perf/listings_perf_and_integrity.yaml"
  "flows/perf/listing_studio_integrity.yaml"
  "flows/perf/preview_fast_open.yaml"
  "flows/perf/edit_listing_open_time.yaml"
  "flows/perf/photo_reorder_arrows.yaml"
)

PASSED=()
FAILED=()

echo "=== Maestro perf suite — $(date) ===" | tee -a "$OUT"
echo "" | tee -a "$OUT"

for flow in "${FLOWS[@]}"; do
  name=$(basename "$flow" .yaml)
  echo "--- $name ---" | tee -a "$OUT"
  start=$(date +%s)
  ./run.sh "$flow" >> "$OUT" 2>&1
  rc=$?
  end=$(date +%s)
  duration=$((end - start))
  if [ $rc -eq 0 ]; then
    PASSED+=("$name (${duration}s)")
    echo "  PASS in ${duration}s" | tee -a "$OUT"
  else
    FAILED+=("$name (rc=$rc, ${duration}s)")
    echo "  FAIL rc=$rc in ${duration}s" | tee -a "$OUT"
  fi
  echo "" | tee -a "$OUT"
  sleep 2
done

# Final summary
{
  echo "===================="
  echo "SUMMARY: ${#PASSED[@]}/${#FLOWS[@]} flows passed"
  echo ""
  if [ ${#PASSED[@]} -gt 0 ]; then
    echo "PASSING:"
    for p in "${PASSED[@]}"; do echo "  - $p"; done
    echo ""
  fi
  if [ ${#FAILED[@]} -gt 0 ]; then
    echo "FAILING:"
    for f in "${FAILED[@]}"; do echo "  - $f"; done
    echo ""
    echo "Full log: $OUT"
  fi
  echo "===================="
} | tee "$SUMMARY"
