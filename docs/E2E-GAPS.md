# E2E Gaps — Критичные проблемы для устранения

**Дата выявления**: 2025-10-08  
**Ветка**: `ops/e2e-admin-user-r1`  
**Приоритизация**: Высокий → Средний → Низкий

---

## 🔴 Высокий приоритет

### Gap 1: `/api/admin/products` возвращает 500 вместо 401

**Endpoint**: `HEAD /api/admin/products`  
**Ожидалось**: `401 Unauthorized` (как `/api/admin/orders` и `/api/admin/settings`)  
**Получено**: `500 Internal Server Error`

**Причина**: Unknown — требуется проверка:
1. Открыть `api/admin.products.js` и найти обработчик
2. Убедиться, что есть guard clause для проверки `req.user` **до** обращения к DB/логике
3. Проверить `logs/err.log` на наличие stack trace

**Почему критично**:
- Server error (500) означает необработанное исключение или отсутствие валидации
- Нарушает принцип «guard clause вместо try/catch» из `.github/copilot-instructions.md`
- Может вызвать проблемы в production при попытке несанкционированного доступа

**Предлагаемое решение**:
```javascript
// api/admin.products.js (пример)
export function listProducts(db, logger) {
  return (req, res) => {
    // Guard clause: проверка auth ПЕРВЫМ делом
    if (!req.user || !req.user.role || req.user.role !== 'admin') {
      logger.warn({ requestId: req.requestId }, 'Unauthorized admin products access attempt');
      return res.status(401).json({
        ok: false,
        error: 'unauthorized',
        message: 'Admin access required'
      });
    }

    // Основная логика
    try {
      const products = db.prepare('SELECT * FROM products LIMIT 100').all();
      return res.json({ ok: true, products });
    } catch (err) {
      logger.error({ err, requestId: req.requestId }, 'Failed to fetch products');
      return res.status(500).json({ ok: false, error: 'database_error' });
    }
  };
}
```

**Артефакты**:
- `docs/_artifacts/2025-10-08/e2e/admin-api-heads.txt` (вывод curl)
- `docs/_artifacts/2025-10-08/e2e/block-4-admin.md` (детальный отчёт)

**Как проверить fix**:
```bash
# Должен вернуть 401, не 500
curl -I http://localhost:9201/api/admin/products
```

---

## 🟡 Средний приоритет

### Gap 2: Отсутствие тестового доступа для E2E потока "Заказ → Админ"

**Проблема**: Невозможно протестировать E2E поток без реальной OAuth аутентификации:
1. `POST /api/order` требует `req.user.id` (guard clause на строке 88-95)
2. `GET /api/admin/orders` требует `req.user.role === 'admin'`
3. OAuth провайдеры (Google/Yandex) требуют реального логина → не подходит для smoke tests

**Почему критично**:
- Невозможность проверить критичный бизнес-поток "Пользователь создаёт заказ → Админ видит заказ"
- Smoke tests должны работать без внешних зависимостей (OAuth)
- Текущий E2E test suite не может покрыть этот сценарий

**Предлагаемые решения**:

#### Вариант A: Seed скрипт для тестовых данных
```javascript
// scripts/seed-test-order.mjs
import Database from 'better-sqlite3';

const db = new Database('./data/db/main.db');

// Создать тестового пользователя
db.prepare(`
  INSERT OR IGNORE INTO users (id, email, role)
  VALUES ('test-user-1', 'test@example.com', 'user')
`).run();

// Создать тестовый заказ
db.prepare(`
  INSERT INTO orders (id, user_id, items, status, created_at)
  VALUES (
    'test-order-1',
    'test-user-1',
    '[{"mpn":"LM358","qty":10}]',
    'pending',
    datetime('now')
  )
`).run();

console.log('✅ Test order seeded: test-order-1');
```

**Использование**:
```bash
node scripts/seed-test-order.mjs
curl http://localhost:9201/api/admin/orders?limit=10 # (если добавить bypass для test user)
```

#### Вариант B: Test mode через query param (только для dev)
```javascript
// api/order.js
if (!req.user || !req.user.id) {
  // В dev режиме разрешаем test_mode
  if (process.env.NODE_ENV === 'development' && req.query.test_mode === 'true') {
    req.user = { id: 'test-user-smoke', email: 'smoke@test.local' };
    logger.info({ requestId }, 'Test mode enabled for order creation');
  } else {
    return res.status(401).json({ /* ... */ });
  }
}
```

**Артефакты**:
- `docs/_artifacts/2025-10-08/e2e/block-5-order-e2e.md`

---

## 🟢 Низкий приоритет

### Gap 3: Farnell API endpoint возвращает 596 (Mashery Service Not Found)

**Endpoint**: `https://api.farnell.com/api/v2/search`  
**Статус**: `596 Service Not Found` (Mashery Proxy ошибка)

**Причина**: Возможно, неверный endpoint используется в smoke-тесте.

**Решение**:
1. Открыть `adapters/providers/farnell.js`
2. Проверить базовый URL и метод API
3. Обновить E2E smoke test с корректным путём

**Почему низкий приоритет**:
- Не блокирует основную функциональность
- Возможно, тестовый endpoint некорректный (реальный код может работать)
- Требует доступ к Farnell API документации

**Артефакты**:
- `docs/_artifacts/2025-10-08/e2e/block-6-providers-warp.md`

---

### Gap 4: TME API блокируется Cloudflare (403 Forbidden)

**Endpoint**: `https://api.tme.eu/oauth2/token`  
**Статус**: `403 Forbidden` (Cloudflare bot protection)

**Причина**: Простые `curl` HEAD-запросы без User-Agent блокируются Cloudflare.

**Решение**:
1. Проверить работу `adapters/providers/tme.js` с реальными токенами и полным HTTP контекстом
2. Добавить User-Agent заголовок в E2E smoke tests:
   ```bash
   curl -I -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64)" https://api.tme.eu/oauth2/token
   ```

**Почему низкий приоритет**:
- Реальные API запросы из кода могут работать (используют undici с заголовками)
- Smoke test проверяет только сетевую доступность, не реальное API взаимодействие

**Артефакты**:
- `docs/_artifacts/2025-10-08/e2e/block-6-providers-warp.md`

---

## Приоритизация работ

### Порядок устранения:
1. 🔴 **Fix `/api/admin/products` 500 error** (1-2 часа) — критично для production
2. 🟡 **Seed скрипт для тестовых заказов** (2-3 часа) — разблокирует E2E тесты
3. 🟢 **Farnell endpoint** (1 час) — уточнить в коде и обновить smoke test
4. 🟢 **TME Cloudflare** (30 мин) — добавить User-Agent в curl

### Ожидаемый результат после fix:
- ✅ Все admin API endpoints возвращают 401 (не 500)
- ✅ E2E поток "Заказ → Админ" проверяется через seed данные
- ✅ Smoke tests работают без внешних OAuth зависимостей
- ✅ Провайдеры 4/4 доступны через WARP

---

## Команды для проверки после fix

```bash
# Gap 1: Admin products должен вернуть 401
curl -I http://localhost:9201/api/admin/products

# Gap 2: Seed тестовых данных
node scripts/seed-test-order.mjs
curl http://localhost:9201/api/admin/orders?limit=1

# Gap 3: Farnell с правильным endpoint
curl -I https://api.farnell.com/correct/path/here

# Gap 4: TME с User-Agent
curl -I -H "User-Agent: Mozilla/5.0" https://api.tme.eu/oauth2/token
```

---

**Итого**: **4 gaps** выявлено, **1 критичный** (500 error), **1 средний** (E2E блокер), **2 низких** (провайдеры).
