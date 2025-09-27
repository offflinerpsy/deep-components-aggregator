#!/bin/bash
# EMERGENCY-RECOVER-SSH+HTTP (V1) - Final Security Hardening
# Выполнять ПОСЛЕ успешного входа по SSH ключу

set -e

echo "🔒 EMERGENCY SECURITY: Hardening SSH access"
echo "==========================================="

# B7. Жёсткая фиксация безопасности
echo "🔐 Step B7: Hardening SSH security..."

# запретить логин по паролю обратно
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh || systemctl restart sshd

# убедиться, что порты открыты в UFW (и только нужные)
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 8080/tcp 2>/dev/null || true
ufw status

echo "✅ SSH security hardened!"
echo "🔑 Password authentication disabled"
echo "🌐 Only ports 22, 80, 443 are open"
echo "📋 Test SSH access to confirm it still works"
