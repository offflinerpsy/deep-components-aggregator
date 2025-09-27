#!/usr/bin/env python3
"""
Сброс и настройка сервера с нуля
"""
import subprocess
import time
import sys
import os

SERVER = "95.217.134.12"
PASSWORD = "NDZzHCYzPRKWfKRd"

def run_with_password(cmd, password, timeout=30):
    """Запуск команды с автоматическим вводом пароля"""
    try:
        # Создаем временный expect скрипт
        expect_script = f"""#!/usr/bin/expect -f
set timeout {timeout}
spawn {cmd}
expect "password:"
send "{password}\\r"
expect eof
"""

        with open('/tmp/temp_expect.exp', 'w') as f:
            f.write(expect_script)

        os.chmod('/tmp/temp_expect.exp', 0o755)

        result = subprocess.run(['/tmp/temp_expect.exp'],
                              capture_output=True, text=True, timeout=timeout)

        print(f"Command: {cmd[:60]}...")
        print(f"Exit code: {result.returncode}")
        if result.stdout:
            print(f"Output: {result.stdout[:300]}")

        return result.returncode == 0

    except Exception as e:
        print(f"Error running command: {e}")
        return False
    finally:
        # Удаляем временный файл
        try:
            os.remove('/tmp/temp_expect.exp')
        except:
            pass

def main():
    print("🔥 ПОЛНЫЙ СБРОС И НАСТРОЙКА СЕРВЕРА")
    print(f"Server: {SERVER}")

    # Команды для выполнения на сервере
    commands = [
        # 1. Остановка всех процессов
        "pkill -f node || true",
        "pkill -f npm || true",

        # 2. Очистка директории
        "rm -rf /opt/deep-agg/*",
        "mkdir -p /opt/deep-agg",

        # 3. Настройка SSH для паролей
        "sed -i 's/#PasswordAuthentication no/PasswordAuthentication yes/g' /etc/ssh/sshd_config",
        "sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/g' /etc/ssh/sshd_config",
        "systemctl restart sshd",

        # 4. Установка Node.js если нет
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",

        # 5. Проверка версий
        "node --version",
        "npm --version",

        # 6. Настройка nginx для проксирования
        """cat > /etc/nginx/sites-available/deep-agg << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:9201;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_EOF""",

        # 7. Активация конфига nginx
        "ln -sf /etc/nginx/sites-available/deep-agg /etc/nginx/sites-enabled/",
        "rm -f /etc/nginx/sites-enabled/default",
        "nginx -t && systemctl reload nginx",

        # 8. Создание systemd сервиса
        """cat > /etc/systemd/system/deep-agg.service << 'SERVICE_EOF'
[Unit]
Description=Deep Components Aggregator
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/deep-agg
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=9201

[Install]
WantedBy=multi-user.target
SERVICE_EOF""",

        # 9. Включение сервиса
        "systemctl daemon-reload",
        "systemctl enable deep-agg",
    ]

    print("\n🔧 Выполняем команды настройки...")
    success_count = 0

    for i, cmd in enumerate(commands, 1):
        print(f"\n[{i}/{len(commands)}] Executing...")
        ssh_cmd = f"ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@{SERVER} '{cmd}'"

        if run_with_password(ssh_cmd, PASSWORD, 60):
            success_count += 1
            print("✅ Success")
        else:
            print("❌ Failed")

    print(f"\n📊 Results: {success_count}/{len(commands)} commands successful")

    if success_count > len(commands) * 0.8:  # 80% успех
        print("🎉 Server setup completed successfully!")
        print("Now copying files...")
        copy_files()
    else:
        print("❌ Server setup failed")

def copy_files():
    """Копирование файлов проекта"""
    print("\n📦 Copying project files...")

    files = [
        "server.js",
        "package.json",
        "src/",
        "adapters/",
        "public/",
        "lib/"
    ]

    for file in files:
        scp_cmd = f"scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no -r {file} root@{SERVER}:/opt/deep-agg/"
        if run_with_password(scp_cmd, PASSWORD, 60):
            print(f"✅ Copied {file}")
        else:
            print(f"❌ Failed to copy {file}")

    # Запуск сервиса
    print("\n🚀 Starting service...")
    start_cmd = f"ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@{SERVER} 'cd /opt/deep-agg && npm install --production && systemctl start deep-agg'"

    if run_with_password(start_cmd, PASSWORD, 120):
        print("✅ Service started")

        # Тест
        time.sleep(5)
        test_cmd = f"ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@{SERVER} 'curl -s http://127.0.0.1:9201/api/search?q=LM317 | head -100'"
        run_with_password(test_cmd, PASSWORD, 30)
    else:
        print("❌ Failed to start service")

if __name__ == "__main__":
    main()
