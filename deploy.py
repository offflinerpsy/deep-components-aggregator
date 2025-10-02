#!/usr/bin/env python3
"""
Простой скрипт для деплоя на продакшн-сервер
Использует paramiko для SSH подключения без повторных паролей
"""

import os
import sys
import subprocess
import paramiko
import tarfile
import json
from pathlib import Path

# Конфигурация
HOST = "37.60.243.19"  # default server (overridden by .secrets-for-deploy/target.json)
USER = "root"
KEY_FILE = "deploy_key"  # SSH key (overridden if password provided in target.json)
CONFIG_PATH = ".secrets-for-deploy/target.json"

def create_archive():
    """Создает архив проекта"""
    print("Creating deployment archive...")
    if os.path.exists("deploy.tgz"):
        os.remove("deploy.tgz")

    with tarfile.open("deploy.tgz", "w:gz") as tar:
        for root, dirs, files in os.walk("."):
            # Исключаем ненужные директории
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.secrets', '_diag', 'dist']]
            for file in files:
                if not file.startswith('.') and not file.endswith('.pyc'):
                    tar.add(os.path.join(root, file), arcname=os.path.join(root, file)[2:])

    print("Archive created: deploy.tgz")

def upload_files(ssh):
    """Загружает файлы на сервер"""
    print("Uploading files to server...")

    # Создаем SFTP соединение
    sftp = ssh.open_sftp()

    # Загружаем архив
    sftp.put("deploy.tgz", "/root/deploy.tgz")

    # Создаем скрипт установки
    install_script = '''#!/bin/bash
set -e
echo "=== DEPLOYMENT STARTED ==="

# Останавливаем сервис
systemctl stop deep-aggregator 2>/dev/null || true

# Создаем директории
mkdir -p /opt/deep-agg
mkdir -p /opt/deep-agg/data/cache/html
mkdir -p /opt/deep-agg/data/db/products
mkdir -p /opt/deep-agg/data/idx
mkdir -p /opt/deep-agg/data/state
mkdir -p /opt/deep-agg/data/files/pdf
mkdir -p /opt/deep-agg/loads/urls
mkdir -p /opt/deep-agg/secrets/apis

# Распаковываем архив
cd /root
tar -xzf deploy.tgz -C /opt/deep-agg/
cd /opt/deep-agg

# Создаем секреты
cat > secrets/apis/scraperapi.txt << 'EOF'
a91efbc32580c3e8ab8b06ce9b6dc509
EOF

cat > secrets/apis/scrapingbee.txt << 'EOF'
ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ
1KYSOEVR8THW8U46DCJRVN23D1BUXT7YO7AGH4GCFDLOFJV7U9UCI8S6W2DXIZ1L50IT9QN0VBZBJK0A
EOF

cat > secrets/apis/scrapingbot.txt << 'EOF'
YObdDv4IEG9tXWW5Fd614JLNZ
EOF

# Создаем тестовые URL
cat > loads/urls/test.txt << 'EOF'
https://www.chipdip.ru/product/lm317t
https://www.chipdip.ru/product/1n4148
https://www.chipdip.ru/product/ne555p
https://www.chipdip.ru/product/ldb-500l
EOF

# Устанавливаем зависимости
echo "Installing dependencies..."
npm install --production

# Обновляем курсы валют
echo "Refreshing currency rates..."
npm run rates:refresh || true

# Запускаем инжест
echo "Running data ingestion..."
npm run data:ingest:chipdip -- --limit 200 || true

# Строим индекс
echo "Building search index..."
npm run data:index:build || true

# Создаем systemd сервис
echo "Creating systemd service..."
cat > /etc/systemd/system/deep-aggregator.service << 'UNIT'
[Unit]
Description=Deep Aggregator API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/deep-agg
ExecStart=/usr/bin/node /opt/deep-agg/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT

# Настраиваем systemd
systemctl daemon-reload
systemctl enable deep-aggregator
systemctl start deep-aggregator

# Настраиваем Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/deep-agg << 'NGINX'
server {
    listen 80 default_server;
    server_name _;
    root /opt/deep-agg/public;
    index index.html;

    location /api/live/ {
        proxy_pass http://127.0.0.1:9201;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        add_header X-Accel-Buffering no always;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:9201;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/deep-agg /etc/nginx/sites-enabled/deep-agg
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "=== DEPLOYMENT COMPLETED ==="
echo "Testing endpoints..."
sleep 5
curl -s http://localhost/api/health || echo "Health check failed"
curl -s "http://localhost/api/search?q=LM317" || echo "Search failed"
# Digi-Key smoke tests
curl -s "http://localhost/api/digikey/selftest" || echo "DigiKey selftest failed"
curl -s "http://localhost/api/digikey/keyword?q=M83513/19-E01NW" || echo "DigiKey keyword failed"
'''

    # Загружаем скрипт установки
    with open("install.sh", "w") as f:
        f.write(install_script)

    sftp.put("install.sh", "/root/install.sh")
    sftp.close()

    print("Files uploaded successfully")

def run_installation(ssh):
    """Выполняет установку на сервере"""
    print("Running installation on server...")

    stdin, stdout, stderr = ssh.exec_command("chmod +x /root/install.sh && bash /root/install.sh")

    # Выводим результат в реальном времени
    for line in iter(stdout.readline, ""):
        print(line.rstrip())

    # Проверяем ошибки
    error_output = stderr.read().decode()
    if error_output:
        print("Errors:", error_output)

def check_deployment(ssh):
    """Проверяет результат деплоя"""
    print("=== FINAL CHECKS ===")

    # Проверяем health endpoint
    stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost/api/health")
    health_result = stdout.read().decode().strip()
    print(f"Health check: {health_result}")

    # Проверяем search endpoint
    stdin, stdout, stderr = ssh.exec_command('curl -s "http://localhost/api/search?q=LM317"')
    search_result = stdout.read().decode().strip()
    print(f"Search test: {search_result[:200]}...")

def main():
    """Основная функция"""
    print(f"=== DEPLOYING TO {HOST} ===")

    try:
        # Создаем архив
        create_archive()

        # Загружаем конфиг таргета, если есть
        host = HOST
        user = USER
        password = None
        key_file = KEY_FILE
        try:
            if os.path.exists(CONFIG_PATH):
                with open(CONFIG_PATH, 'r', encoding='utf-8') as cf:
                    cfg = json.load(cf)
                    host = cfg.get('host', host)
                    user = cfg.get('user', user)
                    password = cfg.get('password')
                    key_file = cfg.get('key_file', key_file)
        except Exception as e:
            print(f"Warning: failed to read {CONFIG_PATH}: {e}")

        # Подключаемся к серверу
        print(f"Connecting to {host}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        if password:
            ssh.connect(host, username=user, password=password, look_for_keys=False)
        else:
            ssh.connect(host, username=user, key_filename=key_file)

        # Загружаем файлы
        upload_files(ssh)

        # Выполняем установку
        run_installation(ssh)

        # Проверяем результат
        check_deployment(ssh)

        ssh.close()
        print("=== DEPLOYMENT COMPLETED SUCCESSFULLY ===")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
