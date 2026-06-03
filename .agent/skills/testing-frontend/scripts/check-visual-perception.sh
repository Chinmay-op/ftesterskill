#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# check-visual-perception.sh
#
# Source-level static scanner for visual perception and design-system
# consistency anti-patterns. Checks CSS/SCSS/TSX/JSX files for signals
# of visual drift, inconsistent design tokens, and aesthetic debt.
#
# Part of Domain 14: Visual Perception, Brand Fit & Aesthetic Consistency.
#
# Usage:
#   bash scripts/check-visual-perception.sh ./src
#   bash scripts/check-visual-perception.sh ./src ./dist
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

SRC_DIR="${1:-./ src}"
DIST_DIR="${2:-}"

RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

FINDINGS=0
SEVERITY_MAX="low"

# ── Helpers ───────────────────────────────────────────────────────────────────

log_header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  👁️  $1${NC}"
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

count_unique() {
  # Count unique values from grep output, case-insensitive
  sort -uf | wc -l | tr -d ' '
}

# ── Pre-flight ────────────────────────────────────────────────────────────────

log_header "VISUAL PERCEPTION — SOURCE-LEVEL SCAN"
echo -e "  Source directory: ${SRC_DIR}"
if [ -n "$DIST_DIR" ]; then
  echo -e "  Build directory:  ${DIST_DIR}"
fi
echo -e "  Started:          $(date '+%Y-%m-%d %H:%M:%S')"

if [ ! -d "$SRC_DIR" ]; then
  echo -e "${RED}  ERROR: Source directory '$SRC_DIR' not found.${NC}"
  exit 1
fi

# ── 1. Font Family Discipline ────────────────────────────────────────────────

log_check "Font family discipline (flag > 3 distinct families)"

FONT_FAMILIES=$(grep -rhoP "font-family\s*:\s*[^;{}]+" "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" \
  --include="*.tsx" --include="*.jsx" --include="*.ts" \
  --include="*.styled.*" 2>/dev/null \
  | sed 's/font-family\s*:\s*//' \
  | sed 's/[,;].*//' \
  | sed "s/['\"]//g" \
  | tr -d ' ' \
  | sort -uf || true)

FONT_COUNT=$(echo "$FONT_FAMILIES" | grep -c '.' 2>/dev/null || echo "0")

if [ "$FONT_COUNT" -gt 3 ]; then
  log_warn "Found $FONT_COUNT distinct font-family declarations — too many for a cohesive design system."
  echo "$FONT_FAMILIES" | head -8 | while read -r font; do
    log_info "  • $font"
  done
elif [ "$FONT_COUNT" -gt 0 ]; then
  log_pass "Found $FONT_COUNT font family/families — within a healthy range."
else
  log_pass "No font-family declarations found (may be using framework defaults)."
fi

# ── 2. Border Radius Consistency ─────────────────────────────────────────────

log_check "Border-radius consistency (flag > 4 distinct values)"

RADII=$(grep -rhoP "border-radius\s*:\s*[^;{}]+" "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" \
  --include="*.tsx" --include="*.jsx" 2>/dev/null \
  | sed 's/border-radius\s*:\s*//' \
  | sed 's/[;].*//' \
  | tr -d ' ' \
  | sort -uf || true)

RADIUS_COUNT=$(echo "$RADII" | grep -c '.' 2>/dev/null || echo "0")

if [ "$RADIUS_COUNT" -gt 4 ]; then
  log_warn "Found $RADIUS_COUNT distinct border-radius values — components look like they belong to different design systems."
  echo "$RADII" | while read -r r; do
    log_info "  • $r"
  done
elif [ "$RADIUS_COUNT" -gt 0 ]; then
  log_pass "Found $RADIUS_COUNT border-radius value(s) — consistent."
else
  log_pass "No border-radius declarations found."
fi

# ── 3. Box Shadow Patterns ───────────────────────────────────────────────────

log_check "Box-shadow discipline (flag > 3 distinct patterns)"

