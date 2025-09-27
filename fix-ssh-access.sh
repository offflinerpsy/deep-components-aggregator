#!/bin/bash
# Временный скрипт для восстановления SSH доступа

echo "Восстанавливаем SSH доступ..."

# Откатываем PermitRootLogin
sed -i 's/^PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config

# Перезагружаем SSH
systemctl reload ssh

echo "SSH доступ восстановлен"
