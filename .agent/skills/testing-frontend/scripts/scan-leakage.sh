#!/usr/bin/env bash
# scan-leakage.sh — Scan build output for exposed secrets, env leaks, and internal URLs.
# Usage: bash scripts/scan-leakage.sh [dist-directory]
#        bash scripts/scan-leakage.sh ./dist
#        bash scripts/scan-leakage.sh --help

set -euo pipefail

# ─── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash scan-leakage.sh <dist-directory> [preview-url]"
  echo ""
  echo "Scans the specified build output directory for:"
  echo "  1. Exposed secrets (API keys, tokens, passwords)"
  echo "  2. Environment variables baked into JS bundles"
  echo "  3. Hardcoded internal IPs, localhost, or staging URLs"
  echo "  4. Missing security headers (CSP, HSTS, X-Frame-Options)"
  echo "  5. External resources without Subresource Integrity (SRI)"
  echo "  6. npm dependency vulnerabilities (npm audit)"
  echo "  7. Cookie security flags (HttpOnly, Secure, SameSite)"
  echo "  8. Mixed content (HTTP resources on HTTPS pages)"
  echo ""
  echo "Exit codes:"
  echo "  0  — All checks passed"
  echo "  1  — One or more leakage/security issues found"
  exit 0
fi

# ─── Config ──────────────────────────────────────────────────────────────────
DIST_DIR="${1:-.\/dist}"
PREVIEW_URL="${2:-http://localhost:4173}"
FAIL=0

if [[ ! -d "$DIST_DIR" ]]; then
  echo "❌ ERROR: Directory '$DIST_DIR' does not exist."
  echo "   Run your production build first (npm run build)."
  exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  🔍 SECURITY & LEAKAGE SCAN — $DIST_DIR"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── 1. Exposed Secrets ─────────────────────────────────────────────────────
echo "── 1/8: Scanning for exposed secrets (api_key, token, password, etc.) ──"
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
echo "── 2/8: Scanning for baked-in environment variables ──"
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
echo "── 3/8: Scanning for internal IPs, localhost, and staging URLs ──"
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

# ─── 4. Security Headers (Domain 2b) ────────────────────────────────────────
echo "── 4/8: Checking security headers on preview server ──"

# Only run if preview URL is accessible
if curl -sI "$PREVIEW_URL" -o /dev/null 2>/dev/null; then
  HEADERS=$(curl -sI "$PREVIEW_URL" 2>/dev/null)
  HEADER_ISSUES=0

  # Check each security header
  if ! echo "$HEADERS" | grep -qi 'content-security-policy'; then
    echo "⚠️  Missing: Content-Security-Policy header"
    HEADER_ISSUES=$((HEADER_ISSUES + 1))
  fi
  if ! echo "$HEADERS" | grep -qi 'x-frame-options'; then
    echo "⚠️  Missing: X-Frame-Options header"
    HEADER_ISSUES=$((HEADER_ISSUES + 1))
  fi
  if ! echo "$HEADERS" | grep -qi 'x-content-type-options'; then
    echo "⚠️  Missing: X-Content-Type-Options header"
    HEADER_ISSUES=$((HEADER_ISSUES + 1))
  fi
  if ! echo "$HEADERS" | grep -qi 'referrer-policy'; then
    echo "⚠️  Missing: Referrer-Policy header"
    HEADER_ISSUES=$((HEADER_ISSUES + 1))
  fi
  if ! echo "$HEADERS" | grep -qi 'strict-transport-security'; then
    echo "   ℹ️  No Strict-Transport-Security (expected on HTTPS deployments)"
  fi

  if [ "$HEADER_ISSUES" -gt 0 ]; then
    echo ""
    echo "⚠️  WARNING: $HEADER_ISSUES security header(s) missing."
    echo "   These headers protect against clickjacking, MIME sniffing, and XSS."
    FAIL=1
  else
    echo "✅ PASS: All critical security headers present."
  fi
else
  echo "   ℹ️  Preview server not reachable at $PREVIEW_URL — skipping header check."
fi
echo ""

# ─── 5. Subresource Integrity (Domain 2c) ───────────────────────────────────
echo "── 5/8: Scanning for external resources without SRI ──"

SRI_MISSING=$(find "$DIST_DIR" -name '*.html' -exec grep -lnE '<(script|link)[^>]+https?://' {} \; 2>/dev/null | \
  xargs grep -nE '<(script|link)[^>]+https?://' 2>/dev/null | \
  grep -v 'integrity=' || true)

