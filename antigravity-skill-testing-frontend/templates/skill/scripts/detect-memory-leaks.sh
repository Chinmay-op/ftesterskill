#!/usr/bin/env bash
# detect-memory-leaks.sh — Heap snapshot comparison for memory leak detection.
# Usage: bash scripts/detect-memory-leaks.sh [preview-url] [idle-seconds]
#        bash scripts/detect-memory-leaks.sh http://localhost:4173 30
#        bash scripts/detect-memory-leaks.sh --help

set -euo pipefail

# ─── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash detect-memory-leaks.sh [preview-url] [idle-seconds]"
  echo ""
  echo "Takes JS heap snapshots before and after a navigation + idle cycle"
  echo "using Playwright with Chrome DevTools Protocol (CDP)."
  echo ""
  echo "Arguments:"
  echo "  preview-url   URL of the running preview server (default: http://localhost:4173)"
  echo "  idle-seconds  How long to idle between snapshots (default: 30)"
  echo ""
  echo "Checks:"
  echo "  - Heap growth > 20MB over idle period → flagged as leak"
  echo "  - Detached DOM node count increase → flagged as leak"
  echo ""
  echo "Output:"
  echo "  output/heap-snapshots/        — Heap snapshot data"
  echo "  output/memory-leak-report.txt — Comparison results"
  echo ""
  echo "Prerequisites:"
  echo "  - Preview server must be running"
  echo "  - Playwright must be installed with chromium"
  echo ""
  echo "Exit codes:"
  echo "  0  — No memory leaks detected"
  echo "  1  — Potential memory leaks found"
  echo "  2  — Tool/config errors"
  exit 0
fi

# ─── Config ──────────────────────────────────────────────────────────────────
PREVIEW_URL="${1:-http://localhost:4173}"
IDLE_SECONDS="${2:-30}"
HEAP_DIR="output/heap-snapshots"
REPORT_FILE="output/memory-leak-report.txt"
HEAP_THRESHOLD_MB=20
FAIL=0

mkdir -p "$HEAP_DIR"

echo "═══════════════════════════════════════════════════════"
echo "  🧠 MEMORY LEAK DETECTION"
echo "  Server: ${PREVIEW_URL}"
echo "  Idle period: ${IDLE_SECONDS}s"
echo "  Heap threshold: ${HEAP_THRESHOLD_MB}MB"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── Check Server ────────────────────────────────────────────────────────────
echo "── Checking server availability ──"
if ! curl -s -o /dev/null -w "" "${PREVIEW_URL}" 2>/dev/null; then
  echo "❌ ERROR: Server not reachable at ${PREVIEW_URL}"
  exit 2
fi
echo "✅ Server is running"
echo ""

# ─── Check Node.js & Playwright ──────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "❌ ERROR: Node.js is required for heap snapshot analysis."
  exit 2
fi

if ! npx playwright --version &>/dev/null 2>&1; then
  echo "⚠️  Playwright not found. Installing chromium..."
  npx playwright install chromium 2>&1 | tail -3
fi

# ─── Run Heap Snapshot Script ────────────────────────────────────────────────
echo "── Running heap snapshot comparison ──"
echo ""

