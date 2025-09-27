#!/bin/bash
# ЛОКАЛЬНАЯ НАСТРОЙКА GIT ДЕПЛОЯ
# Выполнить в корне локального репозитория

set -e

echo "=== ЛОКАЛЬНАЯ НАСТРОЙКА GIT ДЕПЛОЯ ==="

# 1. Проверяем SSH ключ
echo "[1] Проверка SSH ключа..."
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "Создаем SSH ключ..."
    ssh-keygen -t ed25519 -C "deploy@deep" -f ~/.ssh/id_ed25519 -N ""
    echo "Публичный ключ для добавления на сервер:"
    cat ~/.ssh/id_ed25519.pub
    echo "Добавьте этот ключ в /root/.ssh/authorized_keys на сервере"
    exit 1
fi

echo "SSH ключ найден: ~/.ssh/id_ed25519"

# 2. Тестируем подключение
echo "[2] Тестируем SSH подключение..."
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 root@89.104.69.77 "echo OK-SSH"

# 3. Настраиваем git remote
echo "[3] Настройка git remote..."
git config core.sshCommand "ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes"
git remote remove prod 2>/dev/null || true
git remote add prod ssh://root@89.104.69.77/opt/deploy/deep-agg.git

echo "Git remote настроен:"
git remote -v

# 4. Первый деплой
echo "[4] Первый деплой..."
git push prod HEAD:main

echo "=== ЛОКАЛЬНАЯ НАСТРОЙКА ЗАВЕРШЕНА ==="
echo "Проверьте на сервере:"
echo "ssh root@89.104.69.77 'ls -la /opt/deep-agg'"
