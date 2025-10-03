#!/usr/bin/env bash
set -euo pipefail

echo "=== WARP Proxy Complete Reset ==="

# Non-interactive mode
export DEBIAN_FRONTEND=noninteractive

# 1. Full systemd restart
echo "Step 1: Full daemon restart..."
sudo systemctl stop warp-svc || true
sudo pkill -9 warp-svc || true
sleep 2
sudo systemctl start warp-svc
sleep 5

# 2. Wait for daemon to be ready
echo "Step 2: Waiting for daemon..."
for i in {1..10}; do
  if warp-cli --accept-tos status >/dev/null 2>&1; then
    echo "Daemon ready!"
    break
  fi
  echo "Attempt $i/10..."
  sleep 2
done

# 3. Check current mode
echo "Step 3: Current configuration:"
warp-cli --accept-tos settings || true

# 4. Set proxy mode if not already set
echo "Step 4: Setting proxy mode..."
warp-cli --accept-tos mode proxy || echo "Mode already set or command failed"

# 5. Connect if not connected
echo "Step 5: Ensuring connection..."
warp-cli --accept-tos connect || echo "Already connected or command failed"

sleep 3

# 6. Final status
echo ""
echo "=== Final WARP Status ==="
warp-cli --accept-tos status

# 7. Test proxy
echo ""
echo "=== Proxy Test (SOCKS5 on port 40000) ==="
timeout 10 curl -s --socks5-hostname 127.0.0.1:40000 https://www.cloudflare.com/cdn-cgi/trace/ | egrep 'warp=|ip=' || echo "⚠️  PROXY TEST FAILED"

echo ""
echo "=== WARP Setup Complete ==="
echo "Proxy available at: socks5://127.0.0.1:40000"
