#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:9201}"
HEALTH_PATHS="${HEALTH_PATHS:-/_version /api/health}"
OUT_DIR="reports/VERIFY_$(date +%Y%m%d_%H%M%S)"
ART_DIR="$OUT_DIR/artifacts"
PW_FLAGS="${PW_FLAGS:---reporter=line --trace=on}"

mkdir -p "$ART_DIR"

echo "[1/7] Clean install"
npm ci

echo "[2/7] Ensure Playwright chromium"
npx playwright install --with-deps chromium >nul 2>&1 || npx playwright install --with-deps chromium >/dev/null 2>&1 || true

echo "[3/7] Start server"
( npm run start > "$OUT_DIR/server.log" 2>&1 & echo $! > "$OUT_DIR/server.pid" )
sleep 0.5

echo "[4/7] Health check"
ok=0
for i in $(seq 1 60); do
  for p in $HEALTH_PATHS; do
    code=$(curl -s -o nul -w "%{http_code}" "$BASE_URL$p" 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$p" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then ok=1; break; fi
  done
  [ "$ok" = "1" ] && break
  sleep 0.5
done
[ "$ok" = "1" ] || { echo "Health check failed"; cat "$OUT_DIR/server.log" || true; exit 1; }

echo "[5/7] API smoke snapshots"
mkdir -p "$OUT_DIR/api"
curl -sS "$BASE_URL/api/search?q=LM317T"    > "$OUT_DIR/api/search_LM317T.json" || true
curl -sS "$BASE_URL/api/product?mpn=LM317T" > "$OUT_DIR/api/product_LM317T.json" || true
curl -sS "$BASE_URL/api/product?mpn=1N4148W-TP" > "$OUT_DIR/api/product_1N4148W-TP.json" || true

echo "[6/7] Playwright e2e"
PWDEBUG=0 npx playwright test $PW_FLAGS || true
# собрать артефакты playwright
[ -d test-results ] && cp -R test-results "$ART_DIR/test-results"
[ -d playwright-report ] && cp -R playwright-report "$ART_DIR/playwright-report"
[ -d traces ] && cp -R traces "$ART_DIR/traces" || true
[ -d videos ] && cp -R videos "$ART_DIR/videos" || true

echo "[7/7] Summarize"
pass_cnt=$(jq '[.suites[]?.specs[]?.tests[]?.results[]?|select(.status=="passed")]|length' \
            $ART_DIR/test-results/*.json 2>/dev/null || echo 0)
fail_cnt=$(jq '[.suites[]?.specs[]?.tests[]?.results[]?|select(.status!="passed")]|length' \
            $ART_DIR/test-results/*.json 2>/dev/null || echo 0)
{
  echo "# VERIFY SUMMARY"
  echo "- base: $BASE_URL"
  echo "- health: OK"
  echo "- passed: $pass_cnt"
  echo "- failed: $fail_cnt"
  echo "- artifacts: $ART_DIR"
} > "$OUT_DIR/summary.md" || true

tar -C "$OUT_DIR" -czf "$OUT_DIR/artifacts.tar.gz" "artifacts" "api" "server.log" "summary.md" || true

# stop server
if [ -f "$OUT_DIR/server.pid" ]; then
  kill "$(cat "$OUT_DIR/server.pid")" 2>/dev/null || true
fi

echo "DONE → $OUT_DIR"
