# Блок 5: Заказ → Админ (E2E) — Артефакты

## Попытка создания заказа через API

**Endpoint**: `POST /api/order`  
**Статус**: ❌ **401 Unauthorized**

**Причина**: Endpoint требует аутентификации (`req.user.id` проверяется в обработчике).

### Код обработчика (guard clause):
```javascript
// api/order.js:88-95
if (!req.user || !req.user.id) {
  ordersTotal.inc({ status: 'rejected' });
  logger.warn({ requestId }, 'Order creation attempt without authentication');
  
  return res.status(401).json({
    ok: false,
    error: 'not_authenticated',
    message: 'Authentication required to create orders'
  });
}
```

---

## E2E Gap: Отсутствие тестового доступа к созданию заказов

**Проблема**: Нельзя протестировать E2E поток "пользователь создаёт заказ → админ видит заказ" без полной аутентификации.

**Блокеры**:
1. Нет публичного endpoint для создания заказов без auth
2. Нет тестового пользователя/токена для smoke-тестов
3. OAuth провайдеры (Google/Yandex) требуют реального логина

**Возможные решения**:
1. **Временный bypass для E2E**: Добавить query param `?test_mode=true` с проверкой в dev окружении
2. **Фикстура в БД**: Создать тестовый заказ напрямую INSERT в SQLite для проверки админ-просмотра
3. **Seed скрипт**: Добавить `scripts/seed-test-order.mjs` для E2E окружения

---

## Альтернативная проверка: Просмотр существующих заказов

Попытка получить список заказов через админ API (также требует auth):

**Endpoint**: `GET /api/admin/orders?limit=5`  
**Статус**: ❌ **401 Unauthorized** (как было в Блоке 4)

---

## Вывод по Блоку 5

❌ **E2E поток "Заказ → Админ" не может быть протестирован без аутентификации**:
1. `/api/order` → 401 (требует `req.user`)
2. `/api/admin/orders` → 401 (требует admin auth)

✅ **Обработчики корректно используют guard clauses** (без try/catch):
- Проверка `req.user` в начале
- Валидация тела запроса через AJV
- Явные return с ошибками

⚠️ **Gap для дальнейшей работы**:
- Добавить seed скрипт или test_mode флаг для E2E тестирования
- Или создать документацию по использованию реального test-user

---

**Артефакты сохранены**:
- `docs/_artifacts/2025-10-08/e2e/block-5-order-e2e.md` — этот отчёт
- `docs/_artifacts/2025-10-08/e2e/order-create.json` — (не создан, 401)
