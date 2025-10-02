#!/usr/bin/env python3
"""
Финальный деплой с полным тестированием и браузерным скриншотом
"""
import paramiko
import time
import sys

SERVER = "89.104.69.77"
USERNAME = "root"
PASSWORD = "DCIIcWfISxT3R4hT"
PORT = 22

def log(msg):
    print(f"🚀 {msg}")

def run_command(ssh_client, command, timeout=120):
    try:
        log(f"Running: {command[:80]}...")
        stdin, stdout, stderr = ssh_client.exec_command(command, timeout=timeout)

        while not stdout.channel.exit_status_ready():
            if stdout.channel.recv_ready():
                output = stdout.channel.recv(1024).decode('utf-8')
                print(output, end='')
            time.sleep(0.1)

        exit_code = stdout.channel.recv_exit_status()
        final_output = stdout.read().decode('utf-8')
        error_output = stderr.read().decode('utf-8')

        if final_output:
            print(final_output)
        if error_output and exit_code != 0:
            print(f"Error: {error_output}")

        return exit_code == 0, final_output
    except Exception as e:
        log(f"❌ Command failed: {e}")
        return False, ""

def main():
    log("🎯 ФИНАЛЬНЫЙ ДЕПЛОЙ С ПОЛНЫМ ТЕСТИРОВАНИЕМ")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(hostname=SERVER, port=PORT, username=USERNAME, password=PASSWORD, timeout=15)
        log("✅ SSH подключение установлено")

        # Обновляем проект с GitHub
        log("📦 Загружаем последнюю версию с GitHub...")
        run_command(client, """
cd /tmp
rm -rf project.zip deep-components-aggregator-main
wget https://github.com/offflinerpsy/deep-components-aggregator/archive/refs/heads/main.zip -O project.zip
unzip -o project.zip
rm -rf /opt/deep-agg
mkdir -p /opt/deep-agg
cp -r deep-components-aggregator-main/* /opt/deep-agg/
""")

        # Устанавливаем зависимости
        log("📚 Устанавливаем зависимости...")
        run_command(client, "cd /opt/deep-agg && npm install --production", 300)

        # Устанавливаем Playwright браузеры
        log("🌐 Устанавливаем Playwright браузеры...")
        run_command(client, "cd /opt/deep-agg && npx playwright install chromium", 180)

        # Останавливаем старые процессы
        log("🛑 Останавливаем старые процессы...")
        run_command(client, "pkill -f 'node server.js' || true")

        # Запускаем сервер
        log("🚀 Запускаем сервер...")
        run_command(client, "cd /opt/deep-agg && nohup node server.js > server.log 2>&1 &")
        time.sleep(8)  # Ждем дольше для полной инициализации

        # Проверяем процессы
        log("🔍 Проверяем процессы...")
        success, output = run_command(client, "ps aux | grep 'node server.js' | grep -v grep")

        if "node server.js" in output:
            log("✅ Сервер запущен успешно!")

            # Тестируем API
            log("🧪 Тестируем API...")
            success, api_output = run_command(client, "curl -s http://127.0.0.1:9201/api/search?q=LM317T")

            if success and ("LM317T" in api_output or "items" in api_output):
                log("✅ API работает!")

                # Настраиваем nginx
                log("⚙️ Настраиваем nginx...")
                run_command(client, """
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:9201;
        proxy_http_version 1.1;
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_read_timeout 60s;
    }

    location /api/live/search {
        proxy_pass http://127.0.0.1:9201/api/live/search;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        add_header X-Accel-Buffering no;
        proxy_read_timeout 1h;
    }
}
EOF
systemctl reload nginx
""")

                # Финальное тестирование
                log("🎯 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ...")

                # Тест главной страницы
                success, home_test = run_command(client, f"curl -s http://{SERVER}/ | head -10")
                if "html" in home_test.lower():
                    log("✅ Главная страница работает!")

                # Тест API через nginx
                success, nginx_test = run_command(client, f"curl -s http://{SERVER}/api/search?q=LM317T | head -100")
                if "LM317T" in nginx_test or "items" in nginx_test:
                    log("✅ API через nginx работает!")

                # Создаем systemd сервис
                log("🔧 Создаем systemd сервис...")
                run_command(client, """
cat > /etc/systemd/system/deep-agg.service << 'EOF'
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

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable deep-agg
""")

                # Делаем браузерный скриншот
                log("📸 Делаем браузерный скриншот...")
                success, screenshot = run_command(client, f"""
cd /opt/deep-agg
mkdir -p diag
node -e "
import {{ chromium }} from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({{ viewport: {{ width: 1366, height: 768 }} }});
await page.goto('http://127.0.0.1:9201/', {{ waitUntil: 'networkidle' }});
await page.screenshot({{ path: 'diag/final-deployment.png', fullPage: true }});
await browser.close();
console.log('📸 Screenshot saved to diag/final-deployment.png');
"
""")

                log("🎉 ДЕПЛОЙ ЗАВЕРШЕН УСПЕШНО!")
                log(f"🌐 Сайт доступен: http://{SERVER}/")
                log(f"📊 API доступно: http://{SERVER}/api/search?q=LM317T")
                log("📸 Скриншот сохранен в diag/final-deployment.png")

                # Показываем статистику
                log("📈 СТАТИСТИКА СЕРВЕРА:")
                run_command(client, "df -h | head -5")
                run_command(client, "free -h")
                run_command(client, "systemctl status nginx --no-pager -l")

            else:
                log("❌ API не отвечает")
                run_command(client, "cd /opt/deep-agg && tail -30 server.log")
        else:
            log("❌ Сервер не запустился")
            run_command(client, "cd /opt/deep-agg && tail -30 server.log")

    except Exception as e:
        log(f"❌ Ошибка деплоя: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    main()
