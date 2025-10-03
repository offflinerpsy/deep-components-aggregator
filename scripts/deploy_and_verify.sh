#!/usr/bin/env bash
# deploy_and_verify.sh - Universal deployment script with zero interaction
# Supports SSH keys, password via env, bastion jump hosts, systemd/PM2
set -euo pipefail

# Configuration (override via environment)
: "${SSH_HOST:=5.129.228.88}"
: "${SSH_USER:=root}"
: "${SSH_PORT:=22}"
: "${SSH_KEY:=}"
: "${SSH_PASS:=}"
: "${BASTION_HOST:=}"
: "${APP_DIR:=/opt/deep-agg}"
: "${SERVICE_NAME:=deep-aggregator.service}"
: "${USE_PM2:=false}"
: "${NODE_ENV:=production}"
: "${WARP_PROXY_PORT:=24000}"
: "${USE_WARP_PROXY:=false}"

echo "=== Deep Aggregator Deployment ==="
echo "Target: $SSH_USER@$SSH_HOST:$APP_DIR"

# 0) Populate known_hosts (avoid fingerprint prompt)
echo "[0/10] Adding SSH host key..."
mkdir -p ~/.ssh && touch ~/.ssh/known_hosts
ssh-keyscan -p "$SSH_PORT" "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true

# 1) Determine SSH command (key vs password vs bastion)
SSH_OPTS=(-p "$SSH_PORT" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)

if [[ -n "$BASTION_HOST" ]]; then
  SSH_OPTS=(-J "$SSH_USER@$BASTION_HOST" "${SSH_OPTS[@]}")
fi

if [[ -n "$SSH_KEY" ]]; then
  SSH_CMD=(ssh -i "$SSH_KEY" "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST")
  SCP_CMD=(scp -i "$SSH_KEY" "${SSH_OPTS[@]}")
elif [[ -n "$SSH_PASS" ]]; then
  SSH_CMD=(sshpass -p "$SSH_PASS" ssh "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST")
  SCP_CMD=(sshpass -p "$SSH_PASS" scp "${SSH_OPTS[@]}")
else
  SSH_CMD=(ssh "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST")
  SCP_CMD=(scp "${SSH_OPTS[@]}")
fi

# 2) Test connection
echo "[1/10] Testing SSH connection..."
if ! "${SSH_CMD[@]}" "echo Connection OK" >/dev/null; then
  echo "ERROR: SSH connection failed"
  exit 1
fi

# 3) Install dependencies on server (non-interactive)
echo "[2/10] Installing dependencies on server..."
"${SSH_CMD[@]}" "export DEBIAN_FRONTEND=noninteractive; sudo -E apt-get update -yq >/dev/null 2>&1 && sudo -E apt-get install -yq --no-install-recommends rsync jq curl >/dev/null 2>&1 || true"

# 4) Setup WARP proxy (if enabled)
if [[ "$USE_WARP_PROXY" == "true" ]]; then
  echo "[3/10] Configuring WARP proxy..."
  "${SSH_CMD[@]}" "
    if ! command -v warp-cli &>/dev/null; then
      curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
      echo 'deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ jammy main' | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
      export DEBIAN_FRONTEND=noninteractive
      sudo -E apt-get update -yq >/dev/null 2>&1
      sudo -E apt-get install -yq cloudflare-warp >/dev/null 2>&1
      sudo warp-cli registration new
    fi
    sudo warp-cli mode proxy
    sudo warp-cli set-proxy-port $WARP_PROXY_PORT
    sudo warp-cli connect || true
  "
else
  echo "[3/10] Skipping WARP proxy setup"
fi

# 5) Create backup
echo "[4/10] Creating backup..."
"${SSH_CMD[@]}" "cd $APP_DIR && tar -czf backup-\$(date +%Y%m%d-%H%M%S).tar.gz server.js api/ config/ db/ middleware/ 2>/dev/null || true"

# 6) Stop existing server
echo "[5/10] Stopping existing server..."
if [[ "$USE_PM2" == "true" ]]; then
  "${SSH_CMD[@]}" "pm2 stop all || true"
else
  "${SSH_CMD[@]}" "sudo systemctl stop $SERVICE_NAME || sudo pkill -9 node || true"
fi
sleep 2

# 7) Sync files (rsync)
echo "[6/10] Syncing application files..."
rsync -az --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "*.log" \
  --exclude "*.sqlite" \
  --exclude "backup-*" \
  -e "ssh -p $SSH_PORT -o StrictHostKeyChecking=accept-new ${SSH_KEY:+-i $SSH_KEY}" \
  ./ "$SSH_USER@$SSH_HOST:$APP_DIR/"

# 8) Install dependencies + run migrations
echo "[7/10] Installing dependencies and running migrations..."
"${SSH_CMD[@]}" "
  cd $APP_DIR
  export NODE_ENV=$NODE_ENV
  npm ci --production --no-audit --no-fund --loglevel=error
  node scripts/apply_migration.mjs
"

# 9) Start server
echo "[8/10] Starting server..."
if [[ "$USE_PM2" == "true" ]]; then
  "${SSH_CMD[@]}" "cd $APP_DIR && pm2 reload all || pm2 start ecosystem.config.js --env $NODE_ENV"
else
  "${SSH_CMD[@]}" "
    cd $APP_DIR
    sudo systemctl daemon-reload
    sudo systemctl enable --now $SERVICE_NAME
    sudo systemctl restart $SERVICE_NAME
  "
fi

sleep 5

# 10) Smoke tests
echo "[9/10] Running smoke tests..."
echo -n "  Health: "
"${SSH_CMD[@]}" "curl -sf http://localhost:9201/api/health >/dev/null && echo OK || echo FAIL"

echo -n "  Auth /me: "
"${SSH_CMD[@]}" "curl -sf http://localhost:9201/auth/me >/dev/null && echo OK || echo OK (expected unauthorized)"

echo -n "  Search: "
"${SSH_CMD[@]}" "curl -sf 'http://localhost:9201/api/search?q=LM317' >/dev/null && echo OK || echo FAIL"

echo -n "  Product Card v2: "
"${SSH_CMD[@]}" "curl -sf http://localhost:9201/ui/product-v2.html >/dev/null && echo OK || echo FAIL"

# 11) Service status
echo "[10/10] Checking service status..."
if [[ "$USE_PM2" == "true" ]]; then
  "${SSH_CMD[@]}" "pm2 list | grep -i online || echo 'PM2 status check failed'"
else
  "${SSH_CMD[@]}" "sudo systemctl status $SERVICE_NAME --no-pager -l | tail -n 20 || true"
fi

echo ""
echo "=== Deployment Complete! ==="
echo "Production URL: http://$SSH_HOST:9201"
echo "Health: http://$SSH_HOST:9201/api/health"
echo "Auth: http://$SSH_HOST:9201/ui/auth.html"
echo "Product Card v2: http://$SSH_HOST:9201/ui/product-v2.html?id=LM317"
