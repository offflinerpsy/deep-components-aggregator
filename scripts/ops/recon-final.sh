#!/usr/bin/env bash
set -euo pipefail
NOW=2025-10-29
ART="docs/_artifacts/autodetect-${NOW}"
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
mkdir -p "$ART"/proofs "$ART"/screenshots "$ART"/sse "$ART"/logs
# Append logs
exec >> "$ART/logs/run.log" 2>&1
set -x
PORTS_MD="$ART/PORTS.md"
# Extract from existing PORTS.md
FRONT_PORT=$(awk -F"|" '/\| front \|/ {gsub(/ /, "", $2); print $2; exit}' "$PORTS_MD" || true)
BACK_PORT=$(awk -F"|" '/\| back \|/ {gsub(/ /, "", $2); print $2; exit}' "$PORTS_MD" || true)
FRONT_CWD=$(awk -F"|" '/\| front \|/ {gsub(/^ *| *$/, "", $4); print $4; exit}' "$PORTS_MD" || true)
BACK_CWD=$(awk -F"|" '/\| back \|/ {gsub(/^ *| *$/, "", $4); print $4; exit}' "$PORTS_MD" || true)
REWRITES=mismatch
# API proofs
if [[ -n "${BACK_PORT:-}" ]]; then
  curl -sSI "http://127.0.0.1:${BACK_PORT}/api/health" > "$ART/proofs/health.headers.txt" || true
  curl -sS  "http://127.0.0.1:${BACK_PORT}/api/health" > "$ART/proofs/health.body.json" || true
  curl -sSI "http://127.0.0.1:${BACK_PORT}/api/metrics" | head -40 > "$ART/proofs/metrics.headers.txt" || true
fi
if [[ -n "${FRONT_PORT:-}" ]]; then
  curl -sSI "http://127.0.0.1:${FRONT_PORT}/api/health" > "$ART/proofs/health-via-frontend.headers.txt" || true
  if [[ -s "$ART/proofs/health.headers.txt" && -s "$ART/proofs/health-via-frontend.headers.txt" ]]; then
    cb=$(head -1 "$ART/proofs/health.headers.txt" | awk '{print $2}')
    cf=$(head -1 "$ART/proofs/health-via-frontend.headers.txt" | awk '{print $2}')
    tb=$(grep -i '^content-type:' "$ART/proofs/health.headers.txt" | head -1 | cut -d' ' -f2-)
    tf=$(grep -i '^content-type:' "$ART/proofs/health-via-frontend.headers.txt" | head -1 | cut -d' ' -f2-)
    if [[ "$cb" == "$cf" && "$tb" == "$tf" ]]; then REWRITES=ok; else REWRITES=mismatch; fi
  fi
  {
    echo "Back: code=$(head -1 "$ART/proofs/health.headers.txt" | awk '{print $2}') CT=$(grep -i '^content-type:' "$ART/proofs/health.headers.txt" | head -1 | cut -d' ' -f2-)"
    echo "Front: code=$(head -1 "$ART/proofs/health-via-frontend.headers.txt" | awk '{print $2}') CT=$(grep -i '^content-type:' "$ART/proofs/health-via-frontend.headers.txt" | head -1 | cut -d' ' -f2-)"
    echo "Rewrites: ${REWRITES}"
  } > "$ART/proofs/rewrites-proof.md"
fi
# SSE
if [[ -n "${BACK_PORT:-}" ]]; then
  ( timeout 12 curl -N -H "Accept: text/event-stream" "http://127.0.0.1:${BACK_PORT}/api/live/search?q=LM317T" > "$ART/sse/stream.txt" ) 2>> "$ART/logs/run.log" || true
  head -30 "$ART/sse/stream.txt" > "$ART/sse/stream.head.txt" || true
fi
# Summary
FRONT_SUMMARY="not running"; BACK_SUMMARY="not running"
if [[ -n "${FRONT_PORT:-}" ]]; then FRONT_SUMMARY="$(realpath --relative-to="$REPO_ROOT" "${FRONT_CWD:-.}")@${FRONT_PORT}"; fi
if [[ -n "${BACK_PORT:-}" ]]; then BACK_SUMMARY="$(realpath --relative-to="$REPO_ROOT" "${BACK_CWD:-.}")@${BACK_PORT}"; fi
{
  echo "# Session Summary (${NOW})"
  echo
  echo "- FRONT: ${FRONT_SUMMARY}"
  echo "- BACK: ${BACK_SUMMARY}"
  echo "- Rewrites: ${REWRITES}"
  echo
  echo "## Artifacts"
  echo "- Inventory: ${ART}/REPO-INVENTORY.md"
  echo "- Ports: ${ART}/PORTS.md"
  echo "- Proofs: ${ART}/proofs"
  echo "- SSE: ${ART}/sse"
  echo "- Screenshots: ${ART}/screenshots"
  echo
  echo "## Re-run proofs"
  echo "See ${ART}/logs/run.log for exact commands and outputs."
} > "$ART/SESSION-SUMMARY.md"
# Commit and print summary
git add "$ART" || true
git commit -m "docs(recon): finalize API/SSE proofs and summary (${NOW})" || true
git push -u origin "ops/recon-${NOW}" || true

echo "FRONT=${FRONT_SUMMARY} | BACK=${BACK_SUMMARY} | rewrites=${REWRITES} | proofs=${ART} | branch=ops/recon-${NOW}"
echo "Open PR: https://github.com/offflinerpsy/deep-components-aggregator/pull/new/ops/recon-${NOW}"
