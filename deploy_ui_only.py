#!/usr/bin/env python3
"""
Деплой ТОЛЬКО ui папки на Amsterdam сервер
"""
import paramiko
import os
import sys
from scp import SCPClient

SERVER = "5.129.228.88"
USERNAME = "root"
KEY_FILE = "deploy_key"
PORT = 22
REMOTE_PATH = "/opt/deep-agg"

def deploy_ui():
    """Загрузка ui папки на сервер"""
    print("🚀 DEPLOYING UI FOLDER TO AMSTERDAM")
    
    # Проверка что ui папка существует локально
    if not os.path.exists("ui"):
        print("❌ ui/ folder not found in current directory!")
        return False
    
    # Подключение SSH
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"🔌 Connecting to {SERVER}...")
        key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
        client.connect(
            hostname=SERVER,
            port=PORT,
            username=USERNAME,
            pkey=key,
            timeout=15
        )
        print("✅ Connected!")
        
        # Backup старой ui
        print("\n📦 Backing up old ui...")
        stdin, stdout, stderr = client.exec_command(
            f"cd {REMOTE_PATH} && [ -d ui ] && mv ui ui.backup.$(date +%s) || true"
        )
        stdout.channel.recv_exit_status()
        print("✅ Backup done")
        
        # Создание директории
        print(f"\n📁 Creating {REMOTE_PATH}/ui...")
        stdin, stdout, stderr = client.exec_command(f"mkdir -p {REMOTE_PATH}/ui")
        stdout.channel.recv_exit_status()
        
        # Копирование ui папки
        print("\n📤 Uploading ui/ folder...")
        with SCPClient(client.get_transport(), progress=lambda f, t, d: print(f"  {f.decode('utf-8')}: {d}/{t} bytes")) as scp:
            scp.put("ui", REMOTE_PATH, recursive=True)
        
        print("✅ UI folder uploaded!")
        
        # Проверка файлов
        print("\n🔍 Checking uploaded files...")
        stdin, stdout, stderr = client.exec_command(f"ls -lh {REMOTE_PATH}/ui/")
        output = stdout.read().decode('utf-8')
        print(output)
        
        # Перезапуск сервера
        print("\n🔄 Restarting Node.js server...")
        stdin, stdout, stderr = client.exec_command(
            f"cd {REMOTE_PATH} && pkill -f 'node.*server' && sleep 2 && nohup node server.js > /dev/null 2>&1 & sleep 3"
        )
        stdout.channel.recv_exit_status()
        
        # Проверка что сервер работает
        print("\n✅ Checking if server is running...")
        stdin, stdout, stderr = client.exec_command("ps aux | grep 'node.*server' | grep -v grep")
        ps_output = stdout.read().decode('utf-8')
        if ps_output:
            print(f"✅ Server is running:\n{ps_output}")
        else:
            print("⚠️ Server process not found!")
        
        # Тест curl
        print("\n🌐 Testing with curl...")
        stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:9201/ | head -50")
        html = stdout.read().decode('utf-8')
        
        if "Hi-Fi" in html or "hero" in html:
            print("🎉 NEW DESIGN DETECTED!")
        else:
            print("⚠️ Still showing old design:")
            print(html[:500])
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        client.close()
        print("\n🔌 Disconnected")

if __name__ == "__main__":
    os.chdir(r"c:\Users\Makkaroshka\Documents\aggregator-v2")
    success = deploy_ui()
    
    if success:
        print("\n🎉 DEPLOYMENT SUCCESS!")
        print(f"🌐 Check: http://{SERVER}:9201/")
        print("🔄 Try HARD REFRESH: Ctrl+F5")
    else:
        print("\n❌ DEPLOYMENT FAILED")
        sys.exit(1)