SHADOWS=$(grep -rhoP "box-shadow\s*:\s*[^;{}]+" "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | sed 's/box-shadow\s*:\s*//' \
  | sed 's/[;].*//' \
  | sort -uf || true)

SHADOW_COUNT=$(echo "$SHADOWS" | grep -c '.' 2>/dev/null || echo "0")

if [ "$SHADOW_COUNT" -gt 3 ]; then
  log_warn "Found $SHADOW_COUNT distinct box-shadow patterns — depth and elevation feel inconsistent."
  echo "$SHADOWS" | head -5 | while read -r s; do
    log_info "  • $s"
  done
elif [ "$SHADOW_COUNT" -gt 0 ]; then
  log_pass "Found $SHADOW_COUNT box-shadow pattern(s) — consistent."
else
  log_pass "No box-shadow declarations found."
fi

# ── 4. Z-Index Layers ────────────────────────────────────────────────────────

log_check "Z-index layer discipline (flag > 5 distinct values)"

ZINDEXES=$(grep -rhoP "z-index\s*:\s*\d+" "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" \
  --include="*.tsx" --include="*.jsx" 2>/dev/null \
  | sed 's/z-index\s*:\s*//' \
  | sort -nuf || true)

ZINDEX_COUNT=$(echo "$ZINDEXES" | grep -c '.' 2>/dev/null || echo "0")

if [ "$ZINDEX_COUNT" -gt 5 ]; then
  log_warn "Found $ZINDEX_COUNT distinct z-index values — z-index wars are likely."
  echo "$ZINDEXES" | while read -r z; do
    log_info "  • z-index: $z"
  done
elif [ "$ZINDEX_COUNT" -gt 0 ]; then
  log_pass "Found $ZINDEX_COUNT z-index value(s) — manageable."
else
  log_pass "No z-index declarations found."
fi

# ── 5. Hardcoded Colors vs CSS Custom Properties ─────────────────────────────

log_check "Color discipline (hardcoded hex/rgb vs CSS custom properties)"

HARDCODED_COLORS=$(grep -rcoP "#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)" "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

CSS_VAR_COLORS=$(grep -rcoP "var\(--[^)]+\)" "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

TOTAL_COLORS=$((HARDCODED_COLORS + CSS_VAR_COLORS))

if [ "$TOTAL_COLORS" -gt 0 ]; then
  PERCENT_HARDCODED=$(( (HARDCODED_COLORS * 100) / (TOTAL_COLORS) ))

  if [ "$PERCENT_HARDCODED" -gt 70 ]; then
    log_warn "Color usage is ${PERCENT_HARDCODED}% hardcoded (${HARDCODED_COLORS} hardcoded vs ${CSS_VAR_COLORS} CSS variables). The design system isn't being used for colors."
  elif [ "$PERCENT_HARDCODED" -gt 40 ]; then
    log_warn "Color usage is ${PERCENT_HARDCODED}% hardcoded — a mix of hardcoded and tokenized colors makes theming brittle."
  else
    log_pass "Color usage is ${PERCENT_HARDCODED}% hardcoded — mostly using CSS custom properties. Good discipline."
  fi
else
  log_pass "No color declarations found to analyze."
fi

# ── 6. !important Overrides ──────────────────────────────────────────────────

log_check "!important override count (flag > 10 = design system bypass)"

IMPORTANT_COUNT=$(grep -rc '!important' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$IMPORTANT_COUNT" -gt 10 ]; then
  log_warn "Found $IMPORTANT_COUNT !important declarations — the design system is being frequently bypassed."
elif [ "$IMPORTANT_COUNT" -gt 0 ]; then
  log_pass "Found $IMPORTANT_COUNT !important declaration(s) — acceptable."
else
  log_pass "No !important declarations — clean CSS specificity."
fi

# ── 7. Spacing Token Consistency ─────────────────────────────────────────────

log_check "Spacing token discipline (flag > 8 distinct px margin/padding values)"

SPACING_VALUES=$(grep -rhoP "(margin|padding)(-top|-bottom|-left|-right)?\s*:\s*\d+px" "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | grep -oP '\d+px' \
  | sort -nuf || true)

SPACING_COUNT=$(echo "$SPACING_VALUES" | grep -c '.' 2>/dev/null || echo "0")

if [ "$SPACING_COUNT" -gt 8 ]; then
  log_warn "Found $SPACING_COUNT distinct pixel-based spacing values — too many one-off spacing decisions."
  echo "$SPACING_VALUES" | while read -r v; do
    log_info "  • $v"
  done
elif [ "$SPACING_COUNT" -gt 0 ]; then
  log_pass "Found $SPACING_COUNT spacing value(s) — within a healthy range."
else
  log_pass "No hardcoded pixel spacing found (may be using rem/em or spacing tokens)."
fi

# ── 8. Icon Size Consistency ─────────────────────────────────────────────────

log_check "Icon size consistency"

# Check SVG width/height attributes and styled icon dimensions
ICON_SIZES=$(grep -rhoP '(width|height)\s*[:=]\s*["\x27]?\d+(px)?' "$SRC_DIR" \
  --include="*.svg" 2>/dev/null \
  | grep -oP '\d+' \
  | sort -nuf || true)

ICON_SIZE_COUNT=$(echo "$ICON_SIZES" | grep -c '.' 2>/dev/null || echo "0")

if [ "$ICON_SIZE_COUNT" -gt 4 ]; then
  log_warn "Found $ICON_SIZE_COUNT distinct icon sizes in SVG files — icons look inconsistently sized."
  echo "$ICON_SIZES" | while read -r s; do
    log_info "  • ${s}px"
  done
elif [ "$ICON_SIZE_COUNT" -gt 0 ]; then
  log_pass "Found $ICON_SIZE_COUNT icon size(s) — consistent."
else
  log_pass "No SVG icons found or no inline size attributes."
fi

# ── 9. Inline Styles (design system bypass) ──────────────────────────────────

log_check "Inline style usage (flag > 15 = heavy design system bypass)"

INLINE_STYLES=$(grep -rc 'style=' "$SRC_DIR" \
  --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$INLINE_STYLES" -gt 15 ]; then
  log_warn "Found $INLINE_STYLES inline style attributes — heavy bypass of the design system."
elif [ "$INLINE_STYLES" -gt 0 ]; then
  log_pass "Found $INLINE_STYLES inline style(s) — low usage is acceptable for dynamic values."
else
  log_pass "No inline styles found."
fi

# ── 10. Color-Scheme / prefers-reduced-motion Support ────────────────────────

log_check "Modern CSS support (prefers-reduced-motion, prefers-color-scheme)"

HAS_REDUCED_MOTION=$(grep -rc 'prefers-reduced-motion' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

HAS_COLOR_SCHEME=$(grep -rc 'prefers-color-scheme' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$HAS_REDUCED_MOTION" -eq 0 ]; then
  log_info "No prefers-reduced-motion media query found — animations may not respect user preferences."
else
  log_pass "prefers-reduced-motion is supported ($HAS_REDUCED_MOTION occurrence(s))."
fi

if [ "$HAS_COLOR_SCHEME" -eq 0 ]; then
  log_info "No prefers-color-scheme media query found — dark mode may not be implemented."
else
  log_pass "prefers-color-scheme is supported ($HAS_COLOR_SCHEME occurrence(s))."
fi

# ── 11. Token Coverage (Domain 15a) ──────────────────────────────────────────

log_check "CSS custom property (token) coverage ratio"

# Count total color/spacing/radius/shadow declarations
TOTAL_COLOR_DECLS=$(grep -rcE '(color|background|border-color|fill|stroke)\s*:' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

TOKENIZED_COLOR=$(grep -rcE '(color|background|border-color|fill|stroke)\s*:.*var\(--' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$TOTAL_COLOR_DECLS" -gt 0 ]; then
  COVERAGE=$((TOKENIZED_COLOR * 100 / TOTAL_COLOR_DECLS))
  if [ "$COVERAGE" -lt 50 ]; then
    log_fail "Token coverage for colors: $COVERAGE% ($TOKENIZED_COLOR of $TOTAL_COLOR_DECLS use var(--...)). Below 50% = broken."
  elif [ "$COVERAGE" -lt 80 ]; then
    log_warn "Token coverage for colors: $COVERAGE% ($TOKENIZED_COLOR of $TOTAL_COLOR_DECLS). Below 80% = drifting."
  else
    log_pass "Token coverage for colors: $COVERAGE% ($TOKENIZED_COLOR of $TOTAL_COLOR_DECLS)."
  fi
else
  log_info "No color declarations found to measure token coverage."
fi

# ── 12. Component Family Consistency (Domain 15b) ────────────────────────────

log_check "Component family consistency (border-radius variance in buttons)"

BUTTON_RADII=$(grep -A3 -E 'button|btn|Button|Btn' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" -r 2>/dev/null \
  | grep -oE 'border-radius\s*:\s*[^;]+' | sort -u | head -10 || true)

if [[ -n "$BUTTON_RADII" ]]; then
  RADII_COUNT=$(echo "$BUTTON_RADII" | wc -l | tr -d ' ')
  if [ "$RADII_COUNT" -gt 3 ]; then
    log_warn "Found $RADII_COUNT distinct border-radius values for buttons — component family drift."
    echo "$BUTTON_RADII" | while read -r line; do
      log_info "  $line"
    done
  else
    log_pass "Button border-radius is consistent ($RADII_COUNT variant(s))."
  fi
else
  log_info "No button-specific border-radius rules found (may be using utility classes)."
fi

# ── 13. Spacing Scale Alignment (Domain 15e) ────────────────────────────────

log_check "Spacing scale alignment (values should snap to 4px or 8px base)"

# Extract margin and padding pixel values
SPACING_VALUES=$(grep -rhoE '(margin|padding)[^:]*:\s*[0-9]+px' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | grep -oE '[0-9]+px' | sort -t'p' -k1 -n | uniq -c | sort -rn | head -15 || true)

if [[ -n "$SPACING_VALUES" ]]; then
  # Check for values not divisible by 4
  ODD_SPACING=$(echo "$SPACING_VALUES" | awk '{gsub("px",""); if ($2 % 4 != 0 && $2 > 0) print $0}' | head -5 || true)
  if [[ -n "$ODD_SPACING" ]]; then
    ODD_COUNT=$(echo "$ODD_SPACING" | wc -l | tr -d ' ')
    log_warn "Found $ODD_COUNT spacing value(s) not aligned to a 4px grid:"
    echo "$ODD_SPACING" | while read -r line; do
      log_info "  $line"
    done
  else
    log_pass "All spacing values align to a 4px base grid."
  fi
else
  log_info "No pixel-based spacing values found (may be using rem/em units)."
fi

# ── 14. Animation/Transition Discipline (Domain 14r) ────────────────────────

log_check "Animation discipline (distinct transition-duration count)"

TRANSITION_DURATIONS=$(grep -rhoE 'transition-duration\s*:\s*[^;]+|transition\s*:[^;]*\b[0-9.]+m?s\b' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | grep -oE '[0-9.]+m?s' | sort -u | head -10 || true)

if [[ -n "$TRANSITION_DURATIONS" ]]; then
  DUR_COUNT=$(echo "$TRANSITION_DURATIONS" | wc -l | tr -d ' ')
  if [ "$DUR_COUNT" -gt 5 ]; then
    log_warn "Found $DUR_COUNT distinct transition durations — inconsistent animation feel."
    echo "$TRANSITION_DURATIONS" | while read -r line; do
      log_info "  $line"
    done
    log_info "Standardize to 2-3 duration values (e.g., 150ms fast, 200ms normal, 300ms slow)."
  else
    log_pass "Transition timing is disciplined ($DUR_COUNT distinct duration(s))."
  fi
else
  log_info "No transition-duration declarations found."
fi

# ── 15. Line-Height Consistency (Domain 14e) ─────────────────────────────────

log_check "Body text line-height consistency"

LINE_HEIGHTS=$(grep -rhoE 'line-height\s*:\s*[^;]+' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | grep -oE '[0-9.]+' | sort -u | head -10 || true)

if [[ -n "$LINE_HEIGHTS" ]]; then
  LH_COUNT=$(echo "$LINE_HEIGHTS" | wc -l | tr -d ' ')
  # Check for any line-height below 1.3 (hard to read)
  LOW_LH=$(echo "$LINE_HEIGHTS" | awk '{if ($1 < 1.3 && $1 > 0 && $1 < 5) print $0}' | head -5 || true)
  if [[ -n "$LOW_LH" ]]; then
    log_warn "Found line-height value(s) below 1.3 — text may feel cramped:"
    echo "$LOW_LH" | while read -r line; do
      log_info "  line-height: $line"
    done
  elif [ "$LH_COUNT" -gt 5 ]; then
    log_warn "Found $LH_COUNT distinct line-height values — may indicate inconsistent type system."
  else
    log_pass "Line-height values are consistent ($LH_COUNT variant(s)), all ≥ 1.3."
  fi
else
  log_info "No line-height declarations found."
fi

# ── 16. Visual Noise Indicators (Domain 14o) ─────────────────────────────────

log_check "Visual noise indicators (!important count + inline styles ratio)"

IMPORTANT_COUNT=$(grep -rc '!important' "$SRC_DIR" \
  --include="*.css" --include="*.scss" --include="*.less" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [ "$IMPORTANT_COUNT" -gt 20 ]; then
  log_warn "Found $IMPORTANT_COUNT !important declarations — high specificity wars indicate design system breakdown."
elif [ "$IMPORTANT_COUNT" -gt 5 ]; then
  log_info "Found $IMPORTANT_COUNT !important declarations — moderate usage."
else
  log_pass "Low !important usage ($IMPORTANT_COUNT) — healthy CSS specificity."
fi

# ── Summary ───────────────────────────────────────────────────────────────────

log_header "VISUAL PERCEPTION & DESIGN SYSTEM SCAN — SUMMARY"

echo ""
if [ "$FINDINGS" -eq 0 ]; then
  echo -e "  ${GREEN}🟢 HEALTHY — No design-system consistency issues detected.${NC}"
  echo -e "  ${GREEN}   The codebase shows good visual discipline.${NC}"
elif [ "$SEVERITY_MAX" = "medium" ]; then
  echo -e "  ${YELLOW}🟡 NEEDS DESIGN REVIEW — $FINDINGS finding(s) suggest visual drift.${NC}"
  echo -e "  ${YELLOW}   The UI may look inconsistent in some areas.${NC}"
else
  echo -e "  ${RED}🔴 VISUALLY RISKY — $FINDINGS finding(s) with high-severity issues.${NC}"
  echo -e "  ${RED}   The design system is not being followed consistently.${NC}"
fi

echo ""
echo -e "  Total findings:      $FINDINGS"
echo -e "  Highest severity:    $SEVERITY_MAX"
echo -e "  Completed:           $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Exit code based on severity
if [ "$SEVERITY_MAX" = "high" ]; then
  exit 1
else
  exit 0
fi
