#!/bin/bash

# scripts/setup-ssh-key.sh - настройка SSH ключа для беспарольного доступа
SERVER_IP="95.217.134.12"
KEY_PATH="$HOME/.ssh/deep_agg_key"

echo "🔑 Setting up SSH key authentication for $SERVER_IP"

# Проверяем существование ключа
if [ ! -f "$KEY_PATH" ]; then
    echo "📝 Generating SSH key..."
    ssh-keygen -t rsa -f "$KEY_PATH" -N "" -q
fi

echo "📋 Public key to add to server:"
cat "${KEY_PATH}.pub"

echo ""
echo "🚀 Copy this public key to the server manually:"
echo "1. Connect to server: ssh root@$SERVER_IP"
echo "2. Add to authorized_keys: echo 'PASTE_PUBLIC_KEY_HERE' >> ~/.ssh/authorized_keys"
echo "3. Set permissions: chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "📞 Or run this command to copy automatically (requires password):"
echo "ssh-copy-id -i ${KEY_PATH}.pub root@$SERVER_IP"
echo ""
echo "✅ After setup, test with: ssh -i $KEY_PATH root@$SERVER_IP"
