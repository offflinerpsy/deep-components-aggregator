# WARP Proxy Auto-Configuration

### Step 1: Install WARP
```bash
# Install Cloudflare WARP
curl https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
sudo apt update
sudo apt install -y cloudflare-warp

# Initial registration
warp-cli --accept-tos registration new
warp-cli --accept-tos mode proxy
warp-cli --accept-tos connect
```

### Step 2: Install systemd services
```bash
# Copy service files
sudo cp /opt/deep-agg/deployment/warp-tunnel.service /etc/systemd/system/
sudo cp /opt/deep-agg/deployment/warp-monitor.service /etc/systemd/system/

# Enable and start services
sudo systemctl enable warp-tunnel warp-monitor
sudo systemctl start warp-tunnel warp-monitor
```

### Step 3: Set environment variables
```bash
# Add to /opt/deep-agg/.env
HTTP_PROXY=http://127.0.0.1:40000
HTTPS_PROXY=http://127.0.0.1:40000
NO_PROXY=localhost,127.0.0.1,0.0.0.0

# Source in PM2 ecosystem
pm2 restart ecosystem.config.cjs
```

### Step 4: Verify
```bash
# Check WARP status
warp-cli --accept-tos status

# Test proxy via curl
curl -x http://127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace/

# Check logs
journalctl -u warp-tunnel -f
journalctl -u warp-monitor -f
```

### Troubleshooting

If WARP disconnects:
```bash
sudo systemctl restart warp-tunnel warp-monitor
```

If proxy still fails:
```bash
sudo warp-cli --accept-tos disconnect
sudo warp-cli --accept-tos connect
sudo systemctl restart deep-aggregator
```