# VS Code Settings Sync — Quick Setup

## ✅ У тебя уже включен Settings Sync!

Settings Sync автоматически синхронизирует между твоим MacBook и другими устройствами:
- ✅ Extensions (расширения)
- ✅ Settings (настройки)
- ✅ Keybindings (горячие клавиши)
- ✅ UI State (интерфейс)
- ✅ Snippets (сниппеты)

**НО**: SSH config нужно настраивать вручную (это системный файл, не в VS Code).

---

## 🚀 Что делать на MacBook

### 1️⃣ Скопируй SSH конфигурацию

После того как запушишь коммиты в GitHub:

```bash
# На MacBook
cd ~/Projects  # или где хочешь
git clone https://github.com/offflinerpsy/deep-components-aggregator.git
cd deep-components-aggregator

# Добавь SSH config для Amsterdam
cat docs/configs/ssh-config-amsterdam.txt >> ~/.ssh/config
chmod 600 ~/.ssh/config
```

---

### 2️⃣ Создай SSH ключ (если ещё не создан)

```bash
# Проверь существующий ключ
ls -la ~/.ssh/id_rsa*

# Если нет ключа, создай новый
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
# Нажми Enter 3 раза (по умолчанию, без пароля)

# Скопируй публичный ключ
cat ~/.ssh/id_rsa.pub | pbcopy
# Теперь ключ в буфере обмена (⌘V чтобы вставить)
```

---

### 3️⃣ Добавь свой публичный ключ на сервер

**Вариант A: Через пароль (первое подключение)**

```bash
# Подключись к серверу
ssh root@5.129.228.88
# Введи пароль

# Добавь свой публичный ключ
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Вставь публичный ключ из буфера (⌘V)
# Сохрани: Ctrl+O, Enter, Ctrl+X

# Установи права
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Выйди
exit

# Проверь подключение без пароля
ssh amsterdam
# Должно подключиться сразу ✅
```

**Вариант B: Через ssh-copy-id (проще)**

```bash
# Если ssh-copy-id установлен (на macOS нужен Homebrew)
brew install ssh-copy-id

# Скопируй ключ на сервер
ssh-copy-id root@5.129.228.88
# Введи пароль один раз

# Проверь
ssh amsterdam
# Должно подключиться без пароля ✅
```

---

### 4️⃣ Подключись к серверу в VS Code

1. **Открой VS Code на MacBook**

2. **Убедись что установлено расширение Remote-SSH**:
   - Extensions (⌘⇧X)
   - Найди: `Remote - SSH`
   - Если нет — Install

3. **Подключись**:
   - Нажми `F1` (или `⌘⇧P`)
   - Введи: `Remote-SSH: Connect to Host...`
   - Выбери `amsterdam` из списка
   - VS Code откроет новое окно

4. **Открой проект**:
   - File → Open Folder
   - Введи путь: `/opt/deep-agg`
   - Нажми OK

5. **Settings Sync сработает автоматически**:
   - Все твои расширения установятся на удалённом сервере
   - Настройки синхронизируются
   - Темы, шрифты, всё как на MacBook

---

## 🔄 Как работает Settings Sync

### Включение (если ещё не включен)

1. На MacBook в VS Code:
   - ⌘⇧P → `Settings Sync: Turn On`
   - Выбери что синхронизировать (Extensions, Settings, etc.)
   - Залогинься через GitHub

2. На любом другом компьютере:
   - Открой VS Code
   - ⌘⇧P → `Settings Sync: Turn On`
   - Залогинься через тот же GitHub аккаунт
   - Всё автоматически синхронизируется

### Что синхронизируется

✅ **Extensions** (расширения):
- Remote-SSH
- GitLens
- Prettier
- ESLint
- и всё остальное

✅ **Settings** (настройки):
- Шрифт, размер
- Тема оформления
- Formatter settings
- Terminal settings

✅ **Keybindings** (горячие клавиши):
- Твои кастомные keybindings.json

✅ **UI State** (интерфейс):
- Расположение панелей
- Размеры окон

❌ **НЕ синхронизируется**:
- SSH config (~/.ssh/config) — системный файл
- Git config (~/.gitconfig) — системный файл
- Workspace folders — локальные пути

---

## 📁 Структура файлов

### MacBook
```
~/.ssh/
├── id_rsa              # Твой приватный ключ (НЕ показывай никому!)
├── id_rsa.pub          # Публичный ключ (можно делиться)
└── config              # SSH конфигурация

~/Projects/deep-components-aggregator/
└── docs/
    ├── SSH-VSCODE-SYNC-GUIDE.md
    └── configs/
        └── ssh-config-amsterdam.txt
```

### Amsterdam Server
```
/root/.ssh/
├── authorized_keys     # Твой публичный ключ (с MacBook)
└── known_hosts         # Автоматически

/opt/deep-agg/          # Проект
```

---

## 🔐 Безопасность

### Рекомендации:

1. **Используй SSH ключи** (не пароли)
2. **Добавь пароль на ключ** (опционально):
   ```bash
   ssh-keygen -t ed25519 -C "macbook"
   # Введи пароль при создании
   ```

3. **SSH Agent для автологина**:
   ```bash
   # Добавь в ~/.zshrc на MacBook
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_rsa
   ```

4. **Отключи пароль на сервере** (только SSH keys):
   ```bash
   # На сервере Amsterdam
   sudo nano /etc/ssh/sshd_config
   # Измени: PasswordAuthentication no
   sudo systemctl restart sshd
   ```

---

## 🧪 Проверка

### На MacBook:

```bash
# 1. SSH подключение
ssh amsterdam "hostname && uptime"
# Output: 5739319-zw86058 ... ✅

# 2. Git clone репозитория
git clone https://github.com/offflinerpsy/deep-components-aggregator.git
cd deep-components-aggregator

# 3. VS Code Remote
code --remote ssh-remote+amsterdam /opt/deep-agg
# Или: F1 → Remote-SSH: Connect → amsterdam
```

---

## 📌 TL;DR (Quick Start)

На MacBook в терминале:

```bash
# 1. Создай SSH ключ
ssh-keygen -t rsa -b 4096
cat ~/.ssh/id_rsa.pub | pbcopy

# 2. Подключись к серверу и добавь ключ
ssh root@5.129.228.88
mkdir -p ~/.ssh && nano ~/.ssh/authorized_keys
# Вставь ключ (⌘V), сохрани (Ctrl+O, Enter, Ctrl+X)
chmod 600 ~/.ssh/authorized_keys
exit

# 3. Клонируй репозиторий
git clone https://github.com/offflinerpsy/deep-components-aggregator.git
cd deep-components-aggregator

# 4. Добавь SSH config
cat docs/configs/ssh-config-amsterdam.txt >> ~/.ssh/config

# 5. Проверь подключение
ssh amsterdam

# 6. Открой в VS Code
# F1 → Remote-SSH: Connect to Host → amsterdam
```

---

## 🔗 Ссылки

- **VS Code Remote-SSH**: https://code.visualstudio.com/docs/remote/ssh
- **Settings Sync**: https://code.visualstudio.com/docs/editor/settings-sync
- **SSH Config Guide**: https://www.ssh.com/academy/ssh/config

---

**Дата**: October 6, 2025  
**Проект**: Deep Components Aggregator  
**Сервер**: Amsterdam VPS (5.129.228.88)