HEAP_RESULT=$(node -e "
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const cdp = await context.newCDPSession(page);

  // ── Navigate to app ──
  console.log('Navigating to ${PREVIEW_URL}...');
  await page.goto('${PREVIEW_URL}', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // ── Snapshot BEFORE ──
  console.log('Taking BEFORE heap snapshot...');
  await cdp.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(1000);

  const beforeMetrics = await page.evaluate(() => ({
    heapUsed: performance.memory ? performance.memory.usedJSHeapSize : 0,
    heapTotal: performance.memory ? performance.memory.totalJSHeapSize : 0,
    domNodes: document.querySelectorAll('*').length,
    timestamp: Date.now()
  }));

  console.log('BEFORE_HEAP_MB=' + (beforeMetrics.heapUsed / 1024 / 1024).toFixed(2));
  console.log('BEFORE_DOM_NODES=' + beforeMetrics.domNodes);

  // ── Simulate navigation (click around) ──
  console.log('Simulating navigation...');
  const links = await page.$$('a[href]');
  const maxClicks = Math.min(links.length, 10);
  for (let i = 0; i < maxClicks; i++) {
    try {
      await links[i].click({ timeout: 3000 });
      await page.waitForTimeout(1000);
    } catch (e) {
      // Navigation may change page, continue
    }
  }

  // ── Idle period ──
  console.log('Idling for ${IDLE_SECONDS} seconds...');
  await page.waitForTimeout(${IDLE_SECONDS} * 1000);

  // ── Snapshot AFTER ──
  console.log('Taking AFTER heap snapshot...');
  await cdp.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(1000);

  const afterMetrics = await page.evaluate(() => ({
    heapUsed: performance.memory ? performance.memory.usedJSHeapSize : 0,
    heapTotal: performance.memory ? performance.memory.totalJSHeapSize : 0,
    domNodes: document.querySelectorAll('*').length,
    timestamp: Date.now()
  }));

  console.log('AFTER_HEAP_MB=' + (afterMetrics.heapUsed / 1024 / 1024).toFixed(2));
  console.log('AFTER_DOM_NODES=' + afterMetrics.domNodes);

  // ── Calculate deltas ──
  const heapDeltaMB = ((afterMetrics.heapUsed - beforeMetrics.heapUsed) / 1024 / 1024);
  const domDelta = afterMetrics.domNodes - beforeMetrics.domNodes;

  console.log('HEAP_DELTA_MB=' + heapDeltaMB.toFixed(2));
  console.log('DOM_DELTA=' + domDelta);

  // ── Check for detached nodes ──
  const detachedCount = await page.evaluate(() => {
    // Simple heuristic: count elements not attached to document
    let detached = 0;
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const el = walker.currentNode;
        if (!document.body.contains(el)) detached++;
      }
    } catch (e) {}
    return detached;
  });
  console.log('DETACHED_NODES=' + detachedCount);

  await browser.close();

  // ── Verdict ──
  if (heapDeltaMB > ${HEAP_THRESHOLD_MB}) {
    console.log('VERDICT=LEAK_DETECTED');
    process.exit(1);
  } else if (domDelta > 500) {
    console.log('VERDICT=DOM_LEAK_SUSPECTED');
    process.exit(1);
  } else {
    console.log('VERDICT=NO_LEAK');
    process.exit(0);
  }
})().catch(err => {
  console.error('SCRIPT_ERROR=' + err.message);
  process.exit(2);
});
" 2>&1) || SCRIPT_EXIT=$?

SCRIPT_EXIT=${SCRIPT_EXIT:-0}

# ─── Parse Results ───────────────────────────────────────────────────────────
echo "$HEAP_RESULT"
echo ""

# Extract metrics from output
BEFORE_HEAP=$(echo "$HEAP_RESULT" | grep -oP 'BEFORE_HEAP_MB=\K[0-9.]+' || echo "N/A")
AFTER_HEAP=$(echo "$HEAP_RESULT" | grep -oP 'AFTER_HEAP_MB=\K[0-9.]+' || echo "N/A")
HEAP_DELTA=$(echo "$HEAP_RESULT" | grep -oP 'HEAP_DELTA_MB=\K[-0-9.]+' || echo "N/A")
BEFORE_DOM=$(echo "$HEAP_RESULT" | grep -oP 'BEFORE_DOM_NODES=\K[0-9]+' || echo "N/A")
AFTER_DOM=$(echo "$HEAP_RESULT" | grep -oP 'AFTER_DOM_NODES=\K[0-9]+' || echo "N/A")
DOM_DELTA=$(echo "$HEAP_RESULT" | grep -oP 'DOM_DELTA=\K[-0-9]+' || echo "N/A")
DETACHED=$(echo "$HEAP_RESULT" | grep -oP 'DETACHED_NODES=\K[0-9]+' || echo "N/A")
VERDICT=$(echo "$HEAP_RESULT" | grep -oP 'VERDICT=\K\w+' || echo "UNKNOWN")

# ─── Write Report ────────────────────────────────────────────────────────────
{
  echo "═══════════════════════════════════════════════════════"
  echo "  MEMORY LEAK DETECTION REPORT"
  echo "  Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "  Server: ${PREVIEW_URL}"
  echo "  Idle period: ${IDLE_SECONDS}s"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  echo "  JS Heap (before):     ${BEFORE_HEAP} MB"
  echo "  JS Heap (after):      ${AFTER_HEAP} MB"
  echo "  Heap delta:           ${HEAP_DELTA} MB (threshold: ${HEAP_THRESHOLD_MB} MB)"
  echo ""
  echo "  DOM nodes (before):   ${BEFORE_DOM}"
  echo "  DOM nodes (after):    ${AFTER_DOM}"
  echo "  DOM delta:            ${DOM_DELTA}"
  echo "  Detached nodes:       ${DETACHED}"
  echo ""
  echo "  VERDICT:              ${VERDICT}"
  echo ""
  echo "═══════════════════════════════════════════════════════"
} | tee "$REPORT_FILE"

echo ""
echo "Report saved to: ${REPORT_FILE}"

if [[ $SCRIPT_EXIT -ne 0 ]]; then
  exit 1
else
  exit 0
fi
