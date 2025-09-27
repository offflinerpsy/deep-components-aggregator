#!/usr/bin/env python3
"""
Автоматический деплой на Debian 12 сервер
"""
import paramiko
import time
import sys
import os
from scp import SCPClient

# Новые данные сервера
SERVER = "89.104.69.77"
USERNAME = "root"
PASSWORD = "DCIIcWfISxT3R4hT"
PORT = 22

def log(msg):
    print(f"🔧 {msg}")

def create_ssh_client():
    """Создание SSH клиента"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        log(f"Connecting to {SERVER}...")
        client.connect(
            hostname=SERVER,
            port=PORT,
            username=USERNAME,
            password=PASSWORD,
            timeout=15
        )
        log("✅ SSH connection established")
        return client
    except Exception as e:
        log(f"❌ SSH connection failed: {e}")
        return None

def run_command(ssh_client, command, timeout=120):
    """Выполнение команды на сервере"""
    try:
        log(f"Running: {command[:80]}...")
        stdin, stdout, stderr = ssh_client.exec_command(command, timeout=timeout)
        
        # Читаем вывод в реальном времени
        while not stdout.channel.exit_status_ready():
            if stdout.channel.recv_ready():
                output = stdout.channel.recv(1024).decode('utf-8')
                print(output, end='')
            time.sleep(0.1)
        
        # Получаем финальный статус
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

def copy_files(ssh_client):
    """Копирование файлов проекта через GitHub"""
    try:
        log("Downloading project from GitHub...")
        
        # Скачиваем проект с GitHub напрямую на сервер
        success, output = run_command(ssh_client, """
cd /tmp
rm -rf project.zip deep-components-aggregator-main
wget https://github.com/offflinerpsy/deep-components-aggregator/archive/refs/heads/main.zip -O project.zip
unzip -o project.zip
ls -la deep-components-aggregator-main/
""")
        
        if success and "server.js" in output:
            log("✅ Project files downloaded from GitHub")
            return True
        else:
            log("❌ Failed to download from GitHub")
            return False
            
    except Exception as e:
        log(f"❌ File copy failed: {e}")
        return False

def main():
    log("🚀 АВТОМАТИЧЕСКИЙ ДЕПЛОЙ НА DEBIAN 12")
    log(f"Server: {SERVER}")
    
    # Подключение к серверу
    ssh_client = create_ssh_client()
    if not ssh_client:
        log("❌ Cannot establish SSH connection")
        sys.exit(1)
    
    try:
        # Проверка системы
        log("Checking system...")
        run_command(ssh_client, "hostname && uname -a && whoami")
        
        # Обновление системы и установка базовых пакетов
        log("Installing base packages...")
        run_command(ssh_client, """
apt update && apt install -y wget unzip curl nginx git
""", 180)
        
        # Установка Node.js 20
        log("Installing Node.js 20...")
        run_command(ssh_client, """
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version
""", 180)
        
        # Копирование файлов проекта
        if copy_files(ssh_client):
            # Развертывание проекта
            log("Deploying project...")
            run_command(ssh_client, """
cd /tmp
rm -rf /opt/deep-agg
mkdir -p /opt/deep-agg
cp -r deep-components-aggregator-main/* /opt/deep-agg/
cd /opt/deep-agg
ls -la
""")
            
            # Установка зависимостей
            log("Installing dependencies...")
            run_command(ssh_client, "cd /opt/deep-agg && npm install --production", 300)
            
            # Остановка старых процессов
            log("Stopping old processes...")
            run_command(ssh_client, "pkill -f 'node server.js' || true")
            
            # Запуск сервера
            log("Starting server...")
            run_command(ssh_client, "cd /opt/deep-agg && nohup node server.js > server.log 2>&1 &")
            
            # Ожидание запуска
            time.sleep(5)
            
            # Проверка процессов
            log("Checking processes...")
            run_command(ssh_client, "ps aux | grep 'node server.js' | grep -v grep")
            
            # Тестирование API
            log("Testing API...")
            success, output = run_command(ssh_client, "curl -s http://127.0.0.1:9201/api/search?q=LM317 | head -200")
            
            if "LM317" in output:
                log("✅ API is working!")
                
                # Настройка nginx
                log("Configuring nginx...")
                run_command(ssh_client, """
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
    }
}
EOF
systemctl reload nginx
systemctl status nginx
""")
                
                # Финальное тестирование
                log("Final testing...")
                run_command(ssh_client, f"curl -s http://{SERVER}/api/search?q=LM317 | head -100")
                
                log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!")
                log(f"🌐 Server URL: http://{SERVER}/")
                log(f"📊 API URL: http://{SERVER}/api/search?q=LM317")
                
            else:
                log("❌ API test failed")
                run_command(ssh_client, "cd /opt/deep-agg && tail -20 server.log")
        
    finally:
        ssh_client.close()
        log("SSH connection closed")

if __name__ == "__main__":
    main()
