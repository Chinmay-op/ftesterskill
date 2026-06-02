#!/usr/bin/env bash
# diff-screenshots.sh — Compare current screenshots against baselines for visual regression.
# Usage: bash scripts/diff-screenshots.sh [screenshots-dir] [baselines-dir] [threshold]
#        bash scripts/diff-screenshots.sh output/screenshots output/baselines 0.1
#        bash scripts/diff-screenshots.sh --help

set -euo pipefail

# ─── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash diff-screenshots.sh [screenshots-dir] [baselines-dir] [threshold-pct]"
  echo ""
  echo "Compares current screenshots against baseline screenshots to detect"
  echo "visual regressions. Uses pixelmatch (Node.js) or ImageMagick compare."
  echo ""
  echo "Arguments:"
  echo "  screenshots-dir  Directory with current screenshots (default: output/screenshots)"
  echo "  baselines-dir    Directory with baseline screenshots (default: output/baselines)"
  echo "  threshold-pct    Max allowed pixel difference percentage (default: 0.1)"
  echo ""
  echo "Output:"
  echo "  output/diffs/         — Diff images highlighting pixel changes"
  echo "  output/diff-report.txt — Summary of all comparisons"
  echo ""
  echo "Exit codes:"
  echo "  0  — All screenshots match baselines within threshold"
  echo "  1  — One or more screenshots exceed the threshold"
  echo "  2  — Missing baselines or tool errors"
  exit 0
fi

# ─── Config ──────────────────────────────────────────────────────────────────
SCREENSHOTS_DIR="${1:-output/screenshots}"
BASELINES_DIR="${2:-output/baselines}"
THRESHOLD_PCT="${3:-0.1}"
DIFFS_DIR="output/diffs"
REPORT_FILE="output/diff-report.txt"
FAIL=0

mkdir -p "$DIFFS_DIR"

echo "═══════════════════════════════════════════════════════"
echo "  🔍 VISUAL REGRESSION DIFF"
echo "  Current:   ${SCREENSHOTS_DIR}/"
echo "  Baselines: ${BASELINES_DIR}/"
echo "  Threshold: ${THRESHOLD_PCT}%"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── Validate Directories ───────────────────────────────────────────────────
if [[ ! -d "$SCREENSHOTS_DIR" ]]; then
  echo "❌ ERROR: Screenshots directory not found: ${SCREENSHOTS_DIR}"
  echo "   Run the DOM tests first: bash scripts/run-dom-tests.sh"
  exit 2
fi

if [[ ! -d "$BASELINES_DIR" ]]; then
  echo "❌ ERROR: Baselines directory not found: ${BASELINES_DIR}"
  echo "   Capture baselines first: bash scripts/capture-baselines.sh"
  exit 2
fi

# ─── Detect Diff Tool ───────────────────────────────────────────────────────
DIFF_TOOL=""

# Prefer pixelmatch via Node.js inline script
if command -v node &>/dev/null; then
  DIFF_TOOL="pixelmatch"
  echo "✅ Using pixelmatch (Node.js) for pixel comparison"
# Fallback to ImageMagick compare
elif command -v compare &>/dev/null; then
  DIFF_TOOL="imagemagick"
  echo "✅ Using ImageMagick compare for pixel comparison"
else
  echo "❌ ERROR: Neither Node.js nor ImageMagick found."
  echo "   Install Node.js (recommended) or ImageMagick."
  exit 2
fi
echo ""

# ─── Initialize Report ──────────────────────────────────────────────────────
{
  echo "═══════════════════════════════════════════════════════"
  echo "  VISUAL REGRESSION REPORT"
  echo "  Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "  Threshold: ${THRESHOLD_PCT}%"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  printf "%-45s %12s %8s\n" "FILE" "DIFF %" "STATUS"
  printf "%-45s %12s %8s\n" "────" "──────" "──────"
} > "$REPORT_FILE"

# ─── Compare Screenshots ────────────────────────────────────────────────────
TOTAL=0
PASSED=0
CHANGED=0
MISSING_BASELINE=0

