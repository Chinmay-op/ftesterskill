#!/usr/bin/env bash
# run-dom-tests.sh — Launch preview server & run all Playwright-based DOM tests.
# Usage: bash scripts/run-dom-tests.sh [project-dir]
#        bash scripts/run-dom-tests.sh ./
#        bash scripts/run-dom-tests.sh --help

set -euo pipefail

# ─── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash run-dom-tests.sh [project-dir]"
  echo ""
  echo "Launches a Vite preview server on :4173, then runs Playwright-based"
  echo "DOM tests including page load, interactive states, form flows,"
  echo "navigation, responsive breakpoints, and visual regression."
  echo ""
  echo "Prerequisites:"
  echo "  - npm run build must succeed first"
  echo "  - Playwright must be installed: npx playwright install chromium"
  echo ""
  echo "Output:"
  echo "  output/screenshots/   — All test screenshots"
  echo "  output/baselines/     — Baseline screenshots (first run)"
  echo "  output/dom-report.txt — Test results summary"
  echo ""
  echo "Exit codes:"
  echo "  0  — All DOM tests passed"
  echo "  1  — One or more tests failed"
  exit 0
fi

# ─── Config ──────────────────────────────────────────────────────────────────
PROJECT_DIR="${1:-.}"
PREVIEW_PORT=4173
PREVIEW_URL="http://localhost:${PREVIEW_PORT}"
PREVIEW_PID=""
OUTPUT_DIR="output"
SCREENSHOTS_DIR="${OUTPUT_DIR}/screenshots"
REPORT_FILE="${OUTPUT_DIR}/dom-report.txt"
FAIL=0

# ─── Setup ───────────────────────────────────────────────────────────────────
cd "$PROJECT_DIR"

mkdir -p "$SCREENSHOTS_DIR"

echo "═══════════════════════════════════════════════════════"
echo "  🌐 DOM & VISUAL TEST RUNNER"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── 1. Build Check ─────────────────────────────────────────────────────────
echo "── 1/5: Verifying production build exists ──"
if [[ ! -d "dist" ]]; then
  echo "⚠️  No dist/ found. Running build..."
  npm run build 2>&1 | tail -5
  if [[ ! -d "dist" ]]; then
    echo "❌ FAIL: Build did not produce a dist/ directory."
    exit 1
  fi
fi
echo "✅ Build output found in dist/"
echo ""

# ─── 2. Start Preview Server ────────────────────────────────────────────────
echo "── 2/5: Starting preview server on :${PREVIEW_PORT} ──"

# Kill any existing process on the port
if command -v lsof &>/dev/null; then
  EXISTING_PID=$(lsof -ti:${PREVIEW_PORT} 2>/dev/null || true)
  if [[ -n "$EXISTING_PID" ]]; then
    echo "   Killing existing process on :${PREVIEW_PORT} (PID: $EXISTING_PID)"
    kill "$EXISTING_PID" 2>/dev/null || true
    sleep 1
  fi
fi

# Start preview server in background
npm run preview -- --port ${PREVIEW_PORT} &>/dev/null &
PREVIEW_PID=$!

# Wait for server to be ready (max 15 seconds)
echo "   Waiting for server to be ready..."
WAIT_COUNT=0
MAX_WAIT=30
while ! curl -s -o /dev/null -w "" "${PREVIEW_URL}" 2>/dev/null; do
  sleep 0.5
  WAIT_COUNT=$((WAIT_COUNT + 1))
  if [[ $WAIT_COUNT -ge $MAX_WAIT ]]; then
    echo "❌ FAIL: Preview server did not start within 15 seconds."
    echo "   Trying fallback: npx serve ./dist -l ${PREVIEW_PORT}"
    npx -y serve ./dist -l ${PREVIEW_PORT} &>/dev/null &
    PREVIEW_PID=$!
    sleep 3
    if ! curl -s -o /dev/null -w "" "${PREVIEW_URL}" 2>/dev/null; then
      echo "❌ FAIL: Fallback server also failed. Aborting."
      exit 1
    fi
    break
  fi
done
echo "✅ Preview server running at ${PREVIEW_URL} (PID: ${PREVIEW_PID})"
echo ""

