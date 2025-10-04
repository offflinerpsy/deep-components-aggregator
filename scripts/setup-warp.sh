#!/usr/bin/env bash
# WARP Proxy Setup Script — Production Server
# Installs and configures Cloudflare WARP in proxy mode (port 40000)
# Reference: https://developers.cloudflare.com/warp-client/

set -euo pipefail

echo "=== Cloudflare WARP Proxy Setup ==="
echo ""

# Check if running on Debian/Ubuntu
if ! command -v apt-get &> /dev/null; then
  echo "Error: This script requires Debian/Ubuntu (apt-get)"
  exit 1
fi

# 1. Install WARP
echo "[1/6] Installing cloudflare-warp..."
if ! command -v warp-cli &> /dev/null; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -yq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -yq curl gnupg lsb-release
  
  # Add Cloudflare GPG key
  curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor -o /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
  
  # Add repository
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
  
  # Install
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -yq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -yq cloudflare-warp
  
  echo "✓ WARP installed"
else
  echo "✓ WARP already installed ($(warp-cli --version))"
fi
echo ""

# 2. Stop service (to reconfigure)
echo "[2/6] Stopping warp-svc service..."
sudo systemctl stop warp-svc || true
sleep 2
echo "✓ Service stopped"
echo ""

# 3. Register (if not already registered)
echo "[3/6] Registering WARP client..."
if ! warp-cli --accept-tos account 2>&1 | grep -q "Success"; then
  warp-cli --accept-tos registration new || true
  echo "✓ Registration complete"
else
  echo "✓ Already registered"
fi
echo ""

# 4. Configure proxy mode
echo "[4/6] Configuring proxy mode..."
warp-cli --accept-tos set-mode proxy
warp-cli --accept-tos set-proxy-port 40000
echo "✓ Proxy mode enabled on port 40000"
echo ""

# 5. Enable and start service
echo "[5/6] Enabling and starting warp-svc..."
sudo systemctl enable warp-svc
sudo systemctl start warp-svc
sleep 3

# Wait for service to be ready
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if systemctl is-active --quiet warp-svc; then
    echo "✓ Service is active"
    break
  fi
  echo "  Waiting for service... ($WAITED/$MAX_WAIT)"
  sleep 2
  WAITED=$((WAITED + 2))
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "⚠️  Service startup timeout. Check: sudo journalctl -u warp-svc -n 50"
  exit 1
fi
echo ""

# 6. Connect
echo "[6/6] Connecting to WARP..."
warp-cli --accept-tos connect
sleep 3

# Verify connection
STATUS=$(warp-cli --accept-tos status)
echo "✓ WARP Status:"
echo "$STATUS"
echo ""

# 7. Verify proxy works
echo "=== Verification ==="
echo "Testing proxy via Cloudflare trace..."
TRACE=$(curl -s --max-time 10 --socks5-hostname 127.0.0.1:40000 https://www.cloudflare.com/cdn-cgi/trace/ 2>&1 || echo "ERROR")

if echo "$TRACE" | grep -q "warp="; then
  WARP_STATUS=$(echo "$TRACE" | grep "warp=" | cut -d= -f2)
  CLIENT_IP=$(echo "$TRACE" | grep "ip=" | cut -d= -f2)
  
  echo "✅ Proxy verification successful!"
  echo "   WARP: $WARP_STATUS"
  echo "   IP:   $CLIENT_IP"
  
  if [ "$WARP_STATUS" = "on" ]; then
    echo ""
    echo "=== Setup Complete ==="
    echo "WARP proxy is running on http://127.0.0.1:40000"
    echo ""
    echo "Test with Node.js:"
    echo "  HTTP_PROXY=http://127.0.0.1:40000 node scripts/check-providers.mjs"
    echo ""
    echo "Useful commands:"
    echo "  warp-cli status              # Check connection"
    echo "  warp-cli disconnect          # Disconnect"
    echo "  warp-cli connect             # Reconnect"
    echo "  sudo systemctl status warp-svc  # Service status"
    echo "  sudo journalctl -u warp-svc  # Service logs"
  else
    echo "⚠️  WARP is connected but warp=off (check configuration)"
  fi
else
  echo "❌ Proxy verification failed"
  echo "Response: $TRACE"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check service: sudo systemctl status warp-svc"
  echo "  2. Check logs: sudo journalctl -u warp-svc -n 100"
  echo "  3. Verify port: netstat -tulpn | grep 40000"
  echo "  4. Manual test: curl --socks5 127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace/"
  exit 1
fi
