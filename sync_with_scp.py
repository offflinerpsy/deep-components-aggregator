#!/usr/bin/env python3
# sync_with_scp.py - Синхронизация через SCP
import paramiko
import subprocess
import os
from datetime import datetime
import tempfile
import shutil

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
    log("🔄 СИНХРОНИЗАЦИЯ ЧЕРЕЗ SCP")
    
    # 1. Локальные изменения
    log("📝 Добавляем локальные изменения...")
    success, output, error = run_local_command("git add .")
    if success:
        log("✅ Файлы добавлены")
    else:
        log(f"❌ Ошибка git add: {error}")
        return
    
    # 2. Коммит
    commit_msg = f"fix: синхронизация через SCP ({datetime.now().strftime('%Y-%m-%d %H:%M')})"
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
    
    # 4. Создаем временный архив
    log("📦 Создаем архив проекта...")
    temp_dir = tempfile.mkdtemp()
    archive_path = os.path.join(temp_dir, "project.tar.gz")
    
    try:
        success, output, error = run_local_command(f"git archive main -o {archive_path}")
        if success:
            log("✅ Архив создан")
        else:
            log(f"❌ Ошибка создания архива: {error}")
            return
        
        # 5. Подключаемся к серверу
        log("🔌 Подключаемся к серверу...")
        ssh_client = create_ssh_client()
        if not ssh_client:
            return
        
        try:
            # 6. Создаем папки на сервере
            log("📁 Создаем папки на сервере...")
            run_remote_command(ssh_client, "mkdir -p /opt/deep-agg /opt/deep-agg-diag")
            
            # 7. Копируем архив
            log("📤 Копируем файлы на сервер...")
            sftp = ssh_client.open_sftp()
            sftp.put(archive_path, "/tmp/project.tar.gz")
            sftp.close()
            
            # 8. Распаковываем архив
            log("📦 Распаковываем архив...")
            run_remote_command(ssh_client, """
cd /opt/deep-agg
tar xzf /tmp/project.tar.gz --strip-components=1
rm /tmp/project.tar.gz

cd /opt/deep-agg-diag
cp -r /opt/deep-agg/* .
""")
            
            # 9. Устанавливаем зависимости
            log("📦 Устанавливаем зависимости...")
            run_remote_command(ssh_client, """
cd /opt/deep-agg
npm install --production
""")
            
            # 10. Перезапускаем сервис
            log("🔄 Перезапускаем сервис...")
            run_remote_command(ssh_client, "systemctl restart deep-agg")
            
            # 11. Проверяем статус
            log("🔍 Проверяем статус сервера...")
            success, output, error = run_remote_command(ssh_client, "systemctl status deep-agg --no-pager -l")
            if success and "active (running)" in output:
                log("✅ Сервис работает")
            else:
                log("❌ Сервис не работает")
            
            # 12. Проверяем API
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
            
    finally:
        # Удаляем временные файлы
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    log("✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА")
    log("")
    log("🌐 ПРОВЕРЬТЕ:")
    log("   • GitHub: https://github.com/offflinerpsy/deep-components-aggregator")
    log("   • Prod: http://89.104.69.77/")
    log("   • Diag: Диагностические данные")

if __name__ == "__main__":
    main()
