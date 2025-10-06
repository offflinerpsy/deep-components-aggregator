# Аудит внедрения аутентификации и кабинета пользователя (2025‑10‑02)

Дата: 2025‑10‑02
Ответственный: автоматизированный агент
Ветка: `main`

---

## Резюме
- Добавлена полноценная аутентификация (email+пароль, OAuth Google/Yandex, сессии) и личный кабинет пользователя.
- Синхронизированы статусы заказов: `pending`, `processing`, `completed`, `cancelled`.
- Обновлён сервер `server.js` (v3.2): подключены session, Passport, auth/user/admin роуты.
- UI: добавлены страницы входа и "Мои заказы", единый header/навигация, кнопки входа.
- Документация обновлена: API, SECURITY, OPERATIONS.
- Важное: в VS Code встроенный терминал с background-процессами может преждевременно завершать Node — запускайте сервер в отдельном окне CMD.

---

## Состав изменений по файлам

### Сервер
- `server.js`
  - Подключены:
    - `passport` и `configurePassport` из `config/passport.mjs`
    - `createSessionMiddleware` из `config/session.mjs`
    - Роуты: `mountAuthRoutes` (`api/auth.js`), `mountUserOrderRoutes` (`api/user.orders.js`), `mountAdminRoutes` (`api/admin.orders.js`)
    - Rate limits: `createAuthRateLimiter`, `createOrderRateLimiter` из `middleware/rateLimiter.js`
  - Добавлены middleware:
    - `express.json({ limit: '1mb' })`
    - `session` + `passport.initialize()` + `passport.session()`
  - Добавлены эндпоинты:
    - `GET /api/health`, `GET /api/metrics`
    - `POST /auth/register|login`, `POST /auth/logout`, `GET /auth/me`
    - `GET /api/user/orders`, `GET /api/user/orders/:id`
    - `POST /api/order` (требует auth)
    - `GET|PATCH /api/admin/orders[/:id]` (защищено Basic Auth через Nginx)
  - Версия: вывод `v3.2` и список доступных эндпоинтов при старте.

### Конфигурация аутентификации
- `config/passport.mjs`
  - Local strategy (email+пароль, Argon2id)
  - Google OIDC, Yandex OAuth (параметры из `.env`)
  - `serializeUser` / `deserializeUser`
- `config/session.mjs`
  - `express-session` + `connect-sqlite3`
  - Cookie: HttpOnly, SameSite=Lax, Secure в production

### Роуты
- `api/auth.js`
  - `POST /auth/register` — AJV валидация, Argon2id, авто‑логин
  - `POST /auth/login` — passport-local
  - `POST /auth/logout`
  - `GET /auth/me`
  - OAuth `GET /auth/google|yandex` + `GET /auth/.../callback`
- `api/user.orders.js`
  - `GET /api/user/orders` (пагинация, фильтры по статусу)
  - `GET /api/user/orders/:id` (404, если не ваш заказ)
- `api/order.js`
  - Требует auth, сохраняет `user_id`, добавлены `dealer_links` (вкл. OEMsTrade)
- `api/admin.orders.js`
  - `GET /api/admin/orders` — фильтры и пагинация
  - `GET /api/admin/orders/:id` — полные детали
  - `PATCH /api/admin/orders/:id` — смена статуса (AJV)

### Rate Limiting
- `middleware/rateLimiter.js`
  - `createAuthRateLimiter()` — 5 попыток/15 мин
  - `createOrderRateLimiter()` — 10/мин

### Миграции БД
- `db/migrations/2025-10-02_auth.sql`
  - Таблицы: `users`, `sessions`
  - Миграция статусов заказов (`new`→`pending`, `in_progress`→`processing`)
  - Обновлённая таблица `orders` с `user_id` (FK → `users(id)`)
  - CHECK для пользователей:
    - Локальные: `provider IS NULL AND email NOT NULL AND password_hash NOT NULL`
    - OAuth: `provider NOT NULL AND provider_id NOT NULL` (email может быть NULL)
  - Индекс: `CREATE UNIQUE INDEX idx_users_email_local ON users(email) WHERE provider IS NULL;`

### UI
- `ui/index.html` — обновлён header (Главная, Поиск, Источники, О нас), кнопки Вход/Регистрация, логика `auth-nav`.
- `ui/auth.html`, `ui/auth.css`, `ui/auth.js` — темная тема, формы логина/регистрации, OAuth кнопки, общий header.
- `ui/my-orders.html`, `ui/my-orders.js` — кабинет пользователя: таблица заказов, фильтры, пагинация, logout, общий header.

### Документация
- `docs/API.md` — добавлены/уточнены разделы auth, user, admin, статусы приведены к `pending|processing|completed|cancelled`.
- `docs/SECURITY.md` — параметры Argon2id, cookie policy, PII‑safe логирование, limits.
- `docs/OPERATIONS.md` — OAuth setup, WARP proxy, Nginx Basic Auth для `/api/admin/*`, применение миграций.

---

## Как запустить локально

1. Установить зависимости:
```bash
npm ci
```
2. Применить миграции:
```bash
sqlite3 var/db/deepagg.sqlite < db/migrations/2025-10-02_orders.sql
sqlite3 var/db/deepagg.sqlite < db/migrations/2025-10-02_auth.sql
```
3. Запустить сервер (в отдельном CMD, не во встроенном терминале VS Code):
```cmd
cd c:\Users\Makkaroshka\Documents\aggregator-v2
npm start
```
4. Проверить:
```bash
curl http://localhost:9201/api/health
```

---

## Доступ

### Пользователь
- UI:
  - `http://localhost:9201/ui/auth.html` — вход/регистрация
  - `http://localhost:9201/ui/my-orders.html` — мои заказы
- API (cookie‑сессии):
  - `GET /auth/me`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
  - `GET /api/user/orders`, `GET /api/user/orders/:id`

### Администратор
- API защищены Basic Auth на уровне Nginx:
  - `GET /api/admin/orders`
  - `GET /api/admin/orders/:id`
  - `PATCH /api/admin/orders/:id`
- Пример:
```bash
curl -u admin:password http://localhost:9201/api/admin/orders
```

---

## Известные нюансы
- Встроенный терминал VS Code может завершать Node при запуске в background — используйте отдельное CMD окно.
- OAuth (Google/Yandex) активируется после заполнения CLIENT_ID/CLIENT_SECRET в `.env` и настройки redirect URI.

---

## Следующие шаги
- [ ] Страница админ‑панели (UI) с базовыми фильтрами и таблицей.
- [ ] Отдельный логгер (pino) и ротация логов.
- [ ] Е2Е сценарии регистрации/логина/создания заказа/просмотра.
