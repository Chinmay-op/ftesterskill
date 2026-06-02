#!/usr/bin/env bash
# capture-baselines.sh — Capture baseline screenshots for visual regression testing.
# Usage: bash scripts/capture-baselines.sh [preview-url] [baselines-dir]
#        bash scripts/capture-baselines.sh http://localhost:4173 output/baselines
#        bash scripts/capture-baselines.sh --help

set -euo pipefail

# ─── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash capture-baselines.sh [preview-url] [baselines-dir]"
  echo ""
  echo "Captures baseline screenshots for visual regression testing."
  echo "Run this once when the UI is in a known-good state."
  echo "Subsequent test runs will diff against these baselines."
  echo ""
  echo "Arguments:"
  echo "  preview-url    URL of the running preview server (default: http://localhost:4173)"
  echo "  baselines-dir  Directory to save baselines (default: output/baselines)"
  echo ""
  echo "Prerequisites:"
  echo "  - Preview server must be running (npm run preview)"
  echo "  - Playwright must be installed: npx playwright install chromium"
  echo ""
  echo "Exit codes:"
  echo "  0  — All baselines captured successfully"
  echo "  1  — One or more captures failed"
  exit 0
fi

# ─── Config ──────────────────────────────────────────────────────────────────
PREVIEW_URL="${1:-http://localhost:4173}"
BASELINES_DIR="${2:-output/baselines}"
FAIL=0

mkdir -p "$BASELINES_DIR"

echo "═══════════════════════════════════════════════════════"
echo "  📸 BASELINE SCREENSHOT CAPTURE"
echo "  Server: ${PREVIEW_URL}"
echo "  Output: ${BASELINES_DIR}/"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── Check Server ────────────────────────────────────────────────────────────
echo "── Checking preview server availability ──"
if ! curl -s -o /dev/null -w "" "${PREVIEW_URL}" 2>/dev/null; then
  echo "❌ ERROR: Preview server not reachable at ${PREVIEW_URL}"
  echo "   Start it first: npm run preview"
  exit 1
fi
echo "✅ Server is running"
echo ""

# ─── Check Playwright ────────────────────────────────────────────────────────
if ! npx playwright --version &>/dev/null 2>&1; then
  echo "⚠️  Playwright not found. Installing chromium..."
  npx playwright install chromium 2>&1 | tail -3
fi

# ─── Define Viewports ────────────────────────────────────────────────────────
declare -A VIEWPORTS=(
  ["mobile"]="375,812"
  ["tablet"]="768,1024"
  ["desktop"]="1440,900"
)

# ─── Discover Routes ─────────────────────────────────────────────────────────
echo "── Discovering routes ──"
ROUTES=("/")

# Try to find routes from index.html or JS bundles
if [[ -d "dist" ]]; then
  ADDITIONAL=$(grep -rohE "path:\s*['\"][^'\"]+['\"]" dist/*.js 2>/dev/null | \
    sed "s/path:\s*['\"]//;s/['\"]$//" | sort -u | head -20 || true)
  if [[ -n "$ADDITIONAL" ]]; then
    while IFS= read -r route; do
      [[ -n "$route" ]] && ROUTES+=("$route")
    done <<< "$ADDITIONAL"
  fi
fi

echo "   Routes to capture: ${ROUTES[*]}"
echo ""

# ─── Capture Baselines ──────────────────────────────────────────────────────
TOTAL=0
SUCCESS=0

for route in "${ROUTES[@]}"; do
  ROUTE_SLUG=$(echo "$route" | sed 's/\//-/g; s/^-//; s/-$//' | tr -cd '[:alnum:]-')
  [[ -z "$ROUTE_SLUG" ]] && ROUTE_SLUG="root"

  for label in "${!VIEWPORTS[@]}"; do
    TOTAL=$((TOTAL + 1))
    DIMENSIONS="${VIEWPORTS[$label]}"
    FILENAME="${ROUTE_SLUG}-${label}-baseline.png"
    FILEPATH="${BASELINES_DIR}/${FILENAME}"

    echo -n "   Capturing ${route} @ ${label} (${DIMENSIONS}) ... "

    RESULT=$(npx playwright screenshot \
      --viewport-size="${DIMENSIONS}" \
      --wait-for-timeout=2000 \
      "${PREVIEW_URL}${route}" \
      "${FILEPATH}" 2>&1) || true

    if [[ -f "$FILEPATH" ]]; then
      FILE_SIZE=$(stat -f%z "$FILEPATH" 2>/dev/null || stat -c%s "$FILEPATH" 2>/dev/null || echo "0")
      echo "✅ (${FILE_SIZE} bytes)"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "❌ FAILED"
      FAIL=1
    fi
  done
done

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  📸 BASELINE CAPTURE COMPLETE"
echo "  Total: ${TOTAL} | Success: ${SUCCESS} | Failed: $((TOTAL - SUCCESS))"
echo "  Baselines saved to: ${BASELINES_DIR}/"
echo "═══════════════════════════════════════════════════════"

# ─── Write manifest ─────────────────────────────────────────────────────────
MANIFEST="${BASELINES_DIR}/manifest.txt"
{
  echo "# Baseline Manifest"
  echo "# Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "# Server: ${PREVIEW_URL}"
  echo ""
  for f in "${BASELINES_DIR}"/*.png; do
    [[ -f "$f" ]] && echo "$(basename "$f")  $(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null) bytes"
  done
} > "$MANIFEST"
echo "  Manifest: ${MANIFEST}"

if [[ $FAIL -ne 0 ]]; then
  exit 1
else
  exit 0
fi
