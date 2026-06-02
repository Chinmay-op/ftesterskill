#!/usr/bin/env bash
# check-bundle-size.sh — Check gzipped size of JS chunks in a build directory.
# Usage: bash scripts/check-bundle-size.sh [dist-directory] [max-kb]
#        bash scripts/check-bundle-size.sh ./dist 250
#        bash scripts/check-bundle-size.sh --help

set -euo pipefail

# ─── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash check-bundle-size.sh <dist-directory> [max-size-kb]"
  echo ""
  echo "Checks the gzipped size of all .js files in the build directory."
  echo "Warns if any single chunk exceeds the specified max size (default: 250KB)."
  echo ""
  echo "Arguments:"
  echo "  dist-directory  Path to the production build output (e.g., ./dist)"
  echo "  max-size-kb     Maximum allowed gzipped size in KB (default: 250)"
  echo ""
  echo "Exit codes:"
  echo "  0  — All chunks are within the size limit"
  echo "  1  — One or more chunks exceed the limit"
  exit 0
fi

# ─── Config ──────────────────────────────────────────────────────────────────
DIST_DIR="${1:-./dist}"
MAX_KB="${2:-250}"
FAIL=0

if [[ ! -d "$DIST_DIR" ]]; then
  echo "❌ ERROR: Directory '$DIST_DIR' does not exist."
  echo "   Run your production build first (npm run build)."
  exit 1
fi

# Check for gzip availability
if ! command -v gzip &>/dev/null; then
  echo "❌ ERROR: gzip is not installed. Cannot measure compressed sizes."
  exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  📦 BUNDLE SIZE CHECK — $DIST_DIR (max: ${MAX_KB}KB gzipped)"
echo "═══════════════════════════════════════════════════════"
echo ""

TOTAL_RAW=0
TOTAL_GZ=0
OVER_LIMIT=0

printf "%-50s %10s %10s %s\n" "FILE" "RAW (KB)" "GZIP (KB)" "STATUS"
printf "%-50s %10s %10s %s\n" "────" "────────" "────────" "──────"

# Find all JS files and check their gzipped size
while IFS= read -r -d '' file; do
  BASENAME=$(basename "$file")
  RAW_BYTES=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
  RAW_KB=$((RAW_BYTES / 1024))

  GZ_BYTES=$(gzip -c "$file" | wc -c)
  GZ_KB=$((GZ_BYTES / 1024))

  TOTAL_RAW=$((TOTAL_RAW + RAW_KB))
  TOTAL_GZ=$((TOTAL_GZ + GZ_KB))

  if [[ $GZ_KB -gt $MAX_KB ]]; then
    STATUS="❌ OVER LIMIT"
    OVER_LIMIT=$((OVER_LIMIT + 1))
    FAIL=1
  else
    STATUS="✅"
  fi

  printf "%-50s %8dKB %8dKB %s\n" "$BASENAME" "$RAW_KB" "$GZ_KB" "$STATUS"
done < <(find "$DIST_DIR" -name "*.js" -type f -print0 | sort -z)

echo ""
printf "%-50s %8dKB %8dKB\n" "TOTAL" "$TOTAL_RAW" "$TOTAL_GZ"
echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
if [[ $FAIL -ne 0 ]]; then
  echo "  ⚠️  $OVER_LIMIT chunk(s) exceed ${MAX_KB}KB gzipped."
  echo "  Consider code-splitting, tree-shaking, or lazy loading."
  echo "═══════════════════════════════════════════════════════"
  exit 1
else
  echo "  ✅ All chunks are within the ${MAX_KB}KB gzipped limit."
  echo "═══════════════════════════════════════════════════════"
  exit 0
fi
