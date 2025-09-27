#!/usr/bin/env python3
# sync_with_password.py - Синхронизация через пароль
import paramiko
import subprocess
from datetime import datetime
import os

SERVER = "89.104.69.77"
USERNAME = "root"
PASSWORD = "DCIIcWfISxT3R4hT"

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")

def run_local_command(command):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=".")
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def create_ssh_client():
    try:
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh_client.connect(SERVER, username=USERNAME, password=PASSWORD, timeout=30)
        return ssh_client
    except Exception as e:
        log(f"❌ SSH подключение не удалось: {e}")
        return None

def run_remote_command(ssh_client, command, timeout=120):
    try:
        stdin, stdout, stderr = ssh_client.exec_command(command, timeout=timeout)
        output = stdout.read().decode('utf-8', errors='ignore')
        error = stderr.read().decode('utf-8', errors='ignore')
        exit_code = stdout.channel.recv_exit_status()
        return exit_code == 0, output, error
    except Exception as e:
        log(f"❌ Команда не выполнена: {e}")
        return False, "", str(e)

def main():
    log("🔄 СИНХРОНИЗАЦИЯ ЧЕРЕЗ ПАРОЛЬ")
    
    # 1. Локальные изменения
    log("📝 Добавляем локальные изменения...")
    success, output, error = run_local_command("git add .")
    if success:
        log("✅ Файлы добавлены")
    else:
        log(f"❌ Ошибка git add: {error}")
        return
    
    # 2. Коммит
    commit_msg = f"fix: синхронизация через пароль ({datetime.now().strftime('%Y-%m-%d %H:%M')})"
    success, output, error = run_local_command(f'git commit -m "{commit_msg}"')
    if success:
        log("✅ Изменения закоммичены")
    else:
        log(f"⚠️ Коммит: {error}")
    
    # 3. Push в GitHub
    log("📤 Отправляем в GitHub...")
    success, output, error = run_local_command("git push origin main")
    if success:
        log("✅ Изменения отправлены в GitHub")
    else:
        log(f"❌ Ошибка push в GitHub: {error}")
        return
    
    # 4. Подключаемся к серверу
    log("🔌 Подключаемся к серверу...")
    ssh_client = create_ssh_client()
    if not ssh_client:
        return
    
    try:
        # 5. Создаем Git репозитории на сервере
        log("📁 Создаем Git репозитории на сервере...")
        run_remote_command(ssh_client, """
mkdir -p /srv/deep-agg.git /srv/deep-agg-diag.git
cd /srv/deep-agg.git
git init --bare
cd /srv/deep-agg-diag.git
git init --bare
""")
        
        # 6. Настраиваем post-receive хуки
        log("🔧 Настраиваем post-receive хуки...")
        
        # Для prod
        run_remote_command(ssh_client, """
cat > /srv/deep-agg.git/hooks/post-receive << 'EOF'
#!/bin/bash
TARGET="/opt/deep-agg"
GIT_DIR="/srv/deep-agg.git"
BRANCH="main"

while read oldrev newrev ref
do
    # only checking out the main (or master) branch
    if [[ $ref = refs/heads/$BRANCH ]];
    then
        echo "Ref $ref received. Deploying ${BRANCH} branch to production..."
        git --work-tree=$TARGET --git-dir=$GIT_DIR checkout -f $BRANCH
        cd $TARGET
        echo "Running post-deploy tasks..."
        npm install --production
        systemctl restart deep-agg
        echo "Deployment complete."
    fi
done
EOF

chmod +x /srv/deep-agg.git/hooks/post-receive
""")
        
        # Для diag
        run_remote_command(ssh_client, """
cat > /srv/deep-agg-diag.git/hooks/post-receive << 'EOF'
#!/bin/bash
TARGET="/opt/deep-agg-diag"
GIT_DIR="/srv/deep-agg-diag.git"
BRANCH="main"

while read oldrev newrev ref
do
    if [[ $ref = refs/heads/$BRANCH ]];
    then
        echo "Ref $ref received. Deploying ${BRANCH} branch to diagnostics..."
        git --work-tree=$TARGET --git-dir=$GIT_DIR checkout -f $BRANCH
        cd $TARGET
        echo "Saving diagnostic data..."
        mkdir -p /opt/deep-agg-diag/reports
        date > /opt/deep-agg-diag/reports/last-deploy.txt
        echo "Diagnostic deployment complete."
    fi
done
EOF

chmod +x /srv/deep-agg-diag.git/hooks/post-receive
""")
        
        # 7. Пушим в prod
        log("📤 Отправляем на prod сервер...")
        success, output, error = run_local_command(f'git push prod main')
        if success:
            log("✅ Изменения отправлены на prod")
        else:
            log(f"❌ Ошибка push на prod: {error}")
        
        # 8. Пушим в diag
        log("📤 Отправляем на diag сервер...")
        success, output, error = run_local_command(f'git push diag main')
        if success:
            log("✅ Изменения отправлены на diag")
        else:
            log(f"❌ Ошибка push на diag: {error}")
        
        # 9. Проверяем статус сервера
        log("🔍 Проверяем статус сервера...")
        success, output, error = run_remote_command(ssh_client, "systemctl status deep-agg --no-pager -l")
        if success and "active (running)" in output:
            log("✅ Сервис работает")
        else:
            log("❌ Сервис не работает")
        
        # 10. Проверяем API
        log("🧪 Проверяем API...")
        success, output, error = run_remote_command(ssh_client, "curl -s 'http://127.0.0.1:9201/api/search?q=LM317T' | head -50")
        if success and "LM317T" in output:
            log("✅ API отвечает")
        else:
            log("❌ API не отвечает")
        
    except Exception as e:
        log(f"❌ Ошибка синхронизации: {e}")
    finally:
        ssh_client.close()
    
    log("✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА")
    log("")
    log("🌐 ПРОВЕРЬТЕ:")
    log("   • GitHub: https://github.com/offflinerpsy/deep-components-aggregator")
    log("   • Prod: http://89.104.69.77/")
    log("   • Diag: Диагностические данные")

if __name__ == "__main__":
    main()
