# 🚀 MacBook Setup — One Command

Подключение MacBook к Amsterdam VPS для разработки в VS Code.

## ⚡ Быстрый старт

### На MacBook в терминале:

```bash
curl -fsSL https://raw.githubusercontent.com/offflinerpsy/deep-components-aggregator/main/scripts/setup-macbook.sh | bash
```

**Скрипт автоматически:**
1. ✅ Проверит VS Code и Git
2. ✅ Создаст SSH ключ (если нет)
3. ✅ Скопирует ключ на сервер (спросит пароль 1 раз)
4. ✅ Настроит SSH config (`~/.ssh/config`)
5. ✅ Склонирует репозиторий в `~/Projects/deep-agg`
6. ✅ Установит Remote-SSH extension
7. ✅ Откроет VS Code с подключением к серверу

**Готово!** После этого VS Code Settings Sync синхронизирует все расширения и настройки.

---

## 📋 Что делает скрипт

### 1. Проверка зависимостей
- VS Code установлен? (`code` команда доступна)
- Git установлен? (`git` команда доступна)

### 2. SSH ключ
```bash
# Если нет ~/.ssh/id_rsa — создаст новый
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
```

### 3. Копирование ключа на сервер
```bash
# Один раз введешь пароль от VPS
ssh-copy-id root@5.129.228.88
```

### 4. SSH config
Добавит в `~/.ssh/config`:
```
Host amsterdam deep-agg amsterdam-vscode
    HostName 5.129.228.88
    User root
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ForwardAgent yes
```

### 5. Git clone
```bash
git clone https://github.com/offflinerpsy/deep-components-aggregator.git ~/Projects/deep-agg
```

### 6. Remote-SSH extension
```bash
code --install-extension ms-vscode-remote.remote-ssh
```

### 7. Подключение к серверу
```bash
code --remote ssh-remote+amsterdam /opt/deep-agg
```

---

## 🎯 Альтернатива: Ручная установка

Если не хочешь запускать скрипт:

### Шаг 1: SSH ключ
```bash
ssh-keygen -t rsa -b 4096
cat ~/.ssh/id_rsa.pub | pbcopy
```

### Шаг 2: Добавить на сервер
```bash
ssh root@5.129.228.88
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys  # Вставь ключ (⌘V)
chmod 600 ~/.ssh/authorized_keys
exit
```

### Шаг 3: SSH config
```bash
cat >> ~/.ssh/config <<'EOF'
Host amsterdam
    HostName 5.129.228.88
    User root
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
EOF
```

### Шаг 4: VS Code
```bash
code --install-extension ms-vscode-remote.remote-ssh
code --remote ssh-remote+amsterdam /opt/deep-agg
```

---

## 🔍 Проверка

После установки:

```bash
# SSH работает без пароля?
ssh amsterdam "hostname && uptime"
# Output: 5739319-zw86058 ... ✅

# VS Code подключен?
code --remote ssh-remote+amsterdam /opt/deep-agg
# Должно открыться VS Code с файлами сервера ✅
```

---

## 🐛 Troubleshooting

### VS Code не найден
```bash
# Установи VS Code: https://code.visualstudio.com/
# Затем добавь в PATH:
export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"
echo 'export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"' >> ~/.zshrc
```

### SSH ключ не работает
```bash
# Проверь права
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
chmod 700 ~/.ssh

# Проверь подключение с дебагом
ssh -v amsterdam
```

### Репозиторий не клонируется
```bash
# Клонируй вручную
git clone https://github.com/offflinerpsy/deep-components-aggregator.git ~/Projects/deep-agg
```

---

## 📦 Что будет на MacBook

```
~/
├── .ssh/
│   ├── id_rsa              # SSH приватный ключ
│   ├── id_rsa.pub          # SSH публичный ключ
│   └── config              # SSH конфигурация
│
└── Projects/
    └── deep-agg/           # Локальная копия репозитория
        ├── scripts/
        │   └── setup-macbook.sh
        └── docs/
            └── MACBOOK-SETUP.md (этот файл)
```

---

## 🔐 Безопасность

Скрипт:
- ✅ Создаёт SSH ключ без пароля (для удобства)
- ✅ Копирует только публичный ключ на сервер
- ✅ Устанавливает правильные права (600/700)
- ✅ Создаёт backup SSH config перед изменениями
- ✅ Не хранит пароли в истории команд

Рекомендации:
- 🔒 Добавь пароль на SSH ключ: `ssh-keygen -p -f ~/.ssh/id_rsa`
- 🔒 Используй SSH Agent: `ssh-add ~/.ssh/id_rsa`
- 🔒 Отключи пароль на сервере (только SSH keys)

---

## 🔗 Ссылки

- **Скрипт**: https://github.com/offflinerpsy/deep-components-aggregator/blob/main/scripts/setup-macbook.sh
- **VS Code Remote-SSH**: https://code.visualstudio.com/docs/remote/ssh
- **Settings Sync**: Включи в VS Code → Preferences → Settings Sync

---

**Дата**: October 6, 2025  
**Сервер**: Amsterdam VPS (5.129.228.88)  
**Проект**: Deep Components Aggregator
