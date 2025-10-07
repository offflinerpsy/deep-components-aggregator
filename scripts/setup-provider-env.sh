# Enable environment variables for provider APIs without committing secrets to git
echo "Adding provider API keys to systemd environment"

# Check if override directory exists
if [ ! -d "/etc/systemd/system/deep-agg.service.d" ]; then
    mkdir -p /etc/systemd/system/deep-agg.service.d
fi

# Create environment override with placeholder values
cat > /etc/systemd/system/deep-agg.service.d/environment.conf << 'EOF'
[Service]
# Provider API credentials - replace placeholders with actual keys
Environment="MOUSER_API_KEY="
Environment="FARNELL_API_KEY="
Environment="FARNELL_REGION=uk.farnell.com"
Environment="TME_TOKEN="
Environment="TME_SECRET="
Environment="DIGIKEY_CLIENT_ID="
Environment="DIGIKEY_CLIENT_SECRET="
EOF

echo "Created /etc/systemd/system/deep-agg.service.d/environment.conf"
echo "Edit this file with actual API keys, then run:"
echo "  systemctl daemon-reload"
echo "  systemctl restart deep-agg"
