# SSH Remote Setup — История исправлений

**Дата:** 2025-10-06  
**Сервер:** amsterdam (5.129.228.88)  
**Результат:** ✅ Успешно настроен и работает

---

## 🎯 Решённые проблемы

### 1. Битый SSH ключ
**Проблема:** `Load key "id_rsa_amsterdam_fixed": error in libcrypto`  
**Причина:** Старый RSA ключ повреждён/несовместим с OpenSSH 10.0  
**Решение:**
- Создан новый ED25519 ключ: `~/.ssh/id_ed25519_amsterdam`
- Удалены все старые ключи (id_rsa_amsterdam*)
- Настроен `IdentitiesOnly yes` в SSH config

### 2. Множественные SSH подключения
**Проблема:** VS Code создавал 4+ SSH процесса, все зависали  
**Причина:** Неправильные настройки VS Code  
**Решение:**
- Отключено `remote.SSH.remoteServerListenOnSocket`
- Отключено `remote.SSH.enableDynamicForwarding`
- Отключено `remote.SSH.lockfilesInTmp`
- Удалено `remote.SSH.serverPickPortsFromRange`

### 3. SSH timeout / disconnect
**Проблема:** Соединение обрывалось через 20-60 секунд  
**Причина:** Отсутствие keepalive настроек  
**Решение:**
- **Клиент:** ServerAliveInterval 30, ServerAliveCountMax 4
- **Сервер:** ClientAliveInterval 60, ClientAliveCountMax 3
- **Таймаут до разрыва:** 180 секунд

### 4. Сервер перегружен (100% CPU)
**Проблема:** `/bin/warp-svc` (Cloudflare WARP) загружал CPU на 93.4%  
**Причина:** Процесс зацикл
ился  
**Решение:**
- Остановлено: `systemctl stop warp-svc`
- Отключено из автозагрузки: `systemctl disable warp-svc`
- Load average: 6.34 → 1.01

### 5. Недостаточно ресурсов
**Проблема:** 1 CPU + 1 GB RAM — критически мало  
**Причина:** VS Code Server + приложения требуют больше  
**Решение:** Апгрейд до 4 CPU + 4.8 GB RAM

---

## 📋 Финальная конфигурация

### SSH Ключ
```
~/.ssh/id_ed25519_amsterdam (единственный)
Тип: ED25519
Пароль: нет
```

### SSH Config (~/.ssh/config)
```ssh
Host amsterdam
    HostName 5.129.228.88
    User root
    IdentityFile ~/.ssh/id_ed25519_amsterdam
    Port 22
    
    # KEEP-ALIVE
    ServerAliveInterval 30
    ServerAliveCountMax 4
    TCPKeepAlive yes
    
    # СТАБИЛЬНОСТЬ
    ConnectionAttempts 5
    ConnectTimeout 30
    IdentitiesOnly yes
    PubkeyAuthentication yes
    PasswordAuthentication yes
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
```

### VS Code Settings (settings.json)
```json
{
  "remote.SSH.useLocalServer": false,
  "remote.SSH.remoteServerListenOnSocket": false,
  "remote.SSH.enableDynamicForwarding": false,
  "remote.SSH.lockfilesInTmp": false,
  "remote.SSH.connectTimeout": 300,
  "remote.SSH.maxReconnectionAttempts": 50,
  "remote.SSH.showLoginTerminal": true,
  "remote.SSH.logLevel": "info",
  "remote.SSH.path": "C:\\Program Files\\Git\\usr\\bin\\ssh.exe",
  "remote.SSH.configFile": "C:\\Users\\Makkaroshka\\.ssh\\config"
}
```

### Сервер SSHD Config
```
# /etc/ssh/sshd_config.d/99-keepalive.conf
ClientAliveInterval 60
ClientAliveCountMax 3
```

### Характеристики сервера
```
CPU: 4 ядра
RAM: 4.8 GB
Диск: 15 GB
Load average: ~0.16 (отлично)
warp-svc: остановлен и отключен
```

---

## ✅ Проверка работоспособности

### SSH подключение
```bash
ssh amsterdam
```
Ожидается: подключение БЕЗ пароля, стабильно

### VS Code Remote-SSH
1. Ctrl+Shift+P
2. Remote-SSH: Connect to Host
3. amsterdam
4. Дождаться установки VS Code Server (~30-60 сек)
5. File → Open Folder → /root или /opt/deep-agg-main

Ожидается: подключение без зависаний, стабильная работа

### Проверка нагрузки
```bash
ssh amsterdam "uptime && ps aux --sort=-%cpu | head -5"
```
Ожидается: load average < 2.0, нет процессов с CPU > 50%

---

## 🔧 Рекомендации

### Добавить swap (опционально)
```bash
ssh amsterdam "sudo fallocate -l 2G /swapfile && \
  sudo chmod 600 /swapfile && \
  sudo mkswap /swapfile && \
  sudo swapon /swapfile && \
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab"
```

### Мониторинг ресурсов
```bash
# Проверить нагрузку
ssh amsterdam "htop"

# Проверить активные SSH сессии
ssh amsterdam "ss -tn state established '( dport = :22 or sport = :22 )' | wc -l"

# Проверить VS Code Server процессы
ssh amsterdam "ps aux | grep vscode-server"
```

### Отключить ненужные сервисы
```bash
ssh amsterdam "systemctl disable snapd unattended-upgrades"
```

---

## ⚠️ Известные проблемы

### Cloudflare WARP
- Отключен из-за 93% CPU
- Если нужен — перезапустить: `systemctl start warp-svc`
- При повторении 100% CPU — удалить: `apt remove cloudflare-warp -y`

### Тяжёлые команды
Избегать на этом сервере:
- `find / -name ...` (грузит диск)
- `locate` / `updatedb` (грузит CPU)
- Одновременный `apt update && apt upgrade` (грузит всё)

---

## 📊 История изменений

- **2025-10-06 13:00** — Обнаружена проблема с libcrypto ошибкой
- **2025-10-06 14:00** — Создан новый ED25519 ключ
- **2025-10-06 15:00** — Настроен keepalive клиент/сервер
- **2025-10-06 16:00** — Исправлены настройки VS Code
- **2025-10-06 16:30** — Найден и остановлен warp-svc (93% CPU)
- **2025-10-06 17:00** — Апгрейд сервера: 1→4 CPU, 1→4.8GB RAM
- **2025-10-06 17:30** — Всё работает стабильно ✅

---

**Создано:** GitHub Copilot  
**Дата:** 2025-10-06
