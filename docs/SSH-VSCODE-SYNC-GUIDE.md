# VS Code Settings Sync — SSH Configuration for Amsterdam VPS

## 📋 Quick Setup (MacBook → Amsterdam)

### 1️⃣ VS Code Settings Sync (уже включен у тебя)

**Что синхронизируется автоматически**:
- ✅ Extensions (установленные расширения)
- ✅ Settings (настройки VS Code)
- ✅ Keybindings (горячие клавиши)
- ✅ UI State (состояние интерфейса)
- ❌ SSH Config (НЕ синхронизируется, настраивается вручную)

**Как работает**:
- VS Code → Settings (⌘,) → Turn on Settings Sync
- Выбираешь что синхронизировать (Extensions, Settings, etc.)
- Логинишься через GitHub
- Всё синхронизируется автоматически между устройствами

---

### 2️⃣ SSH Config Setup (ручная настройка на MacBook)

**Файл**: `~/.ssh/config` на твоём MacBook

```bash
# Открой терминал на MacBook и создай/отредактируй SSH config
nano ~/.ssh/config
```

**Добавь эту конфигурацию**:

```
# Amsterdam VPS (Vultr) - Deep Components Aggregator
Host amsterdam
    HostName 5.129.228.88
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ForwardAgent yes

# Alias для VS Code Remote-SSH
Host deep-agg
    HostName 5.129.228.88
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

**Сохрани**: Ctrl+O, Enter, Ctrl+X

---

### 3️⃣ SSH Key Setup (если ключа нет)

**На MacBook**:

```bash
# 1. Проверь существующий ключ
ls -la ~/.ssh/id_rsa*

# Если ключа нет, создай новый
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
# Нажми Enter 3 раза (default location, no passphrase)

# 2. Скопируй публичный ключ
cat ~/.ssh/id_rsa.pub | pbcopy
# Теперь ключ в буфере обмена
```

**На сервере Amsterdam** (5.129.228.88):

```bash
# 1. Подключись через пароль (первый раз)
ssh root@5.129.228.88

# 2. Добавь свой публичный ключ
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Вставь скопированный публичный ключ (⌘V)
# Сохрани: Ctrl+O, Enter, Ctrl+X

# 3. Установи права
chmod 600 ~/.ssh/authorized_keys

# 4. Проверь доступ
exit
ssh amsterdam  # Должно подключиться без пароля
```

---

### 4️⃣ VS Code Remote-SSH Extension

**На MacBook**:

1. **Установи расширение** (если нет):
   - Extensions (⌘⇧X)
   - Найди: `Remote - SSH`
   - Install от Microsoft

2. **Подключись к серверу**:
   - Нажми `F1` или `⌘⇧P`
   - Введи: `Remote-SSH: Connect to Host...`
   - Выбери `amsterdam` или введи `5.129.228.88`
   - VS Code откроет новое окно и подключится

3. **Открой проект**:
   - File → Open Folder
   - Выбери: `/opt/deep-agg`

---

### 5️⃣ Автоматическая синхронизация настроек (опционально)

**Вариант A: VS Code Settings Sync** (рекомендуется)

Settings Sync уже включен у тебя, он автоматически синхронизирует:
- Установленные расширения
- Настройки редактора
- Горячие клавиши

**Вариант B: Dotfiles через GitHub** (для SSH config и других файлов)

```bash
# На MacBook
cd ~
mkdir dotfiles
cd dotfiles

# Создай символическую ссылку для SSH config
cp ~/.ssh/config ssh-config

# Инициализируй git
git init
git add ssh-config
git commit -m "Add Amsterdam SSH config"

# Создай репозиторий на GitHub: dotfiles
git remote add origin https://github.com/YOUR_USERNAME/dotfiles.git
git push -u origin main

# На другом компьютере (или после переустановки):
git clone https://github.com/YOUR_USERNAME/dotfiles.git ~/dotfiles
ln -sf ~/dotfiles/ssh-config ~/.ssh/config
```

---

### 6️⃣ Проверка подключения

**На MacBook**:

```bash
# 1. Тест SSH
ssh amsterdam "hostname && uptime"
# Output: 5739319-zw86058 ...

# 2. Тест VS Code Remote
# F1 → Remote-SSH: Connect to Host → amsterdam
# File → Open Folder → /opt/deep-agg
```

---

## 🔐 Безопасность

### Рекомендации:

1. **SSH Key с паролем** (опционально):
   ```bash
   ssh-keygen -t ed25519 -C "macbook@amsterdam"
   # Введи пароль для ключа
   ```

2. **SSH Agent для автологина**:
   ```bash
   # Добавь в ~/.zshrc или ~/.bash_profile на MacBook
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_rsa
   ```

3. **Отключить пароль на сервере** (только SSH keys):
   ```bash
   # На сервере Amsterdam
   sudo nano /etc/ssh/sshd_config
   # Измени: PasswordAuthentication no
   sudo systemctl restart sshd
   ```

---

## 📁 Файловая структура

**MacBook**:
```
~/.ssh/
├── id_rsa              # Приватный ключ
├── id_rsa.pub          # Публичный ключ
└── config              # SSH конфигурация

~/dotfiles/             # Опционально
└── ssh-config          # Копия для синхронизации
```

**Amsterdam Server**:
```
/root/.ssh/
├── authorized_keys     # Твой публичный ключ
└── known_hosts         # Автоматически
```

---

## 🚀 Quick Start (пошагово)

### На MacBook:

1. **Создай SSH key** (если нет):
   ```bash
   ssh-keygen -t rsa -b 4096
   cat ~/.ssh/id_rsa.pub | pbcopy
   ```

2. **Создай SSH config**:
   ```bash
   nano ~/.ssh/config
   # Вставь конфигурацию из этого файла
   ```

3. **Подключись к серверу первый раз**:
   ```bash
   ssh root@5.129.228.88
   # Введи пароль
   ```

4. **Добавь свой ключ на сервер**:
   ```bash
   mkdir -p ~/.ssh
   echo "ВСТАВЬ_ПУБЛИЧНЫЙ_КЛЮЧ" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   exit
   ```

5. **Проверь подключение без пароля**:
   ```bash
   ssh amsterdam
   # Должно подключиться сразу
   ```

6. **Открой в VS Code**:
   - `F1` → `Remote-SSH: Connect to Host` → `amsterdam`
   - File → Open Folder → `/opt/deep-agg`

---

## 📄 Готовый SSH Config (скопируй на MacBook)

Файл готов для копирования: `docs/configs/ssh-config-amsterdam.txt`

**Команда для установки**:
```bash
# На MacBook
cat docs/configs/ssh-config-amsterdam.txt >> ~/.ssh/config
chmod 600 ~/.ssh/config
```

---

## 🔗 Полезные ссылки

- VS Code Remote-SSH: https://code.visualstudio.com/docs/remote/ssh
- Settings Sync: https://code.visualstudio.com/docs/editor/settings-sync
- SSH Config: https://www.ssh.com/academy/ssh/config

---

**Создано**: October 6, 2025  
**Сервер**: Amsterdam VPS (5.129.228.88)  
**Проект**: Deep Components Aggregator
