#!/usr/bin/env bash
# check-ux-signals.sh — Scan source code for UX anti-patterns.
# Usage: bash scripts/check-ux-signals.sh [src-directory]
#        bash scripts/check-ux-signals.sh ./src
#        bash scripts/check-ux-signals.sh --help

set -euo pipefail

# ─── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash check-ux-signals.sh <src-directory>"
  echo ""
  echo "Scans source code for UX anti-patterns including:"
  echo "  1. Ambiguous button/CTA labels (Submit, Click here, OK, etc.)"
  echo "  2. Icon-only buttons missing aria-label"
  echo "  3. Hardcoded color values (not using CSS variables)"
  echo "  4. Missing ErrorBoundary components"
  echo "  5. Generic error messages in JSX"
  echo "  6. Console.log statements that may leak UX state"
  echo "  7. Missing helper text on form inputs"
  echo "  8. Inconsistent terminology (synonym pairs)"
  echo "  9. Missing empty state components"
  echo "  10. Weak validation messages (generic patterns)"
  echo "  11. CTA verb+noun pattern violations"
  echo "  12. Inconsistent capitalization in UI text"
  echo ""
  echo "Exit codes:"
  echo "  0  — All checks passed (or only warnings)"
  echo "  1  — High-severity UX anti-patterns found"
  exit 0
fi

# ─── Config ──────────────────────────────────────────────────────────────────
SRC_DIR="${1:-./src}"
WARNINGS=0
ERRORS=0

if [[ ! -d "$SRC_DIR" ]]; then
  echo "❌ ERROR: Directory '$SRC_DIR' does not exist."
  echo "   Provide the path to your source directory."
  exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  🎨 UX SIGNAL SCAN (12 CHECKS) — $SRC_DIR"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── 1. Ambiguous Button Labels ─────────────────────────────────────────────
echo "── 1/12: Scanning for ambiguous CTA labels ──"

