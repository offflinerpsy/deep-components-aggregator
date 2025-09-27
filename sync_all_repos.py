#!/usr/bin/env python3
# sync_all_repos.py - Синхронизация всех репозиториев
import subprocess
from datetime import datetime

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=".")
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    log("🔄 СИНХРОНИЗАЦИЯ ВСЕХ РЕПОЗИТОРИЕВ")
    
    # 1. Добавляем все изменения
    log("📝 Добавляем изменения...")
    success, output, error = run_command("git add .")
    if success:
        log("✅ Файлы добавлены")
    else:
        log(f"❌ Ошибка git add: {error}")
        return
    
    # 2. Коммитим
    commit_msg = f"fix: полная синхронизация всех репозиториев ({datetime.now().strftime('%Y-%m-%d %H:%M')})"
    success, output, error = run_command(f'git commit -m "{commit_msg}"')
    if success:
        log("✅ Изменения закоммичены")
    else:
        log(f"⚠️ Коммит: {error}")
    
    # 3. Пушим в origin (GitHub)
    log("📤 Отправляем в GitHub...")
    success, output, error = run_command("git push origin main")
    if success:
        log("✅ Изменения отправлены в GitHub")
    else:
        log(f"❌ Ошибка push в GitHub: {error}")
        return
    
    # 4. Пушим в prod (основной сервер)
    log("📤 Отправляем на prod сервер...")
    success, output, error = run_command("git push prod main")
    if success:
        log("✅ Изменения отправлены на prod")
    else:
        log(f"❌ Ошибка push на prod: {error}")
    
    # 5. Пушим в diag (диагностический сервер)
    log("📤 Отправляем на diag сервер...")
    success, output, error = run_command("git push diag main")
    if success:
        log("✅ Изменения отправлены на diag")
    else:
        log(f"❌ Ошибка push на diag: {error}")
    
    # 6. Проверяем статус
    log("🔍 Проверяем статус...")
    success, output, error = run_command("git status")
    if success:
        log("=== GIT STATUS ===")
        print(output)
    
    # 7. Проверяем remote
    success, output, error = run_command("git remote -v")
    if success:
        log("=== REMOTE REPOS ===")
        print(output)
    
    log("✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА")
    log("")
    log("🌐 ПРОВЕРЬТЕ:")
    log("   • GitHub: https://github.com/offflinerpsy/deep-components-aggregator")
    log("   • Prod: http://89.104.69.77/")
    log("   • Diag: Диагностические данные")

if __name__ == "__main__":
    main()
