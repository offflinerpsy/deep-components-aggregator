#!/usr/bin/env bash
set -euo pipefail

echo "=== WARP Proxy Hard Reset ==="

echo "=== WARP Proxy Hard Reset ==="

# Non-interactive mode
export DEBIAN_FRONTEND=noninteractive

# Update and install
echo "Installing cloudflare-warp..."
sudo -E apt-get -yq update
sudo -E apt-get -yq install cloudflare-warp curl jq

# Ensure daemon is running (don't stop it!)
echo "Ensuring warp-svc is running..."
sudo systemctl enable warp-svc
sudo systemctl start warp-svc || true
sleep 3

# Check current status
echo "Current WARP status:"
warp-cli --accept-tos status || echo "Not registered yet"

# Delete old registration if exists
echo "Deleting old registration (if any)..."
warp-cli --accept-tos registration delete || true
sleep 2

# Fresh registration
echo "Creating new registration..."
warp-cli --accept-tos registration new

# Set proxy mode (CRITICAL: this must be set before connect)
echo "Setting proxy mode..."
warp-cli --accept-tos mode proxy

# Use default port 40000 (most reliable)
echo "Using default SOCKS5 port 40000..."

# Connect
echo "Connecting to WARP..."
warp-cli --accept-tos connect

# Wait for connection
sleep 3

# Status check
echo "=== WARP Status ==="
warp-cli --accept-tos status

# Proxy test
echo ""
echo "=== Proxy Test ==="
curl -s --socks5-hostname 127.0.0.1:40000 https://www.cloudflare.com/cdn-cgi/trace/ | egrep 'warp=|ip=' || echo "PROXY TEST FAILED"

echo ""
echo "=== WARP Fix Complete ==="
echo "Proxy available at: socks5://127.0.0.1:40000"
echo "HTTP proxy available at: http://127.0.0.1:40000"
