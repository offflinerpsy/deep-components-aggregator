#!/bin/bash
# setup-warp-proxy.sh - Install and configure Cloudflare WARP proxy
# This allows all outbound API calls to route through Cloudflare's network,
# bypassing potential regional blocks and improving reliability.

set -euo pipefail

echo "=== Cloudflare WARP Proxy Setup ==="
echo ""

# 1) Install WARP if not present
if ! command -v warp-cli &>/dev/null; then
  echo "[1/6] Installing Cloudflare WARP..."
  
  # Add Cloudflare GPG key
  curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | \
    sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
  
  # Add Cloudflare repository
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ jammy main" | \
    sudo tee /etc/apt/sources.list.d/cloudflare-client.list
  
  # Update and install
  export DEBIAN_FRONTEND=noninteractive
  sudo -E apt-get update -yq >/dev/null 2>&1
  sudo -E apt-get install -yq cloudflare-warp >/dev/null 2>&1
  
  echo "  ✓ WARP installed"
else
  echo "[1/6] WARP already installed"
fi

# 2) Register WARP (if not registered)
echo "[2/6] Registering WARP..."
if ! sudo warp-cli account 2>&1 | grep -q "Success"; then
  sudo warp-cli --accept-tos registration new
  echo "  ✓ WARP registered"
else
  echo "  ✓ Already registered"
fi

# 3) Set proxy mode
echo "[3/6] Configuring proxy mode..."
sudo warp-cli mode proxy
echo "  ✓ Proxy mode enabled"

# 4) Set proxy port
PROXY_PORT=${WARP_PROXY_PORT:-24000}
echo "[4/6] Setting proxy port to $PROXY_PORT..."
sudo warp-cli set-proxy-port "$PROXY_PORT"
echo "  ✓ Proxy port set"

# 5) Connect WARP
echo "[5/6] Connecting WARP..."
sudo warp-cli connect || true
sleep 2
echo "  ✓ WARP connected"

# 6) Verify connection
echo "[6/6] Verifying WARP connection..."
WARP_STATUS=$(curl -s https://www.cloudflare.com/cdn-cgi/trace/ | grep "warp=" | cut -d= -f2)

if [[ "$WARP_STATUS" == "on" ]] || [[ "$WARP_STATUS" == "plus" ]]; then
  echo "  ✓ WARP is active: $WARP_STATUS"
else
  echo "  ⚠ WARP may not be active (status: $WARP_STATUS)"
  echo "  This is expected if testing from the server itself."
  echo "  Application traffic will still route through proxy."
fi

# 7) Display proxy info
echo ""
echo "=== WARP Proxy Ready ==="
echo "Proxy URL: http://127.0.0.1:$PROXY_PORT"
echo ""
echo "To use in Node.js (undici):"
echo "  import { ProxyAgent, setGlobalDispatcher } from 'undici';"
echo "  setGlobalDispatcher(new ProxyAgent({ uri: 'http://127.0.0.1:$PROXY_PORT' }));"
echo ""
echo "To test proxy manually:"
echo "  curl -x http://127.0.0.1:$PROXY_PORT https://www.cloudflare.com/cdn-cgi/trace/"
echo ""

# 8) Check WARP status
echo "Current WARP status:"
sudo warp-cli status

echo ""
echo "=== Setup Complete ==="
