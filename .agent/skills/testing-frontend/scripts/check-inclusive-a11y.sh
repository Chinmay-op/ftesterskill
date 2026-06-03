#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# check-inclusive-a11y.sh
#
# Inclusive accessibility scanner — goes beyond basic WCAG automated checks
# to detect cognitive accessibility, motion safety, touch target, and
# progressive disclosure issues at the source level.
#
# Concepts borrowed from:
#   - W3C COGA "Making Content Usable for People with Cognitive and Learning
#     Disabilities" (https://www.w3.org/TR/coga-usable/)
#   - WCAG 2.5.8 (Target Size), 2.3.1 (Three Flashes), 2.2.1 (Timing)
#   - IBM Equal Access heuristics
#
# Part of Domain 4b-4g: Inclusive Accessibility.
#
# Usage:
#   bash scripts/check-inclusive-a11y.sh ./src
#   bash scripts/check-inclusive-a11y.sh --help
#
# Arguments:
#   $1 — Source directory to scan (default: ./src)
#
# Exit codes:
#   0 — All checks passed or only low-severity findings
#   1 — Medium or higher severity findings detected
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash check-inclusive-a11y.sh <src-directory>"
  echo ""
  echo "Inclusive accessibility scanner (beyond basic WCAG):"
  echo "  1. Motion safety (prefers-reduced-motion)"
  echo "  2. Focus indicator visibility"
  echo "  3. Skip link presence"
  echo "  4. Touch target sizing"
  echo "  5. Auto-play/timeout detection"
  echo "  6. Reading complexity indicators"
  echo "  7. ARIA attribute quality"
  echo ""
  echo "Exit codes:"
  echo "  0  — All checks passed (or only low findings)"
  echo "  1  — High-severity issues found"
  exit 0
fi

SRC_DIR="${1:-./src}"

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
  echo -e "${CYAN}  ♿ $1${NC}"
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

log_header "INCLUSIVE ACCESSIBILITY — STATIC SCAN"
echo -e "  Source directory: ${SRC_DIR}"
echo -e "  Started:          $(date '+%Y-%m-%d %H:%M:%S')"

if [ ! -d "$SRC_DIR" ]; then
  echo -e "${RED}  ERROR: Source directory '$SRC_DIR' not found.${NC}"
  exit 1
fi

# ── 1/7. Motion Safety: prefers-reduced-motion ───────────────────────────────

log_check "1/7. Motion Safety — prefers-reduced-motion usage"

