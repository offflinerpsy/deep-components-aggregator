#!/bin/bash
# Kill ALL node processes and restart server

echo "Checking port 9201..."
netstat -tlnp | grep :9201 || echo "Port is free"

echo ""
echo "Killing ALL node processes..."
killall -9 node 2>/dev/null || true
pkill -9 node 2>/dev/null || true

sleep 2

echo "Checking if killed..."
ps aux | grep node | grep -v grep || echo "All node processes killed"

sleep 2

echo ""
echo "Starting server..."
cd /opt/deep-agg
> logs/server.log  # Clear log file
nohup node server.js > logs/server.log 2>&1 &

sleep 5

echo ""
echo "Checking if server started..."
netstat -tlnp | grep :9201

echo ""
echo "Testing API..."
curl -s 'http://localhost:9201/api/search?q=LM317' | python3 -m json.tool | head -n 30

echo ""
echo "Server logs:"
tail -n 15 logs/server.log
