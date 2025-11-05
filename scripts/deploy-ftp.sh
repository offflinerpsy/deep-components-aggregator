#!/bin/bash

# FTP Deploy Script для Deep Components Aggregator
# Деплой на vh126.hoster.by

set -e

HOST="vh126.hoster.by"
USER="grandservi"
PASS='@05cIA?ijS'
REMOTE_PATH="/home/grandservi/public_html"
LOCAL_PATH="/opt/deep-agg"

echo "🚀 Starting FTP deployment to $HOST..."

# Проверка что мы в правильной директории
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run from project root."
  exit 1
fi

# Создаём список файлов для деплоя (исключаем node_modules, .git и т.д.)
echo "📦 Building file list..."

# Используем lftp для синхронизации
if ! command -v lftp &> /dev/null; then
  echo "📥 Installing lftp..."
  sudo apt-get update && sudo apt-get install -y lftp
fi

echo "📤 Uploading files via FTP..."

lftp -c "
set ftp:ssl-allow no
open -u $USER,$PASS $HOST
mirror --reverse \
  --verbose \
  --delete \
  --exclude .git/ \
  --exclude node_modules/ \
  --exclude .env \
  --exclude .ftpconfig \
  --exclude logs/ \
  --exclude temp/ \
  --exclude backups/ \
  --exclude test-results/ \
  --exclude playwright-report/ \
  --exclude .vscode/ \
  --exclude *.log \
  $LOCAL_PATH $REMOTE_PATH
bye
"

echo "✅ Deployment complete!"
echo "🌐 Site should be live at: http://vh126.hoster.by"
