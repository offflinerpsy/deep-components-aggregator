#!/usr/bin/env python3
"""
Автоматический деплой через SSH с paramiko
"""
import paramiko
import time
import sys
import os
from scp import SCPClient

SERVER = "95.217.134.12"
USERNAME = "root"
PASSWORD = "NDZzHCYzPRKWfKRd"
PORT = 22

def create_ssh_client():
    """Создание SSH клиента"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"🔌 Connecting to {SERVER}...")
        client.connect(
            hostname=SERVER,
            port=PORT,
            username=USERNAME,
            password=PASSWORD,
            timeout=10
        )
        print("✅ SSH connection established")
        return client
    except Exception as e:
        print(f"❌ SSH connection failed: {e}")
        return None

def run_command(ssh_client, command):
    """Выполнение команды на сервере"""
    try:
        print(f"📡 Running: {command[:60]}...")
        stdin, stdout, stderr = ssh_client.exec_command(command, timeout=60)
        
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        exit_code = stdout.channel.recv_exit_status()
        
        if output:
            print(f"Output: {output[:200]}...")
        if error and exit_code != 0:
            print(f"Error: {error[:200]}...")
            
        return exit_code == 0, output
    except Exception as e:
        print(f"❌ Command failed: {e}")
        return False, ""

def copy_files(ssh_client):
    """Копирование файлов проекта"""
    try:
        print("📦 Copying files...")
        with SCPClient(ssh_client.get_transport()) as scp:
            # Основные файлы
            files_to_copy = [
                "server.js",
                "package.json"
            ]
            
            for file in files_to_copy:
                if os.path.exists(file):
                    scp.put(file, f"/opt/deep-agg/{file}")
                    print(f"✅ Copied {file}")
            
            # Директории
            dirs_to_copy = ["src", "adapters", "public", "lib"]
            for dir_name in dirs_to_copy:
                if os.path.exists(dir_name):
                    scp.put(dir_name, "/opt/deep-agg/", recursive=True)
                    print(f"✅ Copied {dir_name}/")
        
        return True
    except Exception as e:
        print(f"❌ File copy failed: {e}")
        return False

def main():
    print("🚀 AUTOMATED SSH DEPLOYMENT")
    
    # Подключение к серверу
    ssh_client = create_ssh_client()
    if not ssh_client:
        print("❌ Cannot establish SSH connection")
        sys.exit(1)
    
    try:
        # Команды для выполнения на сервере
        commands = [
            # 1. Подготовка
            "pkill -f node || true",
            "mkdir -p /opt/deep-agg",
            "rm -rf /opt/deep-agg/*",
            
            # 2. Проверка Node.js
            "node --version || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)",
            
            # 3. Настройка nginx
            """cat > /etc/nginx/sites-available/deep-agg << 'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:9201;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF""",
            
            # 4. Активация nginx
            "ln -sf /etc/nginx/sites-available/deep-agg /etc/nginx/sites-enabled/",
            "rm -f /etc/nginx/sites-enabled/default",
            "nginx -t && systemctl reload nginx",
        ]
        
        print("\n🔧 Setting up server...")
        success_count = 0
        
        for i, cmd in enumerate(commands, 1):
            print(f"\n[{i}/{len(commands)}]")
            success, output = run_command(ssh_client, cmd)
            if success:
                success_count += 1
                print("✅ Success")
            else:
                print("⚠️ Warning (continuing...)")
        
        print(f"\n📊 Setup: {success_count}/{len(commands)} commands successful")
        
        # Копирование файлов
        if copy_files(ssh_client):
            print("✅ Files copied successfully")
            
            # Установка зависимостей и запуск
            print("\n🚀 Installing dependencies and starting server...")
            
            final_commands = [
                "cd /opt/deep-agg && npm install --production",
                "cd /opt/deep-agg && nohup node server.js > server.log 2>&1 &",
                "sleep 5",
                "ps aux | grep 'node server.js' | grep -v grep",
                "curl -s http://127.0.0.1:9201/api/search?q=LM317 | head -100"
            ]
            
            for cmd in final_commands:
                success, output = run_command(ssh_client, cmd)
                if "LM317" in output:
                    print("🎉 API is working!")
                    break
            
            print("\n🌐 Testing external access...")
            run_command(ssh_client, "curl -s http://95.217.134.12/api/search?q=LM317 | head -100")
            
        else:
            print("❌ File copy failed")
    
    finally:
        ssh_client.close()
        print("\n🔌 SSH connection closed")
    
    print("\n🎉 DEPLOYMENT COMPLETED!")
    print(f"🌐 Server URL: http://{SERVER}/")
    print(f"📊 API URL: http://{SERVER}/api/search?q=LM317")

if __name__ == "__main__":
    main()
