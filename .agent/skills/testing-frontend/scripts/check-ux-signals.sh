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
echo "  🎨 UX SIGNAL SCAN — $SRC_DIR"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── 1. Ambiguous Button Labels ─────────────────────────────────────────────
echo "── 1/6: Scanning for ambiguous CTA labels ──"

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
echo "── 2/6: Scanning for icon-only buttons missing aria-label ──"

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
echo "── 3/6: Scanning for hardcoded colors (not using CSS variables) ──"

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
echo "── 4/6: Checking for ErrorBoundary components ──"

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
echo "── 5/6: Scanning for generic error messages ──"

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
echo "── 6/6: Scanning for console.log statements ──"

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
