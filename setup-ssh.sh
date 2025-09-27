#!/bin/bash

echo "🔑 Настраиваем SSH ключи для автоматического подключения..."

# Публичный ключ
PUBLIC_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDTWCxWbK73t8NlfG8qMHk0rZE23PaWz4SZcsM5qNLxlEWbhNAxZQYbH7QHeCpy4G6Mqlu4JEAC4ZwZnXFUb2BYoviQ716qvU+mDpVWwNNXoImiagqQnZNZ+rSWGrx1Jja6SdE1yVqh8R2ksHF0MN/JiQFPcdv1HF8IEqJExVrewFZTHf5B3k5yUEEpVq87zPIPOWWWuypevpY3VqcV1AQ0un+YuSUOLeioQltxJ3NDQU7QfEzb2lnwCohXfIBW9oMPmoJ7cXLwplmW8GevZYaxKKkmpB4JyVBxhqZVh8rFubf0dDEKVeQdqUeLc0TbyL1Pvtj1KPRT5EceyvZhf1q/STe4Nw/SeQMrikRy99rb41OA4/NqRNn4h2qbVnfqaak83OBqB/JfMCmELuMqU5QkvoY+53XigTfDYbseU2vz2urabV8qmyGC9hKoHDasi3i1Mz/hklijYL64wo7orzUfbO8e3Z5cZiTWfZY3vdP2lsc50OguQ6V5BRCLnmZIY0gEKSGaPQ9agU9LoOfaJdylvfQLxx8/S7I38h3kdE6sxM6R5eI80MRPeF3EwvgtiBauJazyTRXeSvutWX6GPQaJ23hv5vbLpReX2q5UjBfSZ7Zix36Rt5Wd5h6MHPBUHkeJP2QvuWFsnH82m299AIgrD93ziTOMzGF/+2kyis7o3Q== Alex@DESKTOP-P0V2V04"

echo "📋 Публичный ключ:"
echo "$PUBLIC_KEY"

echo ""
echo "🔐 Подключаемся к серверу для настройки ключа..."
echo "Введите пароль: OPYgPpOEqUSQmUqI"

# Подключаемся и настраиваем ключ
ssh root@89.104.69.77 << EOF
echo "📁 Создаем директорию .ssh если не существует..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

echo "🔑 Добавляем публичный ключ в authorized_keys..."
echo "$PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo "✅ SSH ключ настроен!"
echo "📋 Проверяем authorized_keys:"
cat ~/.ssh/authorized_keys

echo "🔧 Настраиваем права доступа..."
chown -R root:root ~/.ssh

echo "✅ Настройка завершена!"
EOF

echo ""
echo "🧪 Тестируем подключение без пароля..."
ssh -o BatchMode=yes root@89.104.69.77 "echo '🎉 SSH ключ работает! Подключение без пароля успешно!'"


