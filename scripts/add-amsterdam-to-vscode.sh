#!/bin/bash
# add-amsterdam-to-vscode.sh — Добавить Amsterdam VPS в VS Code Remote-SSH
# Запускай НА МАКБУКЕ в терминале

set -e

echo "🔧 Добавляю Amsterdam VPS в VS Code SSH config..."
echo ""

# Путь к SSH config
SSH_CONFIG="$HOME/.ssh/config"
VPS_IP="5.129.228.88"
VPS_USER="root"

# Проверяем существует ли файл
if [ ! -f "$SSH_CONFIG" ]; then
    echo "📝 Создаю $SSH_CONFIG..."
    mkdir -p ~/.ssh
    touch "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"
fi

# Проверяем есть ли уже amsterdam
if grep -q "Host amsterdam" "$SSH_CONFIG" 2>/dev/null; then
    echo "⚠️  Amsterdam уже есть в $SSH_CONFIG"
    echo ""
    echo "Текущая конфигурация:"
    grep -A 8 "Host amsterdam" "$SSH_CONFIG"
    echo ""
    read -p "Обновить конфигурацию? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Отменено"
        exit 0
    fi
    # Удаляем старую конфигурацию
    sed -i.backup '/^Host amsterdam/,/^$/d' "$SSH_CONFIG"
    echo "🗑️  Старая конфигурация удалена"
fi

# Добавляем конфигурацию
echo "✍️  Добавляю конфигурацию..."
cat >> "$SSH_CONFIG" <<'EOF'

# Deep Components Aggregator — Amsterdam VPS
# Добавлено: $(date)
Host amsterdam
    HostName 5.129.228.88
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ForwardAgent yes
    Compression yes
    StrictHostKeyChecking accept-new

# Алиасы для удобства
Host deep-agg
    HostName 5.129.228.88
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ForwardAgent yes
    Compression yes
    StrictHostKeyChecking accept-new

Host amsterdam-vscode
    HostName 5.129.228.88
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ForwardAgent yes
    Compression yes
    StrictHostKeyChecking accept-new

EOF

chmod 600 "$SSH_CONFIG"

echo "✅ SSH config обновлён!"
echo ""
echo "📋 Добавлены хосты:"
echo "   - amsterdam"
echo "   - deep-agg"
echo "   - amsterdam-vscode"
echo ""

# Проверяем SSH ключ
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "⚠️  SSH ключ не найден!"
    echo ""
    read -p "Создать новый SSH ключ? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -C "macbook-$(whoami)"
        echo "✅ SSH ключ создан: ~/.ssh/id_rsa"
        echo ""
        echo "📤 Скопируй публичный ключ на сервер:"
        echo ""
        echo "cat ~/.ssh/id_rsa.pub | pbcopy"
        echo "ssh root@5.129.228.88"
        echo 'mkdir -p ~/.ssh && nano ~/.ssh/authorized_keys  # Вставь ключ (⌘V)'
        echo "chmod 600 ~/.ssh/authorized_keys && exit"
        echo ""
    fi
fi

# Тестируем подключение
echo "🧪 Проверяю SSH подключение..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 amsterdam "echo 'SSH OK'" 2>/dev/null; then
    echo "✅ SSH подключение работает!"
else
    echo "❌ SSH подключение не работает"
    echo ""
    echo "Возможные причины:"
    echo "1. SSH ключ не добавлен на сервер"
    echo "2. Ключ находится в другом файле (не ~/.ssh/id_rsa)"
    echo ""
    echo "📤 Добавь ключ на сервер:"
    echo ""
    echo "# Вариант 1: Через ssh-copy-id"
    echo "ssh-copy-id root@5.129.228.88"
    echo ""
    echo "# Вариант 2: Вручную"
    echo "cat ~/.ssh/id_rsa.pub | pbcopy"
    echo "ssh root@5.129.228.88"
    echo 'mkdir -p ~/.ssh && nano ~/.ssh/authorized_keys  # Вставь ключ (⌘V)'
    echo ""
    exit 1
fi

# Проверяем VS Code
echo ""
echo "🔍 Проверяю VS Code..."
if ! command -v code &> /dev/null; then
    echo "⚠️  VS Code не найден в PATH"
    echo ""
    echo "Добавь в ~/.zshrc:"
    echo 'export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"'
    echo ""
else
    echo "✅ VS Code найден"
    
    # Проверяем Remote-SSH
    if code --list-extensions | grep -q "ms-vscode-remote.remote-ssh"; then
        echo "✅ Remote-SSH extension установлен"
    else
        echo "📦 Устанавливаю Remote-SSH extension..."
        code --install-extension ms-vscode-remote.remote-ssh
        echo "✅ Remote-SSH установлен"
    fi
fi

echo ""
echo "🎉 Всё готово!"
echo ""
echo "🚀 Подключись к серверу:"
echo ""
echo "   В терминале:"
echo "     ssh amsterdam"
echo ""
echo "   В VS Code:"
echo "     1. Нажми F1 (или ⌘⇧P)"
echo "     2. Введи: Remote-SSH: Connect to Host"
echo "     3. Выбери: amsterdam"
echo "     4. Открой папку: /opt/deep-agg"
echo ""
echo "   Или одной командой:"
echo "     code --remote ssh-remote+amsterdam /opt/deep-agg"
echo ""
