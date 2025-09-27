#!/usr/bin/env bash
set -euo pipefail
APP="deep-aggregator"
PORT="${PORT:-9201}"

if pm2 jlist | grep -q "\"name\":\"$APP\""; then pm2 restart "$APP"; else pm2 start /root/aggregator-v2/ecosystem.config.cjs; fi
sleep 2
# Убиваем сироты по порту (если вдруг остались зависшие node-процессы)
if command -v lsof >/dev/null 2>&1; then
  PID=$(lsof -t -i TCP:$PORT || true); [ -n "$PID" ] && kill -9 $PID || true
fi
pm2 save
pm2 ping || pm2 restart "$APP"
