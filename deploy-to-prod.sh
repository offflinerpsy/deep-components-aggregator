#!/bin/bash
set -euo pipefail

SERVER="89.104.69.77"
USER="root"
PASS="DCIIcWfISxT3R4hT"
TIMEOUT=120

echo "=== Deploying to production server $SERVER ==="

# Создаем временный скрипт для sshpass
cat > .deploy-with-pass.sh << 'EOF'
#!/bin/bash
set -e
SERVER=$1
USER=$2
PASS=$3
CMD=$4
echo "Executing: $CMD"
export SSHPASS="$PASS"
sshpass -e $CMD
EOF
chmod +x .deploy-with-pass.sh

# Копируем необходимые файлы на сервер
echo "=== Copying deployment script to server ==="
./.deploy-with-pass.sh "$SERVER" "$USER" "$PASS" "scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 prod-deploy.sh ${USER}@${SERVER}:/root/"

# Запускаем скрипт деплоя на сервере
echo "=== Running deployment script on server ==="
./.deploy-with-pass.sh "$SERVER" "$USER" "$PASS" "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=$TIMEOUT ${USER}@${SERVER} 'chmod +x /root/prod-deploy.sh && bash /root/prod-deploy.sh'"

# Проверяем статус сервера
echo "=== Checking deployment status ==="
./.deploy-with-pass.sh "$SERVER" "$USER" "$PASS" "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${USER}@${SERVER} 'curl -s http://localhost/api/health'"

# Очищаем временный скрипт
rm -f .deploy-with-pass.sh

echo "=== Deployment completed ==="
