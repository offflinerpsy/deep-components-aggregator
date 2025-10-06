#!/bin/bash
# setup-macbook.sh — One-click MacBook setup for Amsterdam VPS Remote Development
# Usage: curl -fsSL https://raw.githubusercontent.com/offflinerpsy/deep-components-aggregator/main/scripts/setup-macbook.sh | bash

set -e  # Exit on error

echo "🚀 Deep Aggregator — MacBook Setup Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
VPS_IP="5.129.228.88"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/id_rsa"
SSH_CONFIG="$HOME/.ssh/config"
PROJECT_DIR="$HOME/Projects/deep-agg"

# ============================================
# 1. Check Prerequisites
# ============================================

echo "📋 Checking prerequisites..."

# Check if VS Code is installed
if ! command -v code &> /dev/null; then
    echo -e "${YELLOW}⚠️  VS Code не установлен. Установи с https://code.visualstudio.com/${NC}"
    echo "После установки запусти этот скрипт снова."
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git не установлен${NC}"
    echo "Установи: brew install git"
    exit 1
fi

echo -e "${GREEN}✅ VS Code и Git установлены${NC}"

# ============================================
# 2. Generate SSH Key (if needed)
# ============================================

echo ""
echo "🔑 Checking SSH key..."

if [ -f "$SSH_KEY" ]; then
    echo -e "${GREEN}✅ SSH ключ уже существует: $SSH_KEY${NC}"
else
    echo "Создаю новый SSH ключ..."
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY" -N "" -C "macbook-$(whoami)"
    echo -e "${GREEN}✅ SSH ключ создан: $SSH_KEY${NC}"
fi

# ============================================
# 3. Copy SSH Key to VPS
# ============================================

echo ""
echo "📤 Copying SSH key to Amsterdam VPS..."
echo -e "${YELLOW}Введи пароль от VPS когда попросит (только один раз):${NC}"

if ssh-copy-id -i "$SSH_KEY.pub" "$VPS_USER@$VPS_IP" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH ключ скопирован на сервер${NC}"
else
    echo -e "${YELLOW}⚠️  ssh-copy-id не установлен, копирую вручную...${NC}"
    
    # Manual copy
    cat "$SSH_KEY.pub" | ssh "$VPS_USER@$VPS_IP" "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSH ключ скопирован вручную${NC}"
    else
        echo -e "${RED}❌ Не удалось скопировать ключ. Проверь пароль.${NC}"
        exit 1
    fi
fi

# ============================================
# 4. Test SSH Connection
# ============================================

echo ""
echo "🧪 Testing SSH connection..."

if ssh -o BatchMode=yes -o ConnectTimeout=5 "$VPS_USER@$VPS_IP" "echo 'SSH OK'" &>/dev/null; then
    echo -e "${GREEN}✅ SSH подключение работает без пароля${NC}"
else
    echo -e "${RED}❌ SSH подключение не работает${NC}"
    exit 1
fi

# ============================================
# 5. Add SSH Config
# ============================================

echo ""
echo "⚙️  Configuring SSH..."

# Backup existing config
if [ -f "$SSH_CONFIG" ]; then
    cp "$SSH_CONFIG" "$SSH_CONFIG.backup.$(date +%Y%m%d-%H%M%S)"
    echo "📦 Backup created: $SSH_CONFIG.backup.*"
fi

# Check if amsterdam config already exists
if grep -q "Host amsterdam" "$SSH_CONFIG" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  SSH config для amsterdam уже существует, пропускаю${NC}"
else
    # Add config
    cat >> "$SSH_CONFIG" <<EOF

# Deep Aggregator — Amsterdam VPS
Host amsterdam deep-agg amsterdam-vscode
    HostName $VPS_IP
    User $VPS_USER
    Port 22
    IdentityFile $SSH_KEY
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ForwardAgent yes
    Compression yes

EOF
    chmod 600 "$SSH_CONFIG"
    echo -e "${GREEN}✅ SSH config добавлен${NC}"
fi

# ============================================
# 6. Clone Repository
# ============================================

echo ""
echo "📦 Cloning repository..."

if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  Директория $PROJECT_DIR уже существует${NC}"
    read -p "Удалить и клонировать заново? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_DIR"
    else
        echo "Пропускаю клонирование"
    fi
fi

if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p "$(dirname "$PROJECT_DIR")"
    git clone https://github.com/offflinerpsy/deep-components-aggregator.git "$PROJECT_DIR"
    echo -e "${GREEN}✅ Репозиторий клонирован в $PROJECT_DIR${NC}"
else
    echo "Репозиторий уже есть в $PROJECT_DIR"
fi

# ============================================
# 7. Install VS Code Remote-SSH Extension
# ============================================

echo ""
echo "🔌 Installing VS Code Remote-SSH extension..."

if code --list-extensions | grep -q "ms-vscode-remote.remote-ssh"; then
    echo -e "${GREEN}✅ Remote-SSH уже установлен${NC}"
else
    code --install-extension ms-vscode-remote.remote-ssh
    echo -e "${GREEN}✅ Remote-SSH установлен${NC}"
fi

# ============================================
# 8. Open Remote Connection
# ============================================

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo -e "${GREEN}Теперь можешь подключиться к серверу:${NC}"
echo ""
echo "  Вариант 1 (через SSH):"
echo "    ssh amsterdam"
echo ""
echo "  Вариант 2 (VS Code Remote):"
echo "    1. Открой VS Code"
echo "    2. Нажми F1 (или ⌘⇧P)"
echo "    3. Введи: Remote-SSH: Connect to Host"
echo "    4. Выбери: amsterdam"
echo "    5. Открой папку: /opt/deep-agg"
echo ""
echo "  Вариант 3 (одной командой):"
echo "    code --remote ssh-remote+amsterdam /opt/deep-agg"
echo ""
echo -e "${YELLOW}📂 Локальная копия репозитория:${NC} $PROJECT_DIR"
echo ""

# ============================================
# 9. Auto-connect (optional)
# ============================================

read -p "Подключиться к серверу в VS Code прямо сейчас? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "Открываю VS Code с подключением к Amsterdam..."
    code --remote ssh-remote+amsterdam /opt/deep-agg
    echo -e "${GREEN}✅ VS Code открыт с подключением к серверу${NC}"
fi

echo ""
echo "✨ Всё готово!"
