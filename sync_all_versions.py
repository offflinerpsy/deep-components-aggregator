#!/usr/bin/env python3
# sync_all_versions.py - Полная синхронизация всех версий проекта
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
    log("🔄 ПОЛНАЯ СИНХРОНИЗАЦИЯ ВСЕХ ВЕРСИЙ")

    # 1. ЛОКАЛЬНАЯ СИНХРОНИЗАЦИЯ
    log("📥 Синхронизируем локальные изменения...")

    # Проверяем статус
    success, output, error = run_local_command("git status")
    if success:
        log("✅ Git статус получен")
        print(output)
    else:
        log(f"❌ Ошибка git status: {error}")
        return

    # Добавляем все файлы
    success, output, error = run_local_command("git add .")
    if success:
        log("✅ Файлы добавлены в git")
    else:
        log(f"❌ Ошибка git add: {error}")
        return

    # Коммитим изменения
    commit_msg = f"fix: полная синхронизация всех версий ({datetime.now().strftime('%Y-%m-%d %H:%M')})"
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
        return

    # 2. УДАЛЕННАЯ СИНХРОНИЗАЦИЯ
    log("📥 Синхронизируем удаленный сервер...")

    ssh_client = create_ssh_client()
    if not ssh_client:
        return

    try:
        # Обновляем код на сервере
        success, output, error = run_remote_command(ssh_client, """
cd /opt/deep-agg
git fetch origin
git reset --hard origin/main
git clean -fd
git status
""")

        if success:
            log("✅ Код на сервере обновлен")
            print(output)
        else:
            log(f"❌ Ошибка обновления: {error}")
            return

        # Проверяем версии
        success, output, error = run_remote_command(ssh_client, "cd /opt/deep-agg && git rev-parse HEAD")
        if success:
            remote_commit = output.strip()
            log(f"✅ Удаленный коммит: {remote_commit}")

            # Проверяем локальный коммит
            success, local_commit, error = run_local_command("git rev-parse HEAD")
            if success:
                local_commit = local_commit.strip()
                log(f"✅ Локальный коммит: {local_commit}")

                if local_commit == remote_commit:
                    log("✅ Версии синхронизированы!")
                else:
                    log("❌ Версии различаются!")
            else:
                log(f"❌ Ошибка получения локального коммита: {error}")
        else:
            log(f"❌ Ошибка получения удаленного коммита: {error}")

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

        if success and "LM317T" in output:
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
