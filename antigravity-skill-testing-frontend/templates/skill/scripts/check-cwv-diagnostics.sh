#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# check-cwv-diagnostics.sh
#
# Static analysis for Core Web Vitals optimization opportunities.
# Checks source and build output for patterns that affect LCP, INP, and CLS.
#
# Concepts borrowed from Google web-vitals library and Checkly performance
# testing patterns. No external dependencies required.
#
# Part of Domain 5b: Core Web Vitals Diagnostics.
#
# Usage:
#   bash scripts/check-cwv-diagnostics.sh ./src
#   bash scripts/check-cwv-diagnostics.sh ./src ./dist
#   bash scripts/check-cwv-diagnostics.sh --help
#
# Arguments:
#   $1 — Source directory to scan (default: ./src)
#   $2 — Optional dist/build directory for additional checks
#
# Exit codes:
#   0 — All checks passed or only low-severity findings
#   1 — Medium or higher severity findings detected
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash check-cwv-diagnostics.sh <src-directory> [dist-directory]"
  echo ""
  echo "Static analysis for Core Web Vitals optimization opportunities:"
  echo "  1. LCP: Image lazy loading, fetchpriority, preload hints"
  echo "  2. CLS: Explicit image dimensions, font-display strategy"
  echo "  3. INP: Long task indicators, heavy event handlers"
  echo "  4. General: Render-blocking resources, will-change overuse,"
  echo "     content-visibility, preconnect hints"
  echo ""
  echo "Exit codes:"
  echo "  0  — All checks passed (or only warnings)"
  echo "  1  — High-severity issues found"
  exit 0
fi

SRC_DIR="${1:-./src}"
DIST_DIR="${2:-}"

RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

FINDINGS=0
SEVERITY_MAX="low"

# ── Helpers ───────────────────────────────────────────────────────────────────

log_header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  ⚡ $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_check() {
  echo -e "\n${BLUE}  ▶ $1${NC}"
}

log_pass() {
  echo -e "    ${GREEN}✅ $1${NC}"
}

log_warn() {
  echo -e "    ${YELLOW}⚠️  $1${NC}"
  FINDINGS=$((FINDINGS + 1))
  if [ "$SEVERITY_MAX" = "low" ]; then
    SEVERITY_MAX="medium"
  fi
}

log_fail() {
  echo -e "    ${RED}❌ $1${NC}"
  FINDINGS=$((FINDINGS + 1))
  SEVERITY_MAX="high"
}

log_info() {
  echo -e "    ${NC}   $1${NC}"
}

# ── Pre-flight ────────────────────────────────────────────────────────────────

log_header "CORE WEB VITALS — STATIC DIAGNOSTIC SCAN"
echo -e "  Source directory: ${SRC_DIR}"
if [ -n "$DIST_DIR" ]; then
  echo -e "  Build directory:  ${DIST_DIR}"
fi
echo -e "  Started:          $(date '+%Y-%m-%d %H:%M:%S')"

if [ ! -d "$SRC_DIR" ]; then
  echo -e "${RED}  ERROR: Source directory '$SRC_DIR' not found.${NC}"
  exit 1
fi

# ── 1. LCP: Image Lazy Loading ───────────────────────────────────────────────

log_check "LCP: Images without loading attribute (missing lazy/eager)"

IMAGES_NO_LOADING=$(grep -rnE '<img ' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null \
  | grep -v 'loading=' | grep -v 'Loading' | grep -v '//' | head -10 || true)

if [[ -n "$IMAGES_NO_LOADING" ]]; then
  IMG_COUNT=$(echo "$IMAGES_NO_LOADING" | wc -l | tr -d ' ')
  log_warn "Found $IMG_COUNT <img> tags without a loading attribute."
  echo "$IMAGES_NO_LOADING" | head -5 | while read -r line; do
    log_info "  $line"
  done
  log_info "Add loading=\"lazy\" for below-fold images, loading=\"eager\" for LCP images."
else
  log_pass "All images have a loading attribute specified."
fi

# ── 2. LCP: fetchpriority on hero/LCP images ────────────────────────────────

log_check "LCP: fetchpriority=\"high\" on likely LCP elements"