# Search for buttons/links with vague text in JSX/TSX
AMBIGUOUS=$(grep -rnE ">(\s)*(Submit|Click here|Click Here|OK|Ok|Go|Yes|No)(\s)*<" \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" --include="*.html" 2>/dev/null || true)

if [[ -n "$AMBIGUOUS" ]]; then
  echo "⚠️  WARNING: Ambiguous CTA labels found:"
  echo "$AMBIGUOUS" | head -15
  echo ""
  echo "   Recommendation: Replace with specific labels that describe the action"
  echo "   (e.g., 'Save changes' instead of 'Submit', 'View details' instead of 'Go')."
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: No ambiguous CTA labels found."
fi
echo ""

# ─── 2. Icon-Only Buttons Without aria-label ────────────────────────────────
echo "── 2/12: Scanning for icon-only buttons missing aria-label ──"

# Find buttons that contain only icons (svg, img, or icon class) without aria-label
ICON_BTNS=$(grep -rnE "<button[^>]*>[[:space:]]*((<svg|<img|<i |<Icon|<span class=\".*icon))" \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | \
  grep -v "aria-label" | grep -v "aria-labelledby" || true)

if [[ -n "$ICON_BTNS" ]]; then
  echo "❌ FAIL: Icon-only buttons found without aria-label:"
  echo "$ICON_BTNS" | head -10
  echo ""
  echo "   Fix: Add aria-label='Description of action' to each icon-only button."
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: All icon buttons have accessible labels."
fi
echo ""

# ─── 3. Hardcoded Color Values ──────────────────────────────────────────────
echo "── 3/12: Scanning for hardcoded colors (not using CSS variables) ──"

# Find hardcoded hex colors in inline styles or style props (JSX)
HARDCODED_COLORS=$(grep -rnE "(color|background|border):\s*['\"]?#[0-9a-fA-F]{3,8}" \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" --include="*.css" --include="*.scss" 2>/dev/null | \
  grep -v "var(--" | grep -v "CSS" | grep -v "custom-propert" | grep -v "node_modules" | head -20 || true)

if [[ -n "$HARDCODED_COLORS" ]]; then
  echo "⚠️  WARNING: Hardcoded color values found (may break theme switching):"
  echo "$HARDCODED_COLORS" | head -10
  echo ""
  echo "   Recommendation: Use CSS custom properties (var(--color-primary))"
  echo "   for all colors to support dark mode and theme switching."
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: No hardcoded color values detected."
fi
echo ""

# ─── 4. Missing Error Boundary ──────────────────────────────────────────────
echo "── 4/12: Checking for ErrorBoundary components ──"

ERROR_BOUNDARY=$(grep -rl "ErrorBoundary\|error.boundary\|componentDidCatch\|getDerivedStateFromError" \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" 2>/dev/null || true)

if [[ -z "$ERROR_BOUNDARY" ]]; then
  echo "⚠️  WARNING: No ErrorBoundary component found in source."
  echo "   Recommendation: Add a React ErrorBoundary to catch and display"
  echo "   runtime errors gracefully instead of showing a white screen."
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: ErrorBoundary component found."
  echo "   Files: $(echo "$ERROR_BOUNDARY" | head -3)"
fi
echo ""

# ─── 5. Generic Error Messages ──────────────────────────────────────────────
echo "── 5/12: Scanning for generic error messages ──"

GENERIC_ERRORS=$(grep -rnE "(Something went wrong|An error occurred|Oops|Error occurred|Unknown error)" \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" 2>/dev/null | \
  grep -v "node_modules" | grep -v "test" | grep -v "spec" || true)

if [[ -n "$GENERIC_ERRORS" ]]; then
  echo "⚠️  WARNING: Generic error messages found:"
  echo "$GENERIC_ERRORS" | head -10
  echo ""
  echo "   Recommendation: Replace with specific, actionable messages."
  echo "   Bad:  'Something went wrong.'"
  echo "   Good: 'Could not save your proposal. Check your connection and try again.'"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: No generic error messages detected."
fi
echo ""

# ─── 6. Console.log in Production Code ──────────────────────────────────────
echo "── 6/12: Scanning for console.log statements ──"

CONSOLE_LOGS=$(grep -rnE "console\.(log|debug|info)\(" \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" 2>/dev/null | \
  grep -v "node_modules" | grep -v "test" | grep -v "spec" | grep -v ".test." || true)

if [[ -n "$CONSOLE_LOGS" ]]; then
  echo "⚠️  WARNING: Console.log statements found in production code:"
  echo "$CONSOLE_LOGS" | head -10
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: No console.log statements in production code."
fi
echo ""

# ─── 7. Missing Helper Text on Form Inputs (Domain 16b) ───────────────────
echo "── 7/12: Scanning for form inputs without helper text ──"

# Find inputs that don't have aria-describedby (which links to helper text)
INPUTS_NO_HELP=$(grep -rnE '<(input|select|textarea)' \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | \
  grep -v 'aria-describedby' | grep -v 'type="hidden"' | grep -v 'type="submit"' | head -15 || true)

if [[ -n "$INPUTS_NO_HELP" ]]; then
  HELP_COUNT=$(echo "$INPUTS_NO_HELP" | wc -l | tr -d ' ')
  echo "⚠️  WARNING: Found $HELP_COUNT form input(s) without aria-describedby (no linked helper text):"
  echo "$INPUTS_NO_HELP" | head -5
  echo ""
  echo "   Recommendation: Add helper text below inputs and link via aria-describedby."
  echo "   Especially important for inputs with constraints (minlength, pattern, etc.)."
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: All form inputs have aria-describedby helper text links."
fi
echo ""

# ─── 8. Inconsistent Terminology (Domain 16f) ─────────────────────────────
echo "── 8/12: Scanning for inconsistent terminology ──"

# Define synonym pairs that often indicate terminology drift
TERMINOLOGY_ISSUES=0

# Check workspace/project/space synonyms
SYN_1A=$(grep -rcl '\bworkspace\b' "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')
SYN_1B=$(grep -rcl '\bproject\b' "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SYN_1A" -gt 0 ] && [ "$SYN_1B" -gt 0 ]; then
  echo "   ⚠️  'workspace' and 'project' both used — may confuse users if they mean the same thing."
  TERMINOLOGY_ISSUES=$((TERMINOLOGY_ISSUES + 1))
fi

# Check delete/remove/trash synonyms
SYN_2A=$(grep -rclE '>\s*Delete\s*<' "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')
SYN_2B=$(grep -rclE '>\s*Remove\s*<' "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SYN_2A" -gt 0 ] && [ "$SYN_2B" -gt 0 ]; then
  echo "   ⚠️  'Delete' and 'Remove' both used as CTAs — pick one for consistency."
  TERMINOLOGY_ISSUES=$((TERMINOLOGY_ISSUES + 1))
fi

# Check cancel/close/dismiss synonyms
SYN_3A=$(grep -rclE '>\s*Cancel\s*<' "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')
SYN_3B=$(grep -rclE '>\s*Close\s*<' "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')
SYN_3C=$(grep -rclE '>\s*Dismiss\s*<' "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')
CLOSE_VARIANTS=0
[ "$SYN_3A" -gt 0 ] && CLOSE_VARIANTS=$((CLOSE_VARIANTS + 1))
[ "$SYN_3B" -gt 0 ] && CLOSE_VARIANTS=$((CLOSE_VARIANTS + 1))
[ "$SYN_3C" -gt 0 ] && CLOSE_VARIANTS=$((CLOSE_VARIANTS + 1))
if [ "$CLOSE_VARIANTS" -gt 1 ]; then
  echo "   ⚠️  Multiple dismiss synonyms (Cancel/Close/Dismiss) used — consider standardizing."
  TERMINOLOGY_ISSUES=$((TERMINOLOGY_ISSUES + 1))
fi

if [ "$TERMINOLOGY_ISSUES" -gt 0 ]; then
  echo ""
  echo "⚠️  WARNING: $TERMINOLOGY_ISSUES terminology inconsistency/ies detected."
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: No obvious terminology inconsistencies found."
fi
echo ""

# ─── 9. Missing Empty State Components (Domain 16c) ───────────────────────
echo "── 9/12: Scanning for missing empty state handling ──"

# Look for conditional rendering patterns without a fallback
CONDITIONAL_RENDER=$(grep -rnE '\{.*\.length\s*>\s*0\s*&&|\{.*\.length\s*\?|\{.*\.map\(' \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | head -20 || true)

# Check if corresponding empty states exist
EMPTY_STATE_REFS=$(grep -rc 'empty.state\|no.data\|no.results\|no.items\|EmptyState\|emptyState\|NoResults' \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" --include="*.ts" 2>/dev/null \
  | awk -F: '{sum += $NF} END {print sum}' || echo "0")

if [[ -n "$CONDITIONAL_RENDER" ]]; then
  LIST_COUNT=$(echo "$CONDITIONAL_RENDER" | wc -l | tr -d ' ')
  if [ "$EMPTY_STATE_REFS" -lt 2 ] && [ "$LIST_COUNT" -gt 3 ]; then
    echo "⚠️  WARNING: Found $LIST_COUNT data-dependent renders but only $EMPTY_STATE_REFS empty state reference(s)."
    echo "   Some views may show blank space when there's no data."
    echo "   Add empty state components that explain what this area is for and what to do."
    WARNINGS=$((WARNINGS + 1))
  else
    echo "✅ PASS: $LIST_COUNT conditional renders with $EMPTY_STATE_REFS empty state reference(s)."
  fi
else
  echo "✅ PASS: No conditional render patterns detected."
fi
echo ""

# ─── 10. Weak Validation Messages (Domain 16d) ────────────────────────────
echo "── 10/12: Scanning for weak validation messages ──"

WEAK_VALIDATION=$(grep -rnE "(Required|Invalid|This field is required|Please fill|Error|Invalid input|Bad request)" \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" 2>/dev/null | \
  grep -v 'node_modules' | grep -v 'test' | grep -v 'spec' | grep -v '__mock' | \
  grep -v 'required:' | grep -v 'isRequired' || true)

if [[ -n "$WEAK_VALIDATION" ]]; then
  WV_COUNT=$(echo "$WEAK_VALIDATION" | wc -l | tr -d ' ')
  echo "⚠️  WARNING: Found $WV_COUNT potentially weak validation message(s):"
  echo "$WEAK_VALIDATION" | head -5
  echo ""
  echo "   Replace generic messages with specific, actionable guidance."
  echo "   Bad:  'Invalid input' / 'Required'"
  echo "   Good: 'Email must include @ and a domain' / 'Name is required to create your account'"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: No generic validation messages detected."
fi
echo ""

# ─── 11. CTA Verb+Noun Pattern (Domain 16a) ───────────────────────────────
echo "── 11/12: Scanning for single-word CTA buttons (missing verb+noun) ──"

# Find buttons that contain only a single word (no spaces in the text content)
SINGLE_WORD_CTA=$(grep -rnE '>\s*(Save|Send|Cancel|Back|Next|Done|Edit|Add|Update|Apply|Close|Open|Start|Stop|Run|View|Show|Hide|Clear|Reset|Retry|Skip|Continue|Proceed|Confirm|Accept|Reject|Decline)\s*<' \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | head -15 || true)

if [[ -n "$SINGLE_WORD_CTA" ]]; then
  SW_COUNT=$(echo "$SINGLE_WORD_CTA" | wc -l | tr -d ' ')
  echo "⚠️  WARNING: Found $SW_COUNT single-word CTA button(s):"
  echo "$SINGLE_WORD_CTA" | head -5
  echo ""
  echo "   Recommendation: Use verb+noun format for clarity."
  echo "   Bad:  'Save' / 'Continue'"
  echo "   Good: 'Save draft' / 'Continue to checkout'"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: No single-word CTA buttons detected."
fi
echo ""

# ─── 12. Inconsistent Capitalization (Domain 16g) ──────────────────────────
echo "── 12/12: Checking for mixed capitalization in button text ──"

# Extract button text and check for mixed Title Case vs sentence case
TITLE_CASE=$(grep -rnEo '>\s*[A-Z][a-z]+\s+[A-Z][a-z]+\s*<' \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')

SENTENCE_CASE=$(grep -rnEo '>\s*[A-Z][a-z]+\s+[a-z]+\s*<' \
  "$SRC_DIR" --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l | tr -d ' ')

if [ "$TITLE_CASE" -gt 3 ] && [ "$SENTENCE_CASE" -gt 3 ]; then
  echo "⚠️  WARNING: Mixed capitalization styles detected."
  echo "   Found ~$TITLE_CASE Title Case labels and ~$SENTENCE_CASE sentence case labels."
  echo "   Pick one style and use it consistently across all buttons and headings."
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: Capitalization style appears consistent."
fi
echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "  SUMMARY"
echo "  Errors:   $ERRORS"
echo "  Warnings: $WARNINGS"
echo ""

if [[ $ERRORS -gt 0 ]]; then
  echo "  ❌ UX SIGNAL SCAN FAILED — $ERRORS error(s) found."
  echo "═══════════════════════════════════════════════════════"
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  echo "  ⚠️  UX SIGNAL SCAN PASSED WITH WARNINGS"
  echo "═══════════════════════════════════════════════════════"
  exit 0
else
  echo "  ✅ UX SIGNAL SCAN PASSED — No issues found."
  echo "═══════════════════════════════════════════════════════"
  exit 0
fi