if [[ -n "$SRI_MISSING" ]]; then
  echo "⚠️  WARNING: External resources loaded without Subresource Integrity (SRI):"
  echo "$SRI_MISSING" | head -10
  echo ""
  echo "   Add integrity=\"sha384-...\" to external <script> and <link> tags."
  FAIL=1
else
  echo "✅ PASS: All external resources use SRI or no external resources found."
fi
echo ""

# ─── 6. Dependency Vulnerabilities (Domain 2d) ──────────────────────────────
echo "── 6/8: Running npm audit for dependency vulnerabilities ──"

if command -v npm &>/dev/null; then
  AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || true)
  
  if [[ -n "$AUDIT_OUTPUT" ]]; then
    CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -c '"severity":"critical"' 2>/dev/null || echo "0")
    HIGH=$(echo "$AUDIT_OUTPUT" | grep -c '"severity":"high"' 2>/dev/null || echo "0")
    MODERATE=$(echo "$AUDIT_OUTPUT" | grep -c '"severity":"moderate"' 2>/dev/null || echo "0")

    if [ "$CRITICAL" -gt 0 ]; then
      echo "❌ FAIL: $CRITICAL critical vulnerability/ies found in dependencies."
      FAIL=1
    elif [ "$HIGH" -gt 0 ]; then
      echo "⚠️  WARNING: $HIGH high-severity vulnerability/ies found."
      FAIL=1
    elif [ "$MODERATE" -gt 0 ]; then
      echo "⚠️  WARNING: $MODERATE moderate vulnerability/ies found."
    else
      echo "✅ PASS: No known vulnerabilities in dependencies."
    fi
  else
    echo "   ℹ️  npm audit returned no output — may not have a package-lock.json."
  fi
else
  echo "   ℹ️  npm not available — skipping dependency audit."
fi
echo ""

# ─── 7. Cookie Security Flags (Domain 2e) ───────────────────────────────────
echo "── 7/8: Checking for cookie security patterns in source ──"

# Check for cookie setting without security flags
COOKIE_SET=$(grep -rnE 'document\.cookie|setCookie|cookies?\.set|res\.cookie' "$DIST_DIR" \
  --include="*.js" --include="*.mjs" 2>/dev/null | head -10 || true)

if [[ -n "$COOKIE_SET" ]]; then
  SECURE_FLAGS=$(echo "$COOKIE_SET" | grep -ciE 'secure|httponly|samesite' || echo "0")
  TOTAL_COOKIES=$(echo "$COOKIE_SET" | wc -l | tr -d ' ')
  
  if [ "$SECURE_FLAGS" -lt "$TOTAL_COOKIES" ]; then
    echo "⚠️  WARNING: Found cookie operations that may be missing security flags:"
    echo "$COOKIE_SET" | grep -viE 'secure|httponly|samesite' | head -5
    echo ""
    echo "   Auth cookies must use HttpOnly, Secure, and SameSite=Strict or Lax."
  else
    echo "✅ PASS: Cookie operations include security flags."
  fi
else
  echo "✅ PASS: No direct cookie manipulation detected in bundle."
fi
echo ""

# ─── 8. Mixed Content (Domain 2f) ───────────────────────────────────────────
echo "── 8/8: Scanning for mixed content (HTTP on HTTPS) ──"

MIXED=$(grep -rnE 'http://[^l]' "$DIST_DIR" \
  --include="*.html" --include="*.js" --include="*.css" 2>/dev/null | \
  grep -v 'localhost\|127.0.0.1\|//comments\|//' | head -10 || true)

if [[ -n "$MIXED" ]]; then
  echo "⚠️  WARNING: Possible mixed content (HTTP URLs in production assets):"
  echo "$MIXED" | head -5
  echo ""
  echo "   All production URLs should use HTTPS."
  FAIL=1
else
  echo "✅ PASS: No mixed content detected."
fi
echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
if [[ $FAIL -ne 0 ]]; then
  echo "  ❌ SECURITY & LEAKAGE SCAN FAILED — Review issues above."
  echo "═══════════════════════════════════════════════════════"
  exit 1
else
  echo "  ✅ SECURITY & LEAKAGE SCAN PASSED — No issues found."
  echo "═══════════════════════════════════════════════════════"
  exit 0
fi