# Check CSS files
MOTION_CSS=$(grep -rc 'prefers-reduced-motion' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

# Check for animations and transitions
ANIMATION_COUNT=$(grep -rcE 'animation:|animation-name:|@keyframes|transition:' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

# Check JS/TS for motion preference detection
MOTION_JS=$(grep -rc 'prefers-reduced-motion\|matchMedia.*motion' "$SRC_DIR" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

MOTION_TOTAL=$((MOTION_CSS + MOTION_JS))

if [ "$ANIMATION_COUNT" -gt 0 ] && [ "$MOTION_TOTAL" -eq 0 ]; then
  log_fail "Found $ANIMATION_COUNT animation/transition declarations but NO prefers-reduced-motion support."
  log_info "Users with vestibular disorders or motion sensitivity need this. Add @media (prefers-reduced-motion: reduce) { ... }"
elif [ "$ANIMATION_COUNT" -gt 0 ] && [ "$MOTION_TOTAL" -lt 2 ]; then
  log_warn "Found $ANIMATION_COUNT animations but only $MOTION_TOTAL prefers-reduced-motion reference(s). May be incomplete."
else
  log_pass "Motion safety: $MOTION_TOTAL prefers-reduced-motion reference(s) for $ANIMATION_COUNT animation(s)."
fi

# Check for autoplay
AUTOPLAY=$(grep -rnE 'autoplay|autoPlay' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null | head -5 || true)

if [[ -n "$AUTOPLAY" ]]; then
  AP_COUNT=$(echo "$AUTOPLAY" | wc -l | tr -d ' ')
  log_warn "Found $AP_COUNT autoplay attribute(s). Auto-playing media can be disorienting."
  echo "$AUTOPLAY" | head -3 | while read -r line; do
    log_info "  $line"
  done
else
  log_pass "No autoplay attributes detected."
fi

# ── 2/7. Focus Indicator Visibility ──────────────────────────────────────────

log_check "2/7. Focus Indicator — :focus-visible / :focus styles"

FOCUS_VISIBLE=$(grep -rc ':focus-visible' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

FOCUS_REGULAR=$(grep -rc ':focus' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

# Check for outline:none or outline:0 without replacement
OUTLINE_REMOVED=$(grep -rnE 'outline:\s*(none|0)' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null | head -5 || true)

if [[ -n "$OUTLINE_REMOVED" ]]; then
  OUTLINE_COUNT=$(echo "$OUTLINE_REMOVED" | wc -l | tr -d ' ')
  log_fail "Found $OUTLINE_COUNT outline:none/0 declaration(s). Focus indicators are removed for keyboard users."
  echo "$OUTLINE_REMOVED" | head -3 | while read -r line; do
    log_info "  $line"
  done
  log_info "If removing the default outline, provide an alternative focus indicator (box-shadow, border, etc.)."
elif [ "$FOCUS_VISIBLE" -gt 0 ]; then
  log_pass "Found $FOCUS_VISIBLE :focus-visible rule(s) — modern focus indicator strategy."
elif [ "$FOCUS_REGULAR" -gt 0 ]; then
  log_pass "Found $FOCUS_REGULAR :focus rule(s). Consider upgrading to :focus-visible for better UX."
else
  log_warn "No custom :focus or :focus-visible styles found. Relying on browser defaults."
  log_info "Custom focus indicators are more visible and consistent across browsers."
fi

# ── 3/7. Skip Link ───────────────────────────────────────────────────────────

log_check "3/7. Skip Link — Skip to main content"

SKIP_LINK=$(grep -rnEi 'skip.*(to|nav|main|content)|skipnav|skip-link|SkipLink' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" --include="*.ts" 2>/dev/null | head -3 || true)

MAIN_LANDMARK=$(grep -rnE '<main|role="main"' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null | head -3 || true)

if [[ -z "$SKIP_LINK" ]]; then
  log_warn "No skip link detected. Keyboard users must Tab through every nav item to reach content."
  log_info "Add a visually hidden 'Skip to main content' link as the first focusable element."
else
  log_pass "Skip link mechanism detected."
fi

if [[ -z "$MAIN_LANDMARK" ]]; then
  log_warn "No <main> element or role=\"main\" detected. Screen readers can't jump to main content."
else
  log_pass "<main> landmark element present."
fi

# ── 4/7. Touch Target Sizing ────────────────────────────────────────────────

log_check "4/7. Touch Targets — Minimum 44×44px interactive elements"

# Check for small fixed sizing on interactive elements
SMALL_TARGETS=$(grep -rnE '(width|height|min-width|min-height):\s*(([0-9]|[12][0-9]|3[0-9]|4[0-3])px)' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | grep -iE 'btn|button|link|click|touch|icon|action|toggle|checkbox|radio' | head -5 || true)

if [[ -n "$SMALL_TARGETS" ]]; then
  ST_COUNT=$(echo "$SMALL_TARGETS" | wc -l | tr -d ' ')
  log_warn "Found $ST_COUNT interactive element style(s) with dimensions < 44px. May be too small for touch."
  echo "$SMALL_TARGETS" | head -3 | while read -r line; do
    log_info "  $line"
  done
else
  log_pass "No obvious undersized interactive element styles detected."
fi

# Check for icon-only buttons without proper sizing
ICON_BUTTONS=$(grep -rnE '<(button|a).*>(.*<svg|.*<i |.*icon)' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" 2>/dev/null \
  | grep -v 'aria-label\|aria-labelledby\|title=' | head -5 || true)

if [[ -n "$ICON_BUTTONS" ]]; then
  IB_COUNT=$(echo "$ICON_BUTTONS" | wc -l | tr -d ' ')
  log_warn "Found $IB_COUNT icon-only button(s) without aria-label. These are invisible to screen readers."
else
  log_pass "No unlabeled icon buttons detected."
fi

# ── 5/7. Timeout & Session Management ───────────────────────────────────────

log_check "5/7. Timeout & Auto-dismiss — Session and notification timing"

TIMEOUT_REFS=$(grep -rnE 'setTimeout|setInterval|session.*timeout|idle.*timeout|auto.*dismiss|auto.*close' "$SRC_DIR" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null \
  | grep -v 'node_modules\|test\|spec\|__mock' | head -10 || true)

if [[ -n "$TIMEOUT_REFS" ]]; then
  TO_COUNT=$(echo "$TIMEOUT_REFS" | wc -l | tr -d ' ')
  log_info "Found $TO_COUNT timeout/interval/auto-dismiss reference(s). Verify these accommodate users who need more time."
  
  # Check for session timeout specifically
  SESSION_TO=$(echo "$TIMEOUT_REFS" | grep -iE 'session|idle|inactiv' || true)
  if [[ -n "$SESSION_TO" ]]; then
    log_warn "Session/idle timeout detected. Users must be warned before timeout and given option to extend (WCAG 2.2.1)."
  fi
  
  # Check for auto-dismissing notifications
  AUTO_DISMISS=$(echo "$TIMEOUT_REFS" | grep -iE 'toast|snackbar|notification|alert.*dismiss\|auto.*close' || true)
  if [[ -n "$AUTO_DISMISS" ]]; then
    log_warn "Auto-dismissing notifications detected. Ensure they persist long enough to be read (min 5 seconds) and can be paused."
  fi
else
  log_pass "No timeout/auto-dismiss patterns detected."
fi

# ── 6/7. Reading Complexity Indicators ───────────────────────────────────────

log_check "6/7. Reading Complexity — Text length and jargon indicators"

# Check for very long aria-label values (confusing for screen readers)
LONG_ARIA=$(grep -rnE 'aria-label="[^"]{80,}"' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null | head -5 || true)

if [[ -n "$LONG_ARIA" ]]; then
  LA_COUNT=$(echo "$LONG_ARIA" | wc -l | tr -d ' ')
  log_warn "Found $LA_COUNT aria-label(s) longer than 80 characters. Long labels are hard to parse by screen reader users."
else
  log_pass "All aria-labels are reasonable length."
fi

# Check for title attributes (often misused)
TITLE_ATTRS=$(grep -rcE ' title="[^"]+' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$TITLE_ATTRS" -gt 20 ]; then
  log_warn "Found $TITLE_ATTRS title attributes. Title tooltips are inaccessible on touch devices and often redundant."
  log_info "Prefer visible text or aria-describedby for supplementary information."
elif [ "$TITLE_ATTRS" -gt 0 ]; then
  log_info "Found $TITLE_ATTRS title attribute(s) — moderate usage."
fi

# ── 7/7. ARIA Quality ────────────────────────────────────────────────────────

log_check "7/7. ARIA Quality — Proper ARIA attribute usage"

# Check for aria-hidden on focusable elements (bad pattern)
HIDDEN_FOCUSABLE=$(grep -rnE 'aria-hidden="true".*tabindex|tabindex.*aria-hidden="true"' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null | head -5 || true)

if [[ -n "$HIDDEN_FOCUSABLE" ]]; then
  HF_COUNT=$(echo "$HIDDEN_FOCUSABLE" | wc -l | tr -d ' ')
  log_fail "Found $HF_COUNT element(s) with both aria-hidden=\"true\" and tabindex. Hidden elements should not be focusable."
else
  log_pass "No aria-hidden/tabindex conflicts found."
fi

# Check for ARIA roles
ARIA_ROLES=$(grep -rcE 'role="' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

# Check for aria-live regions (important for dynamic content)
ARIA_LIVE=$(grep -rcE 'aria-live=|role="(alert|status|log|timer)"' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$ARIA_LIVE" -eq 0 ]; then
  log_warn "No aria-live regions or alert/status roles found. Dynamic content updates are invisible to screen readers."
  log_info "Add aria-live=\"polite\" to content that updates without page reload (e.g., notifications, counters)."
else
  log_pass "Found $ARIA_LIVE aria-live/alert/status region(s) for dynamic content."
fi

log_info "Total ARIA role attributes in codebase: $ARIA_ROLES"

# ── Summary ───────────────────────────────────────────────────────────────────

log_header "INCLUSIVE ACCESSIBILITY SCAN — SUMMARY"

echo ""
if [ "$FINDINGS" -eq 0 ]; then
  echo -e "  ${GREEN}🟢 HEALTHY — No inclusive accessibility issues detected.${NC}"
  echo -e "  ${GREEN}   The codebase demonstrates good inclusive design practices.${NC}"
elif [ "$SEVERITY_MAX" = "medium" ]; then
  echo -e "  ${YELLOW}🟡 NEEDS IMPROVEMENT — $FINDINGS finding(s) may exclude some users.${NC}"
  echo -e "  ${YELLOW}   Cognitive, motor, or sensory accessibility may be affected.${NC}"
else
  echo -e "  ${RED}🔴 ACCESSIBILITY RISK — $FINDINGS finding(s) with high-severity gaps.${NC}"
  echo -e "  ${RED}   Some users may be unable to use the application.${NC}"
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
