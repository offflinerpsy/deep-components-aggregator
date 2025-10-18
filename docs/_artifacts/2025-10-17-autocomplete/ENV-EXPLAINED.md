# 🔐 ЧТО В .ENV И ЗАЧЕМ

**Дата**: 18 октября 2025

---

## 🎯 ЧТО ТАКОЕ .ENV?

Файл `.env` — это **секреты и настройки** которые НЕ должны попадать в Git.

**Формат**:
```env
ПЕРЕМЕННАЯ=значение
ДРУГАЯ_ПЕРЕМЕННАЯ=другое_значение
```

**Как работает**: Node.js загружает эти переменные в `process.env`

---

## 📋 ЧТО ВНУТРИ (на production сервере)

### 1. **Порты и окружение**
```env
PORT=9201                  # Backend (Express) слушает этот порт
NODE_ENV=production        # Режим работы (production/development)
LOG_LEVEL=info             # Уровень логирования (debug/info/warn/error)
```

**Зачем**: Настройка запуска сервера

---

### 2. **Прокси (WARP Cloudflare)**
```env
HTTP_PROXY=http://127.0.0.1:40000
HTTPS_PROXY=http://127.0.0.1:40000
NO_PROXY=127.0.0.1,localhost
```

**Зачем**: 
- Обход гео-блокировок (DigiKey, Mouser блокируют запросы из России)
- Все HTTP запросы идут через WARP туннель
- `NO_PROXY` — исключения (localhost не проксировать)

**Проверка**:
```bash
curl --proxy socks5://127.0.0.1:40000 https://ifconfig.me
# Покажет IP американского сервера
```

---

### 3. **Секреты админки (сессии, куки)**
```env
ADMIN_COOKIE_SECRET=random_32_chars_here
ADMIN_SESSION_SECRET=another_random_string
SESSION_SECRET=yet_another_secret
```

**Зачем**: 
- Шифрование сессий пользователей (чтобы админ логин не крали)
- Подписывание cookies
- **Важно**: Если утечёт — можно подделать сессию админа!

---

### 4. **SMTP (отправка писем)**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@prosnab.tech
SMTP_PASS=app_password_here
SMTP_FROM=ProSnab <noreply@prosnab.tech>
SMTP_SECURE=true
```

**Зачем**: 
- Отправка уведомлений пользователям
- Сброс пароля
- Заказы, алерты

**Без этого**: Email не работает (но сайт работает)

---

### 5. **API ключи поставщиков** (ОСНОВНОЕ)

#### **Mouser API**
```env
MOUSER_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Что даёт**: Поиск компонентов, цены, наличие со склада Mouser  
**Лимиты**: 1000 запросов/день (бесплатно)  
**Получить**: https://www.mouser.com/api-hub/  
**Без ключа**: Поиск по Mouser не работает (используется кэш)

---

#### **Farnell API**
```env
FARNELL_API_KEY=your_farnell_key
FARNELL_REGION=uk
```

**Что даёт**: Поиск по каталогу Farnell (Europe)  
**Получить**: https://partner.element14.com/docs/  
**Без ключа**: Farnell поиск отключён

---

#### **TME API**
```env
TME_TOKEN=your_token
TME_SECRET=your_secret
```

**Что даёт**: Поиск по TME (Transfer Multisort Elektronik, Польша)  
**Получить**: https://developers.tme.eu/  
**Без ключа**: TME поиск отключён

---

#### **DigiKey API** (OAuth2)
```env
DIGIKEY_CLIENT_ID=your_client_id
DIGIKEY_CLIENT_SECRET=your_secret
DIGIKEY_API_BASE=https://api.digikey.com
DIGIKEY_USER_AGENT=ProSnab/3.2
```

**Что даёт**: Поиск по DigiKey (крупнейший поставщик)  
**Лимиты**: 1000 запросов/день (бесплатно)  
**Получить**: https://developer.digikey.com/  
**Особенность**: Использует OAuth2 (токены обновляются автоматически)  
**Без ключа**: DigiKey поиск отключён

---

