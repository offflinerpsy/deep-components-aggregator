#!/usr/bin/env python3
"""
Полный деплой + smoke-тесты на проде
- Деплой через SSH
- Миграции
- Запуск под PM2
- Проверка /api/health, auth, user/orders, admin/orders
"""

import os
import sys
import json
import time
import paramiko
import requests
from fnmatch import fnmatch
from pathlib import Path

# Загружаем конфигурацию
CONFIG_PATH = Path('.secrets-for-deploy/target.json')
if not CONFIG_PATH.exists():
    print("❌ .secrets-for-deploy/target.json not found")
    sys.exit(1)

with open(CONFIG_PATH) as f:
    config = json.load(f)

HOST = config['host']
USER = config['user']
PASSWORD = config['password']
REMOTE_PATH = '/opt/deep-agg'
SERVER_URL = f'http://{HOST}:9201'

print(f"\n🚀 Deploying to {HOST}")
print("=" * 50)

# Подключение SSH
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("\n📡 Connecting to server...")
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    
    # Создаём архив проекта (исключаем node_modules, .git, etc.)
    print("\n📦 Creating deployment archive...")
    import tarfile
    
    exclude_dirs = {'.git', 'node_modules', '_diag', 'dist', 'reports', 'playwright-report',
                    'var', 'logs', '.secrets', '.secrets-for-deploy', 'backend'}
    exclude_globs = {
        'deploy.tar.gz',
        '*.tar.gz',
        '*.tgz',
        '*.tar',
        '*.zip',
        '*.7z',
        '*.rar',
        'deepagg.sqlite',
        '*.sqlite',
        '*.sqlite-shm',
        '*.sqlite-wal',
        '*.log',
    }
    
    with tarfile.open('deploy.tar.gz', 'w:gz') as tar:
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
            for file in files:
                if file.startswith('.'):
                    continue

                if file.endswith('.pyc'):
                    continue

                if any(fnmatch(file, pattern) for pattern in exclude_globs):
                    continue

                path = os.path.join(root, file)
                arcname = os.path.relpath(path, '.')
                tar.add(path, arcname=arcname)
    
    print("✅ Archive created: deploy.tar.gz")
    
    # Загружаем архив
    print("\n⬆️  Uploading to server...")
    sftp = ssh.open_sftp()
    sftp.put('deploy.tar.gz', '/tmp/deploy.tar.gz')
    sftp.close()
    print("✅ Upload complete")
    
    # Разворачиваем на сервере
    print("\n🔧 Deploying on server...")
    
    commands = [
        f"mkdir -p {REMOTE_PATH}",
        f"cd {REMOTE_PATH} && tar -xzf /tmp/deploy.tar.gz",
        f"cd {REMOTE_PATH} && npm install --production --no-audit --no-fund",
        f"cd {REMOTE_PATH} && mkdir -p var/db",
        f"cd {REMOTE_PATH} && node scripts/apply_migration.mjs",
        "command -v pm2 >/dev/null 2>&1 || npm install -g pm2",
        f"pm2 delete deep-agg || true",
        f"cd {REMOTE_PATH} && PORT=9201 pm2 start server.js --name deep-agg",
        "pm2 save"
    ]
    
    for cmd in commands:
        print(f"  → {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
        exit_code = stdout.channel.recv_exit_status()
        
        if exit_code != 0 and 'pm2 delete' not in cmd:
            err = stderr.read().decode('utf-8')
            print(f"  ❌ Command failed (exit {exit_code}): {err}")
            sys.exit(1)
        else:
            out = stdout.read().decode('utf-8')
            if out.strip():
                for line in out.strip().split('\n')[:5]:  # первые 5 строк вывода
                    print(f"     {line}")
    
    print("\n✅ Deployment complete")
    
    # Ждём запуска сервера
    print("\n⏱️  Waiting for server to start...")
    time.sleep(5)
    
    # Smoke-тесты
    print("\n🧪 Running smoke tests...")
    print("=" * 50)
    
    results = {}
    
    # 1. Health check
    print("\n1️⃣ Testing /api/health...")
    try:
        r = requests.get(f"{SERVER_URL}/api/health", timeout=10)
        results['health'] = {
            'status': r.status_code,
            'ok': r.status_code == 200,
            'data': r.json() if r.status_code == 200 else None
        }
        if r.status_code == 200:
            print(f"   ✅ Health OK: {r.json()}")
        else:
            print(f"   ❌ Health failed: {r.status_code}")
    except Exception as e:
        results['health'] = {'status': 'error', 'ok': False, 'error': str(e)}
        print(f"   ❌ Health error: {e}")
    
    # 2. Search test
    print("\n2️⃣ Testing /api/search...")
    try:
        r = requests.get(f"{SERVER_URL}/api/search", params={'q': 'LM317'}, timeout=30)
        results['search'] = {
            'status': r.status_code,
            'ok': r.status_code == 200,
            'count': len(r.json().get('rows', [])) if r.status_code == 200 else 0
        }
        if r.status_code == 200:
            data = r.json()
            print(f"   ✅ Search OK: {data.get('meta', {}).get('total', 0)} results from {data.get('meta', {}).get('source', 'N/A')}")
        else:
            print(f"   ❌ Search failed: {r.status_code}")
    except Exception as e:
        results['search'] = {'status': 'error', 'ok': False, 'error': str(e)}
        print(f"   ❌ Search error: {e}")
    
    # 3. Product test
    print("\n3️⃣ Testing /api/product...")
    try:
        r = requests.get(f"{SERVER_URL}/api/product", params={'mpn': 'LM317T'}, timeout=30)
        results['product'] = {
            'status': r.status_code,
            'ok': r.status_code == 200 or r.status_code == 404,
            'found': r.status_code == 200
        }
        if r.status_code == 200:
            data = r.json()
            print(f"   ✅ Product OK: {data.get('product', {}).get('mpn', 'N/A')}")
        elif r.status_code == 404:
            print(f"   ⚠️  Product not found (expected for some MPNs)")
        else:
            print(f"   ❌ Product failed: {r.status_code}")
    except Exception as e:
        results['product'] = {'status': 'error', 'ok': False, 'error': str(e)}
        print(f"   ❌ Product error: {e}")
    
    # 4. Auth register
    print("\n4️⃣ Testing /auth/register...")
    try:
        session = requests.Session()
        payload = {
            'email': f'test_prod_{int(time.time())}@example.com',
            'password': 'testpass123',
            'confirmPassword': 'testpass123',
            'name': 'Prod Test User'
        }
        r = session.post(f"{SERVER_URL}/auth/register", json=payload, timeout=10)
        results['register'] = {
            'status': r.status_code,
            'ok': r.status_code == 201,
            'data': r.json() if r.status_code == 201 else None
        }
        if r.status_code == 201:
            print(f"   ✅ Register OK: user {r.json().get('userId', 'N/A')}")
            
            # 5. Auth /me
            print("\n5️⃣ Testing /auth/me...")
            r_me = session.get(f"{SERVER_URL}/auth/me", timeout=10)
            results['auth_me'] = {
                'status': r_me.status_code,
                'ok': r_me.status_code == 200,
                'data': r_me.json() if r_me.status_code == 200 else None
            }
            if r_me.status_code == 200:
                print(f"   ✅ Auth /me OK: {r_me.json().get('user', {}).get('email', 'N/A')}")
            else:
                print(f"   ❌ Auth /me failed: {r_me.status_code}")
            
            # 6. User orders
            print("\n6️⃣ Testing /api/user/orders...")
            r_orders = session.get(f"{SERVER_URL}/api/user/orders", timeout=10)
            results['user_orders'] = {
                'status': r_orders.status_code,
                'ok': r_orders.status_code == 200,
                'count': len(r_orders.json().get('orders', [])) if r_orders.status_code == 200 else 0
            }
            if r_orders.status_code == 200:
                print(f"   ✅ User orders OK: {results['user_orders']['count']} orders")
            else:
                print(f"   ❌ User orders failed: {r_orders.status_code}")
        else:
            print(f"   ❌ Register failed: {r.status_code} - {r.text[:200]}")
            results['auth_me'] = {'status': 'skipped', 'ok': False}
            results['user_orders'] = {'status': 'skipped', 'ok': False}
    except Exception as e:
        results['register'] = {'status': 'error', 'ok': False, 'error': str(e)}
        results['auth_me'] = {'status': 'skipped', 'ok': False}
        results['user_orders'] = {'status': 'skipped', 'ok': False}
        print(f"   ❌ Register error: {e}")
    
    # Итоги
    print("\n" + "=" * 50)
    print("📊 SMOKE TEST RESULTS")
    print("=" * 50)
    
    passed = sum(1 for r in results.values() if r.get('ok'))
    total = len(results)
    
    for test, result in results.items():
        status = "✅" if result.get('ok') else "❌"
        print(f"{status} {test}: {result.get('status', 'N/A')}")
    
    print(f"\n🎯 Total: {passed}/{total} passed")
    
    # Сохраняем результаты
    with open('prod-smoke-results.json', 'w') as f:
        json.dump({
            'timestamp': time.time(),
            'host': HOST,
            'results': results,
            'summary': {'passed': passed, 'total': total}
        }, f, indent=2)
    
    print(f"\n💾 Results saved to prod-smoke-results.json")
    
    if passed == total:
        print("\n✅ All smoke tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} tests failed")
        sys.exit(1)

except Exception as e:
    print(f"\n❌ Deployment failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    ssh.close()
