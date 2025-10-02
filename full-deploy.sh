#!/bin/bash
# FULL REDEPLOY SCRIPT
set -e

echo "========================================="
echo "FULL REDEPLOY - Deep Components Aggregator"
echo "========================================="

cd /opt

echo ""
echo "Step 1: Killing all Node processes..."
killall -9 node 2>/dev/null || true
sleep 2

echo ""
echo "Step 2: Backup old version..."
rm -rf deep-agg-backup
mv deep-agg deep-agg-backup 2>/dev/null || true

echo ""
echo "Step 3: Extract new version..."
mkdir -p deep-agg
cd deep-agg
tar -xzf /tmp/deploy.tar.gz

echo ""
echo "Step 4: Create .env file..."
cat > .env << 'EOF'
MOUSER_API_KEY=b1ade04e-2dd0-4bd9-b5b4-e51f252a0687
FARNELL_API_KEY=9bbb8z5zuutmrscx72fukhvr
FARNELL_REGION=uk.farnell.com
PORT=9201
DATA_DIR=./var
EOF

echo ""
echo "Step 5: Install dependencies..."
npm install --production --no-fund --no-audit

echo ""
echo "Step 6: Create directories..."
mkdir -p var/db data logs

echo ""
echo "Step 7: Starting server..."
> logs/server.log
nohup node server.js > logs/server.log 2>&1 &
SERVER_PID=$!

sleep 5

echo ""
echo "Step 8: Verification..."
echo "Server PID: $SERVER_PID"
ps aux | grep $SERVER_PID | grep -v grep || echo "Process not found!"

echo ""
echo "Testing API..."
curl -s 'http://localhost:9201/api/health' | python3 -m json.tool

echo ""
echo "Testing search (LM317)..."
curl -s 'http://localhost:9201/api/search?q=LM317' | python3 -m json.tool | head -n 40

echo ""
echo "========================================="
echo "DEPLOYMENT COMPLETE!"
echo "========================================="
echo "Logs: tail -f /opt/deep-agg/logs/server.log"