### 6. **GitHub CLI токен**
```env
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Зачем**: Автоматизация (создание Issues, PR через CLI)  
**Получить**: https://github.com/settings/tokens  
**Без токена**: GitHub CLI не работает (но не критично)

---

### 7. **v0.dev API ключ**
```env
V0_API_KEY=v0_xxxxxxxxxxxxxxxxxxxx
```

**Зачем**: Доступ к v0.dev API (генерация UI компонентов)  
**Без ключа**: Не можем использовать v0.dev (но сайт работает)

---

## 🚨 ЧТО ВАЖНО ПОНИМАТЬ

### **Можно работать БЕЗ API ключей?**

✅ **ДА!** Локально для разработки автодополнения:

```env
# Минимальный .env для локальной разработки
PORT=9201
NODE_ENV=development
DB_PATH=./var/db/deepagg.sqlite
LOG_LEVEL=debug
```

**Что будет работать**:
- ✅ Backend запустится
- ✅ Frontend запустится
- ✅ Автодополнение (использует локальный кэш SQLite)
- ✅ Просмотр кэшированных результатов

**Что НЕ будет работать**:
- ❌ Live поиск по провайдерам (Mouser, DigiKey, etc.)
- ❌ Обновление цен
- ❌ Отправка email
- ❌ GitHub интеграции

---

### **Как получить API ключи?**

Если хочешь **полный функционал** локально:

1. **Mouser** (самый важный):
   - Регистрация: https://www.mouser.com/api-hub/
   - Бесплатно, 1000 req/day
   - Получишь ключ сразу

2. **DigiKey**:
   - Регистрация: https://developer.digikey.com/
   - Создать приложение → получить Client ID/Secret
   - OAuth2, сложнее настроить

3. **Farnell, TME**:
   - Нужен бизнес-аккаунт
   - Запрос через support

**Рекомендация**: Для локальной разработки автодополнения **не нужны API ключи** — работаешь с кэшем.

---

## 📝 КАК СОЗДАТЬ .ENV ЛОКАЛЬНО

### Шаг 1: Скопируй шаблон

```bash
# В корне проекта
cp .env.example .env
```

### Шаг 2: Заполни минимум

```env
# .env (локальная разработка)
PORT=9201
NODE_ENV=development
DB_PATH=./var/db/deepagg.sqlite
LOG_LEVEL=debug

# Прокси (если нужен обход гео-блокировок)
# HTTP_PROXY=http://127.0.0.1:40000
# HTTPS_PROXY=http://127.0.0.1:40000
# NO_PROXY=127.0.0.1,localhost

# API ключи (опционально, для live поиска)
# MOUSER_API_KEY=твой_ключ_если_есть
# DIGIKEY_CLIENT_ID=
# DIGIKEY_CLIENT_SECRET=
```

### Шаг 3: Запусти

```bash
npm run dev
```

**Всё!** Backend запустится с этими настройками.

---

## 🔐 БЕЗОПАСНОСТЬ

### ❌ НИКОГДА НЕ ДЕЛАЙ:

1. **НЕ коммить `.env` в Git!**
   ```bash
   # .gitignore уже содержит:
   .env
   .env.local
   .env.production
   ```

2. **НЕ показывать секреты в скриншотах/логах**

3. **НЕ передавать `.env` через незащищённые каналы** (email, Telegram)

---

### ✅ ПРАВИЛЬНО:

1. **Production `.env`** → только на сервере `/opt/deep-agg/.env`

2. **Локальная разработка** → создаёшь свой `.env` из `.env.example`

3. **Секреты передавать** → через encrypted vault (1Password, BitWarden)

4. **Ротация ключей** → раз в квартал или при утечке

---

## 🎯 ВЫВОД

### Для разработки автодополнения тебе нужен МИНИМАЛЬНЫЙ .env:

```env
PORT=9201
NODE_ENV=development
DB_PATH=./var/db/deepagg.sqlite
```

**Этого достаточно!** API ключи не нужны — автодополнение работает на локальном кэше SQLite.

---

**Документация**:
- Полный список: `/opt/deep-agg/ENV-SECRETS.md`
- Шаблон: `/opt/deep-agg/.env.example`
- Переменные окружения: `/opt/deep-agg/ENV-VARS.md`

---

**Готов клонировать и запускать?** 🚀
