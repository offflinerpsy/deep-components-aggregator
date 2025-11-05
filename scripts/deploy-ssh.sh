#!/bin/bash

# SSH/RSYNC Deploy Script для Deep Components Aggregator
# Деплой на vh126.hoster.by через SSH

set -e

HOST="vh126.hoster.by"
USER="grandservi"
PORT="22"
REMOTE_PATH="/home/grandservi/public_html"
LOCAL_PATH="/opt/deep-agg"

echo "🚀 Starting SSH deployment to $HOST..."

# Проверка что мы в правильной директории
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run from project root."
  exit 1
fi

echo "📤 Syncing files via rsync over SSH..."

rsync -avz \
  --progress \
  --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.ftpconfig' \
  --exclude 'logs/' \
  --exclude 'temp/' \
  --exclude 'backups/' \
  --exclude 'test-results/' \
  --exclude 'playwright-report/' \
  --exclude '.vscode/' \
  --exclude '*.log' \
  --exclude 'var/db/*.db-*' \
  -e "ssh -p $PORT" \
  "$LOCAL_PATH/" \
  "$USER@$HOST:$REMOTE_PATH/"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Site: http://vh126.hoster.by"
echo ""
echo "Next steps:"
echo "1. SSH into server: ssh -p $PORT $USER@$HOST"
echo "2. Install dependencies: cd $REMOTE_PATH && npm install --production"
echo "3. Start PM2: pm2 start ecosystem.config.cjs"
echo "4. Save PM2: pm2 save"
