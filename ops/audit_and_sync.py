#!/usr/bin/env python3
# audit_and_sync.py - Аудит и синхронизация с правильной обработкой процессов
import subprocess
import os
from datetime import datetime

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")

def run_command(command, timeout=30):
    try:
        # Используем timeout для предотвращения зависания
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        log(f"❌ Команда зависла и была прервана: {command}")
        return False, "", "Timeout"
    except Exception as e:
        log(f"❌ Ошибка выполнения команды: {e}")
        return False, "", str(e)

def main():
    log("🔄 АУДИТ И СИНХРОНИЗАЦИЯ")

    # 1. Добавляем файл аудита
    success, output, error = run_command("git add AUDIT-2025-09-28.md")
    if not success:
        log(f"❌ Ошибка git add: {error}")
        return
    log("✅ Файл аудита добавлен")

    # 2. Проверяем статус
    success, output, error = run_command("git status")
    if success:
        log("=== GIT STATUS ===")
        print(output)

    # 3. Коммитим изменения
    success, output, error = run_command('git commit -m "docs: добавлен полный аудит изменений (2025-09-28)"')
    if not success:
        log(f"❌ Ошибка commit: {error}")
        return
    log("✅ Изменения закоммичены")

    # 4. Отправляем в GitHub
    success, output, error = run_command("git push origin main")
    if not success:
        log(f"❌ Ошибка push: {error}")
        return
    log("✅ Изменения отправлены в GitHub")

    log("✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА")

if __name__ == "__main__":
    main()
