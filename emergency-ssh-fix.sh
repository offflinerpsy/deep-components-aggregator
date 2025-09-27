#!/bin/bash
# ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ SSH ДОСТУПА
# Выполнить через консоль провайдера или VNC

echo "=== ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ SSH ==="

# 1. Восстанавливаем парольный доступ
echo "Восстанавливаем парольный доступ..."
sed -i 's/^PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/^PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config

# 2. Перезагружаем SSH
echo "Перезагружаем SSH..."
systemctl reload ssh

# 3. Проверяем статус
echo "Проверяем SSH статус..."
systemctl status ssh --no-pager -l

# 4. Показываем текущую конфигурацию
echo "Текущая SSH конфигурация:"
grep -E "^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication)" /etc/ssh/sshd_config

echo "=== SSH ВОССТАНОВЛЕН ==="
echo "Теперь можно подключиться по паролю: ssh root@89.104.69.77"
