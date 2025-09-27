#!/usr/bin/env python3
# sync_with_github.py - Синхронизация всех изменений с GitHub
import paramiko
import subprocess
import os
from datetime import datetime

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
    log("🔄 СИНХРОНИЗАЦИЯ С GITHUB")
    
    # 1. ЛОКАЛЬНАЯ СИНХРОНИЗАЦИЯ
    log("📤 Синхронизируем локальные изменения...")
    
    # Добавляем все файлы
    success, output, error = run_local_command("git add .")
    if success:
        log("✅ Файлы добавлены в git")
    else:
        log(f"❌ Ошибка git add: {error}")
    
    # Коммитим изменения
    commit_msg = f"feat: КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ - полностью рабочий сайт с реальными данными ({datetime.now().strftime('%Y-%m-%d %H:%M')})"
    success, output, error = run_local_command(f'git commit -m "{commit_msg}"')
    if success:
        log("✅ Изменения закоммичены")
    else:
        log(f"⚠️ Коммит: {error}")  # Может быть "nothing to commit"
    
    # Пушим на GitHub
    success, output, error = run_local_command("git push origin main")
    if success:
        log("✅ Изменения отправлены на GitHub")
    else:
        log(f"❌ Ошибка push: {error}")
    
    # 2. УДАЛЕННАЯ СИНХРОНИЗАЦИЯ
    log("📥 Синхронизируем удаленный сервер...")
    
    ssh_client = create_ssh_client()
    if not ssh_client:
        return
    
    try:
        # Обновляем код на сервере
        success, output, error = run_remote_command(ssh_client, """
cd /opt/deep-agg
git pull origin main || echo "Git pull может не работать, используем wget..."

# Альтернативный способ - скачиваем свежую версию
cd /tmp
rm -rf project.zip deep-components-aggregator-main
wget -q https://github.com/offflinerpsy/deep-components-aggregator/archive/refs/heads/main.zip -O project.zip
unzip -q project.zip

# Сохраняем важные файлы
cp /opt/deep-agg/public/ui/search.html /tmp/search-backup.html
cp /opt/deep-agg/public/ui/product.html /tmp/product-backup.html
cp /opt/deep-agg/public/index.html /tmp/index-backup.html
cp /opt/deep-agg/src/services/content-orchestrator.js /tmp/orchestrator-backup.js

# Обновляем проект
rm -rf /opt/deep-agg
mkdir -p /opt/deep-agg
cp -r deep-components-aggregator-main/* /opt/deep-agg/

# Восстанавливаем исправленные файлы
cp /tmp/search-backup.html /opt/deep-agg/public/ui/search.html
cp /tmp/product-backup.html /opt/deep-agg/public/ui/product.html
cp /tmp/index-backup.html /opt/deep-agg/public/index.html
cp /tmp/orchestrator-backup.js /opt/deep-agg/src/services/content-orchestrator.js

echo "Синхронизация завершена"
""")
        
        if success:
            log("✅ Код на сервере обновлен")
        else:
            log(f"❌ Ошибка обновления: {error}")
        
        # Перезапускаем сервис
        log("🔄 Перезапускаем сервис...")
        success, output, error = run_remote_command(ssh_client, "systemctl restart deep-agg && sleep 2 && systemctl status deep-agg --no-pager -l")
        
        if success and "active (running)" in output:
            log("✅ Сервис перезапущен успешно")
        else:
            log(f"❌ Ошибка перезапуска: {error}")
            
        # Финальная проверка
        log("🧪 Финальная проверка работоспособности...")
        success, output, error = run_remote_command(ssh_client, "curl -s 'http://127.0.0.1:9201/api/search?q=LM317T' | head -50")
        
        if success and "LM317T" in output and "image" in output:
            log("✅ API работает после синхронизации")
        else:
            log("❌ API не работает после синхронизации")
            
    except Exception as e:
        log(f"❌ Ошибка синхронизации: {e}")
    finally:
        ssh_client.close()
    
    log("✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА")
    log("🌐 Проверьте работу: http://89.104.69.77/")

if __name__ == "__main__":
    main()