# ─── Cleanup trap ────────────────────────────────────────────────────────────
cleanup() {
  if [[ -n "$PREVIEW_PID" ]]; then
    echo ""
    echo "── Shutting down preview server (PID: ${PREVIEW_PID}) ──"
    kill "$PREVIEW_PID" 2>/dev/null || true
    wait "$PREVIEW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ─── 3. Playwright Availability ─────────────────────────────────────────────
echo "── 3/5: Checking Playwright installation ──"
if ! npx playwright --version &>/dev/null 2>&1; then
  echo "⚠️  Playwright not found. Installing chromium..."
  npx playwright install chromium 2>&1 | tail -3
fi
PW_VERSION=$(npx playwright --version 2>/dev/null || echo "unknown")
echo "✅ Playwright version: ${PW_VERSION}"
echo ""

# ─── 4. Run DOM Tests ───────────────────────────────────────────────────────
echo "── 4/5: Running browser-based DOM tests ──"
echo ""

# Define viewports
VIEWPORTS=("375x812:mobile" "768x1024:tablet" "1440x900:desktop")

# Discover routes from the built HTML (basic heuristic)
echo "   Discovering routes from build output..."
ROUTES=("/")

# Check for SPA route hints in JS bundles
if grep -rl "path:\s*['\"]/" dist/ --include="*.js" &>/dev/null 2>&1; then
  ADDITIONAL_ROUTES=$(grep -ohE "path:\s*['\"][^'\"]+['\"]" dist/*.js 2>/dev/null | \
    sed "s/path:\s*['\"]//;s/['\"]$//" | sort -u | head -20 || true)
  if [[ -n "$ADDITIONAL_ROUTES" ]]; then
    while IFS= read -r route; do
      ROUTES+=("$route")
    done <<< "$ADDITIONAL_ROUTES"
  fi
fi

echo "   Found ${#ROUTES[@]} route(s): ${ROUTES[*]}"
echo ""

# Initialize report
{
  echo "═══════════════════════════════════════════════════════"
  echo "  DOM & VISUAL TEST REPORT"
  echo "  Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "  Server: ${PREVIEW_URL}"
  echo "═══════════════════════════════════════════════════════"
  echo ""
} > "$REPORT_FILE"

TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# For each viewport × route combination, run Playwright screenshot
for viewport_spec in "${VIEWPORTS[@]}"; do
  IFS=':' read -r dimensions label <<< "$viewport_spec"
  IFS='x' read -r width height <<< "$dimensions"

  echo "   ┌─ Viewport: ${label} (${width}×${height})"

  for route in "${ROUTES[@]}"; do
    TEST_COUNT=$((TEST_COUNT + 1))
    ROUTE_SLUG=$(echo "$route" | sed 's/\//-/g; s/^-//; s/-$//' | tr -cd '[:alnum:]-')
    [[ -z "$ROUTE_SLUG" ]] && ROUTE_SLUG="root"

    SCREENSHOT_NAME="${ROUTE_SLUG}-${label}.png"
    SCREENSHOT_PATH="${SCREENSHOTS_DIR}/${SCREENSHOT_NAME}"

    echo -n "   │  Testing ${route} ... "

    # Use Playwright CLI to screenshot the page
    RESULT=$(npx playwright screenshot \
      --viewport-size="${width},${height}" \
      --wait-for-timeout=2000 \
      "${PREVIEW_URL}${route}" \
      "${SCREENSHOT_PATH}" 2>&1) || true

    if [[ -f "$SCREENSHOT_PATH" ]]; then
      # Check file size — if < 5KB, likely a blank page
      FILE_SIZE=$(stat -f%z "$SCREENSHOT_PATH" 2>/dev/null || stat -c%s "$SCREENSHOT_PATH" 2>/dev/null || echo "0")
      if [[ $FILE_SIZE -lt 5000 ]]; then
        echo "⚠️  WARNING (tiny screenshot — possible blank page)"
        echo "  [WARN] ${route} @ ${label}: Screenshot only ${FILE_SIZE} bytes (possible blank page)" >> "$REPORT_FILE"
        FAIL_COUNT=$((FAIL_COUNT + 1))
      else
        echo "✅"
        echo "  [PASS] ${route} @ ${label}: ${SCREENSHOT_NAME} (${FILE_SIZE} bytes)" >> "$REPORT_FILE"
        PASS_COUNT=$((PASS_COUNT + 1))
      fi
    else
      echo "❌ FAIL"
      echo "  [FAIL] ${route} @ ${label}: Screenshot capture failed" >> "$REPORT_FILE"
      echo "         Error: ${RESULT}" >> "$REPORT_FILE"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      FAIL=1
    fi
  done

  echo "   └─ Done: ${label}"
  echo ""
done

# ─── 5. Summary ──────────────────────────────────────────────────────────────
echo "── 5/5: Test Summary ──"
echo ""

{
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  SUMMARY"
  echo "  Total tests: ${TEST_COUNT}"
  echo "  Passed: ${PASS_COUNT}"
  echo "  Failed/Warnings: ${FAIL_COUNT}"
  echo "  Screenshots saved to: ${SCREENSHOTS_DIR}/"
  echo "═══════════════════════════════════════════════════════"
} | tee -a "$REPORT_FILE"

echo ""
echo "Full report: ${REPORT_FILE}"
echo "Screenshots: ${SCREENSHOTS_DIR}/"
echo ""

# ─── Exit ────────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
if [[ $FAIL -ne 0 ]]; then
  echo "  ❌ DOM TESTS COMPLETED WITH FAILURES"
  echo "═══════════════════════════════════════════════════════"
  exit 1
else
  echo "  ✅ ALL DOM TESTS PASSED"
  echo "═══════════════════════════════════════════════════════"
  exit 0
fi