for screenshot in "${SCREENSHOTS_DIR}"/*.png; do
  [[ -f "$screenshot" ]] || continue

  FILENAME=$(basename "$screenshot")
  TOTAL=$((TOTAL + 1))

  # Find matching baseline (try exact name and -baseline variant)
  BASELINE_NAME="${FILENAME%.png}-baseline.png"
  BASELINE_PATH="${BASELINES_DIR}/${BASELINE_NAME}"

  if [[ ! -f "$BASELINE_PATH" ]]; then
    # Try exact same filename
    BASELINE_PATH="${BASELINES_DIR}/${FILENAME}"
  fi

  if [[ ! -f "$BASELINE_PATH" ]]; then
    echo "   ⚠️  No baseline for: ${FILENAME}"
    printf "%-45s %12s %8s\n" "$FILENAME" "N/A" "NO BASE" >> "$REPORT_FILE"
    MISSING_BASELINE=$((MISSING_BASELINE + 1))
    continue
  fi

  DIFF_OUTPUT="${DIFFS_DIR}/diff-${FILENAME}"

  # ── Pixelmatch comparison ──
  if [[ "$DIFF_TOOL" == "pixelmatch" ]]; then
    DIFF_RESULT=$(node -e "
      const fs = require('fs');
      const { PNG } = require('pngjs');

      try {
        const img1 = PNG.sync.read(fs.readFileSync('${screenshot}'));
        const img2 = PNG.sync.read(fs.readFileSync('${BASELINE_PATH}'));

        const width = Math.max(img1.width, img2.width);
        const height = Math.max(img1.height, img2.height);
        const totalPixels = width * height;

        // Size mismatch is a 100% diff
        if (img1.width !== img2.width || img1.height !== img2.height) {
          console.log('100.0');
          process.exit(0);
        }

        const pixelmatch = require('pixelmatch');
        const diff = new PNG({ width, height });
        const numDiff = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
        const pct = ((numDiff / totalPixels) * 100).toFixed(4);

        fs.writeFileSync('${DIFF_OUTPUT}', PNG.sync.write(diff));
        console.log(pct);
      } catch (e) {
        // Fallback: report as error
        console.error(e.message);
        console.log('-1');
      }
    " 2>/dev/null) || DIFF_RESULT="-1"

  # ── ImageMagick comparison ──
  elif [[ "$DIFF_TOOL" == "imagemagick" ]]; then
    DIFF_RESULT=$(compare -metric AE "$screenshot" "$BASELINE_PATH" "$DIFF_OUTPUT" 2>&1 || true)
    # Convert absolute pixel count to percentage
    TOTAL_PIXELS=$(identify -format '%[fx:w*h]' "$screenshot" 2>/dev/null || echo "1")
    if [[ "$TOTAL_PIXELS" -gt 0 && "$DIFF_RESULT" =~ ^[0-9]+$ ]]; then
      DIFF_RESULT=$(echo "scale=4; ($DIFF_RESULT / $TOTAL_PIXELS) * 100" | bc 2>/dev/null || echo "-1")
    else
      DIFF_RESULT="-1"
    fi
  fi

  # ── Evaluate result ──
  if [[ "$DIFF_RESULT" == "-1" ]]; then
    echo "   ⚠️  Error comparing: ${FILENAME}"
    printf "%-45s %12s %8s\n" "$FILENAME" "ERROR" "⚠️" >> "$REPORT_FILE"
    FAIL=1
  else
    IS_OVER=$(echo "${DIFF_RESULT} > ${THRESHOLD_PCT}" | bc -l 2>/dev/null || echo "0")

    if [[ "$IS_OVER" == "1" ]]; then
      echo "   ❌ CHANGED: ${FILENAME} (${DIFF_RESULT}% diff)"
      printf "%-45s %10s%% %8s\n" "$FILENAME" "$DIFF_RESULT" "❌ FAIL" >> "$REPORT_FILE"
      CHANGED=$((CHANGED + 1))
      FAIL=1
    else
      echo "   ✅ Match: ${FILENAME} (${DIFF_RESULT}% diff)"
      printf "%-45s %10s%% %8s\n" "$FILENAME" "$DIFF_RESULT" "✅ PASS" >> "$REPORT_FILE"
      PASSED=$((PASSED + 1))
    fi
  fi
done

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
{
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  SUMMARY"
  echo "  Total compared: ${TOTAL}"
  echo "  Passed: ${PASSED}"
  echo "  Changed (over ${THRESHOLD_PCT}%): ${CHANGED}"
  echo "  Missing baseline: ${MISSING_BASELINE}"
  echo "  Diff images: ${DIFFS_DIR}/"
  echo "═══════════════════════════════════════════════════════"
} | tee -a "$REPORT_FILE"

echo ""
echo "Full report: ${REPORT_FILE}"

if [[ $FAIL -ne 0 ]]; then
  exit 1
else
  exit 0
fi
