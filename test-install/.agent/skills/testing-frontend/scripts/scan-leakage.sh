#!/usr/bin/env bash
# scan-leakage.sh — Scan build output for exposed secrets, env leaks, and internal URLs.
# Usage: bash scripts/scan-leakage.sh [dist-directory]
#        bash scripts/scan-leakage.sh ./dist
#        bash scripts/scan-leakage.sh --help

set -euo pipefail

# ─── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash scan-leakage.sh <dist-directory>"
  echo ""
  echo "Scans the specified build output directory for:"
  echo "  1. Exposed secrets (API keys, tokens, passwords)"
  echo "  2. Environment variables baked into JS bundles"
  echo "  3. Hardcoded internal IPs, localhost, or staging URLs"
  echo ""
  echo "Exit codes:"
  echo "  0  — All checks passed"
  echo "  1  — One or more leakage issues found"
  exit 0
fi

# ─── Config ──────────────────────────────────────────────────────────────────
DIST_DIR="${1:-.\/dist}"
FAIL=0

if [[ ! -d "$DIST_DIR" ]]; then
  echo "❌ ERROR: Directory '$DIST_DIR' does not exist."
  echo "   Run your production build first (npm run build)."
  exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  🔍 LEAKAGE SCAN — $DIST_DIR"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── 1. Exposed Secrets ─────────────────────────────────────────────────────
echo "── 1/3: Scanning for exposed secrets (api_key, token, password, etc.) ──"
SECRETS=$(grep -rnE "(api_key|apikey|secret|password|token|bearer)\s*[:=]\s*['\"][^'\"]{8,}" "$DIST_DIR" 2>/dev/null || true)
if [[ -n "$SECRETS" ]]; then
  echo "❌ FAIL: Possible secrets found in bundle output:"
  echo "$SECRETS" | head -20
  echo ""
  FAIL=1
else
  echo "✅ PASS: No exposed secrets detected."
fi
echo ""

# ─── 2. Baked-in Env Variables ───────────────────────────────────────────────
echo "── 2/3: Scanning for baked-in environment variables ──"
ENV_LEAKS=$(grep -rnE "REACT_APP_|VITE_|NEXT_PUBLIC_" "$DIST_DIR" 2>/dev/null || true)
if [[ -n "$ENV_LEAKS" ]]; then
  echo "⚠️  WARNING: Environment variable references found in bundle:"
  echo "$ENV_LEAKS" | head -20
  echo ""
  echo "   Review each match. Public env vars (e.g., NEXT_PUBLIC_SITE_URL)"
  echo "   may be intentional. Secret values must never be bundled."
  FAIL=1
else
  echo "✅ PASS: No environment variable references in bundle."
fi
echo ""

# ─── 3. Internal IPs / Staging URLs ─────────────────────────────────────────
echo "── 3/3: Scanning for internal IPs, localhost, and staging URLs ──"
INTERNAL=$(grep -rnE "(localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.\d+\.\d+|staging\.|internal\.)" "$DIST_DIR" 2>/dev/null || true)
if [[ -n "$INTERNAL" ]]; then
  echo "❌ FAIL: Internal/staging references found in bundle:"
  echo "$INTERNAL" | head -20
  echo ""
  FAIL=1
else
  echo "✅ PASS: No internal IPs or staging URLs detected."
fi
echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
if [[ $FAIL -ne 0 ]]; then
  echo "  ❌ LEAKAGE SCAN FAILED — Review issues above."
  echo "═══════════════════════════════════════════════════════"
  exit 1
else
  echo "  ✅ LEAKAGE SCAN PASSED — No issues found."
  echo "═══════════════════════════════════════════════════════"
  exit 0
fi
