# Спецификация: карточка заказа в AdminJS и регистрация через email-верификацию

Дата: 2025-10-14

## 1) Карточка заказа (AdminJS → Orders → Show)

Отображение без «служебного таймлайна»; аккуратные блоки и действия.

### Блок «Клиент»
- Имя: `customer_name`
- Контакты: из `customer_contact` (JSON: email, phone)
- Пользователь:
  - Если `user_id` заполнен → ссылка на пользователя
  - Если нет → бейдж «Гость» + кнопка «Создать пользователя из контактов»

### Блок «Товар»
- MPN: `mpn`
- Производитель: `manufacturer`
- Кол-во: `qty`
- Снапшот цен: `pricing_snapshot` (read-only, упрощённый список источников/цен)

### Блок «Ссылки на поставщиков»
- Использовать `dealer_links` (JSON[]). Для каждого: дилер, регион/валюта (если есть), кнопки «Открыть»/«Скопировать».

### Блок «Статус и комментарий»
- Статус: выпадающий список (enum):
  - `pending` — новая заявка (по умолчанию)
  - `processing` — в работе
  - `in_transit` — в пути
  - `completed` — выполнен
  - `canceled` — отменён
- Комментарий к статусу (текст): поле `status_comment` (новое). При изменении статуса админ может ввести комментарий.
- Чекбокс «Отправить клиенту по email» (если email есть в `customer_contact.email`). При включении отправляется письмо с новым статусом и комментариями.

Примечание: таймлайн в UI не показываем. Для аудита можно вести `status_history` в БД (см. ниже), но скрыть его в интерфейсе.

### Действия (кнопки)
- «Контакт установлен» — ставит `processing`
- «Заказ в пути» — ставит `in_transit`
- «Выполнен» — ставит `completed`
- «Отменить» — ставит `canceled`
- «Написать email» — mailto на email клиента
- «Позвонить / Скопировать телефон» — быстрые действия

## 2) Модель данных (минимальные изменения)

Таблица `orders` (добавить поля):
- `user_id TEXT NULL` — ссылка на пользователя (если зарегистрирован)
- `status TEXT NOT NULL DEFAULT 'pending'` — уже есть
- `status_comment TEXT NULL` — последний комментарий к статусу
- `status_history TEXT NULL` — JSON[] с элементами `{ ts, status, comment, admin_id }` — для внутреннего аудита (UI не показываем)

Таблица `users` (добавить/уточнить):
- `email TEXT`, `name TEXT`, `password_hash TEXT`
- `email_verified INTEGER DEFAULT 0` (0/1)

Новая таблица `email_verification_tokens`:
- `id TEXT (uuid) PK`
- `user_id TEXT NOT NULL`
- `token TEXT UNIQUE NOT NULL`
- `expires_at INTEGER NOT NULL` (ms epoch)
- `used_at INTEGER NULL`

## 3) API и поведение (email-верификация)

- POST `/auth/register`
  - Вход: `{ email, password, name }`
  - Валидации: email/пароль/имя; если email занят и не верифицирован — повторно отправить письмо (rate-limit)
  - Действие: создать `users` (email_verified=0), сгенерировать токен в `email_verification_tokens`, отправить письмо через SMTP (Mailcow)
  - Выход: `202 Accepted` (без авторизации пользователя)

- GET `/auth/verify?token=...`
  - Проверка токена/срока/неиспользованности
  - Действие: пометить `email_verified=1`, проставить `used_at`, авторизовать сессию (optional) и редиректить на «успешно подтверждено»

- POST `/auth/login`
  - Только для `email_verified=1`

Почтовый сервер: Mailcow SMTP (используем `nodemailer` / SMTP). ENV:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Безопасность: STARTTLS/TLS, httpOnly-сессии.

Шаблоны писем:
- «Подтвердите email»: кнопка со ссылкой `/auth/verify?token=...`, срок действия 24 часа
- «Статус заказа обновлён»: статус + комментарий + краткие реквизиты заказа (MPN, qty)

## 4) Обновление статуса заказа (AdminJS)

- В AdminJS добавить кастомное действие «Изменить статус» с формой: { status (select), status_comment (textarea), notify_client (checkbox) }
- Backend:
  - Валидация входа, обновление `orders.status`, `orders.status_comment`
  - Аппендим запись в `status_history`
  - Если `notify_client=true` и есть email — отправляем письмо (SMTP)

## 5) UX и ограничения
- Если у заказа нет email — выключить чекбокс уведомления и подсказать «нет email»
- Если status не менялся — не добавлять запись в history
- В List скрыть полный UUID, колонки: Created, Customer, MPN, Qty, Status
- Никаких try/catch в новом коде — только guard-ветвления и явные возвраты.

## 6) Acceptance (проверка)
- Регистрация: форма → 202 → письмо приходит → по ссылке подтверждается → login успешен
- Новый заказ гостя: создаётся без user_id, с контактами; admin может связать с существующим пользователем
- Изменение статуса с комментарием: статус меняется, письмо уходит клиенту, history пополняется, UI обновляется

```json
{
  "status_values": ["pending","processing","in_transit","completed","canceled"],
  "email_verification_link_ttl_hours": 24
}
```