HAS_FETCHPRIORITY=$(grep -rc 'fetchpriority\|fetchPriority' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$HAS_FETCHPRIORITY" -eq 0 ]; then
  log_warn "No fetchpriority attributes found. The LCP element may not be prioritized by the browser."
  log_info "Add fetchpriority=\"high\" to the hero image or primary above-fold content."
else
  log_pass "fetchpriority is used ($HAS_FETCHPRIORITY occurrence(s))."
fi

# ── 3. LCP: Preload/preconnect hints ────────────────────────────────────────

log_check "LCP: Preload and preconnect resource hints"

if [ -n "$DIST_DIR" ] && [ -d "$DIST_DIR" ]; then
  HAS_PRELOAD=$(grep -rc 'rel="preload"\|rel="preconnect"' "$DIST_DIR" \
    --include="*.html" 2>/dev/null \
    | awk -F: '{sum += $NF} END {print sum}' || echo "0")

  if [ "$HAS_PRELOAD" -eq 0 ]; then
    log_warn "No <link rel=\"preload\"> or <link rel=\"preconnect\"> hints in build output."
    log_info "Add preconnect to API domains and preload for critical fonts/images."
  else
    log_pass "Resource hints found ($HAS_PRELOAD preload/preconnect hint(s))."
  fi
else
  HAS_PRELOAD=$(grep -rc 'rel="preload"\|rel="preconnect"\|rel=.preload.\|rel=.preconnect.' "$SRC_DIR" \
    --include="*.tsx" --include="*.jsx" --include="*.html" --include="*.ts" 2>/dev/null \
    | awk -F: '{sum += $NF} END {print sum}' || echo "0")

  if [ "$HAS_PRELOAD" -eq 0 ]; then
    log_warn "No preload/preconnect resource hints found in source."
  else
    log_pass "Resource hints found ($HAS_PRELOAD occurrence(s))."
  fi
fi

# ── 4. CLS: Images without explicit dimensions ──────────────────────────────

log_check "CLS: Images without explicit width/height (cause layout shift)"

IMAGES_NO_DIMS=$(grep -rnE '<img ' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null \
  | grep -v 'width=' | grep -v 'width:' | grep -v 'fill' | head -10 || true)

if [[ -n "$IMAGES_NO_DIMS" ]]; then
  DIM_COUNT=$(echo "$IMAGES_NO_DIMS" | wc -l | tr -d ' ')
  log_warn "Found $DIM_COUNT <img> tags without explicit width/height — these cause CLS."
  echo "$IMAGES_NO_DIMS" | head -3 | while read -r line; do
    log_info "  $line"
  done
else
  log_pass "Images have explicit dimensions or fill mode."
fi

# ── 5. CLS: Font-display strategy ───────────────────────────────────────────

log_check "CLS: font-display strategy on @font-face rules"

FONT_FACE_COUNT=$(grep -rc '@font-face' "$SRC_DIR" \
  --include="*.css" --include="*.scss" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$FONT_FACE_COUNT" -gt 0 ]; then
  HAS_FONT_DISPLAY=$(grep -A5 '@font-face' "$SRC_DIR" \
    --include="*.css" --include="*.scss" 2>/dev/null \
    | grep -c 'font-display' || echo "0")

  if [ "$HAS_FONT_DISPLAY" -eq 0 ]; then
    log_fail "@font-face rules found ($FONT_FACE_COUNT) but none use font-display. This causes FOIT/FOUT and CLS."
    log_info "Add font-display: swap (for body) or font-display: optional (for headings)."
  elif [ "$HAS_FONT_DISPLAY" -lt "$FONT_FACE_COUNT" ]; then
    log_warn "Some @font-face rules ($HAS_FONT_DISPLAY of $FONT_FACE_COUNT) have font-display. Check the rest."
  else
    log_pass "All @font-face rules use font-display."
  fi
else
  log_pass "No @font-face rules found (may be using system fonts or external font service)."
fi

# ── 6. INP: Heavy synchronous event handlers ────────────────────────────────

log_check "INP: Potentially heavy synchronous event handlers"

SYNC_HANDLERS=$(grep -rnE 'onClick=\{[^}]*\bfor\b.*\}|onClick=\{[^}]*\.forEach|onClick=\{[^}]*\.map\(' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" 2>/dev/null | head -5 || true)

if [[ -n "$SYNC_HANDLERS" ]]; then
  log_warn "Found onClick handlers with inline loops — these may block the main thread and increase INP."
  echo "$SYNC_HANDLERS" | while read -r line; do
    log_info "  $line"
  done
else
  log_pass "No obvious heavy synchronous event handlers detected."
fi

# ── 7. Render-blocking CSS ───────────────────────────────────────────────────

log_check "Render-blocking: CSS not deferred for non-critical paths"

if [ -n "$DIST_DIR" ] && [ -d "$DIST_DIR" ]; then
  BLOCKING_CSS=$(grep -nE '<link[^>]+rel="stylesheet"' "$DIST_DIR" \
    --include="*.html" 2>/dev/null \
    | grep -v 'media=' | grep -v 'onload=' | head -5 || true)

  if [[ -n "$BLOCKING_CSS" ]]; then
    CSS_COUNT=$(echo "$BLOCKING_CSS" | wc -l | tr -d ' ')
    log_warn "Found $CSS_COUNT render-blocking <link rel=\"stylesheet\"> without media/onload strategy."
    log_info "Consider using media=\"print\" onload=\"this.media='all'\" for non-critical CSS."
  else
    log_pass "No unoptimized render-blocking CSS detected."
  fi
else
  log_info "Skipped render-blocking CSS check (no dist directory provided)."
fi

# ── 8. will-change overuse ───────────────────────────────────────────────────

log_check "Performance: will-change CSS property overuse"

WILL_CHANGE_COUNT=$(grep -rc 'will-change' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$WILL_CHANGE_COUNT" -gt 10 ]; then
  log_warn "Found $WILL_CHANGE_COUNT will-change declarations. Overuse wastes GPU memory and can hurt performance."
elif [ "$WILL_CHANGE_COUNT" -gt 0 ]; then
  log_pass "Found $WILL_CHANGE_COUNT will-change declaration(s) — moderate usage."
else
  log_pass "No will-change declarations found."
fi

# ── 9. content-visibility usage ──────────────────────────────────────────────

log_check "Performance: content-visibility usage for off-screen optimization"

HAS_CONTENT_VIS=$(grep -rc 'content-visibility' "$SRC_DIR" \
  --include="*.css" --include="*.scss" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$HAS_CONTENT_VIS" -eq 0 ]; then
  log_info "No content-visibility: auto found. Consider using it on long-scrolling pages to skip rendering off-screen content."
else
  log_pass "content-visibility is used ($HAS_CONTENT_VIS occurrence(s))."
fi

# ── 10. Script defer/async in HTML ───────────────────────────────────────────

log_check "Render-blocking: Scripts without defer or async"

if [ -n "$DIST_DIR" ] && [ -d "$DIST_DIR" ]; then
  BLOCKING_SCRIPTS=$(grep -nE '<script ' "$DIST_DIR" \
    --include="*.html" 2>/dev/null \
    | grep -v 'defer\|async\|type="module"\|type=.module.' | head -5 || true)

  if [[ -n "$BLOCKING_SCRIPTS" ]]; then
    SCRIPT_COUNT=$(echo "$BLOCKING_SCRIPTS" | wc -l | tr -d ' ')
    log_fail "Found $SCRIPT_COUNT render-blocking <script> tags without defer/async/module."
    echo "$BLOCKING_SCRIPTS" | while read -r line; do
      log_info "  $line"
    done
  else
    log_pass "All scripts use defer, async, or type=\"module\"."
  fi
else
  log_info "Skipped render-blocking script check (no dist directory provided)."
fi

# ── Summary ───────────────────────────────────────────────────────────────────

log_header "CORE WEB VITALS SCAN — SUMMARY"

echo ""
if [ "$FINDINGS" -eq 0 ]; then
  echo -e "  ${GREEN}🟢 HEALTHY — No CWV optimization issues detected.${NC}"
  echo -e "  ${GREEN}   The codebase follows good performance practices.${NC}"
elif [ "$SEVERITY_MAX" = "medium" ]; then
  echo -e "  ${YELLOW}🟡 NEEDS OPTIMIZATION — $FINDINGS finding(s) suggest performance gaps.${NC}"
  echo -e "  ${YELLOW}   LCP, CLS, or INP may be affected.${NC}"
else
  echo -e "  ${RED}🔴 PERFORMANCE RISK — $FINDINGS finding(s) with high-severity issues.${NC}"
  echo -e "  ${RED}   Core Web Vitals are likely degraded.${NC}"
fi

echo ""
echo -e "  Total findings:      $FINDINGS"
echo -e "  Highest severity:    $SEVERITY_MAX"
echo -e "  Completed:           $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

if [ "$SEVERITY_MAX" = "high" ]; then
  exit 1
else
  exit 0
fi
