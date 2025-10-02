#!/bin/bash
# Deploy DigiKey OAuth exchange script to Amsterdam server and run it
# Usage: ./deploy_digikey_test.sh

SERVER="37.60.243.19"
USER="root"
CODE="ueiC69YA"

echo "🚀 Deploying DigiKey OAuth test to Amsterdam server..."
echo ""

# Upload script
scp -i deploy_key digikey_exchange_server.mjs ${USER}@${SERVER}:/root/aggregator/

echo ""
echo "✅ Script uploaded"
echo ""
echo "🔐 Running token exchange on server..."
echo ""

# Run on server
ssh -i deploy_key ${USER}@${SERVER} "cd /root/aggregator && node digikey_exchange_server.mjs ${CODE}"
