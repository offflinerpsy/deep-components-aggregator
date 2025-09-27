#!/bin/bash
# ФИНАЛЬНОЕ УЖЕСТОЧЕНИЕ SSH
# Выполнить ПОСЛЕ подтверждения работы ключей

set -e

echo "=== ФИНАЛЬНОЕ УЖЕСТОЧЕНИЕ SSH ==="

# 1. Проверяем, что ключи работают
echo "[1] Проверка SSH ключей..."
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 root@89.104.69.77 "echo 'SSH ключ работает!'"

# 2. Ужесточаем SSH конфигурацию
echo "[2] Ужесточение SSH..."
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config

# 3. Перезагружаем SSH
echo "[3] Перезагрузка SSH..."
systemctl reload ssh

# 4. Проверяем конфигурацию
echo "[4] Финальная конфигурация SSH:"
grep -E "^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication)" /etc/ssh/sshd_config

echo "=== SSH УЖЕСТОЧЕН ==="
echo "Теперь доступ только по ключам!"
echo "Проверьте подключение: ssh -i ~/.ssh/id_ed25519 root@89.104.69.77"
