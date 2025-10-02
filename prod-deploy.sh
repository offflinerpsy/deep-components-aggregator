#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

echo "Starting deployment to production server..."

# Ensure we are in the correct directory
cd /opt/deep-agg

echo "Fetching latest code from git..."
git fetch --all
git reset --hard origin/main

echo "Installing/updating npm dependencies..."
npm ci

echo "Refreshing currency rates..."
npm run rates:refresh

echo "Building search index..."
npm run data:index:build || true # Allow index build to fail if no products yet

echo "Restarting deep-aggregator service..."
systemctl restart deep-aggregator

echo "Waiting for service to start (2 seconds)..."
sleep 2

echo "Running post-deployment health checks..."
curl -fsS http://127.0.0.1:9201/api/health || { echo "Health check failed!"; exit 1; }
echo "Internal API health check passed."

curl -fsS "http://127.0.0.1:9201/api/search?q=LM317" | head -c 400 || { echo "Search API check failed!"; exit 1; }
echo "Internal Search API check passed."

curl -fsSI "http://127.0.0.1:9201/api/live/search?q=LM317" | egrep -i "text/event-stream|X-Accel-Buffering" || { echo "Live Search API check failed!"; exit 1; }
echo "Internal Live Search API check passed."

echo "Checking Nginx configuration..."
if [ -f "/etc/nginx/conf.d/deep-agg-live.conf" ]; then
  echo "Nginx configuration already exists."
else
  echo "Creating Nginx configuration..."
  cp nginx-deep-agg-live.conf /etc/nginx/conf.d/deep-agg-live.conf
  systemctl reload nginx
fi

echo "Deployment successful!"