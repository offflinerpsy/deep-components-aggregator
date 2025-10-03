# 🎯 Админка и доступ к заказам

## Текущее состояние

### ✅ Backend API (работает):

**Admin endpoints** (БЕЗ авторизации!):
- `GET /api/admin/orders` - список всех заказов
- `GET /api/admin/orders/:id` - детали заказа
- `PATCH /api/admin/orders/:id` - обновление заказа (статус, pricing)

**User endpoints** (требуют авторизацию):
- `GET /api/user/orders` - мои заказы (только свои)
- `GET /api/user/orders/:id` - детали моего заказа

### ✅ Frontend (работает):

**Для пользователей**:
- **http://5.129.228.88:9201/ui/my-orders.html** - мои заказы (требует логин)

**Для админов**:
- ❌ **НЕТ отдельной админки UI!** (только API endpoints)
- ⚠️ **Admin API доступен ВСЕМ** (нет middleware проверки роли)

---

## 🔐 Как попасть

### Для обычного пользователя:

1. **Регистрация/Логин**:
   ```
   http://5.129.228.88:9201/ui/auth.html
   ```

2. **Создать заказ** (через Product Card):
   ```
   http://5.129.228.88:9201/ui/product-v2.html?id=LM317
   → Кнопка "Order Now"
   ```

3. **Посмотреть свои заказы**:
   ```
   http://5.129.228.88:9201/ui/my-orders.html
   ```

### Для админа (ПРОБЛЕМА):

**Сейчас**: Админка **НЕ реализована**!

**Что есть**:
- ✅ Admin API endpoints (`/api/admin/orders`)
- ✅ Backend логика (list, get, update orders)
- ❌ **НЕТ UI** для админа
- ❌ **НЕТ проверки роли** admin в middleware
- ❌ **НЕТ защиты** на admin endpoints (доступны всем!)

**Что ДОЛЖНО быть** (по документации):
> Protected by Nginx Basic Auth (see docs/OPERATIONS.md)

Но Nginx не настроен, поэтому `/api/admin/*` открыты публично!

---

## 🚨 Критические проблемы безопасности

### 1. Admin API без авторизации
```bash
# ЛЮБОЙ может получить все заказы:
curl http://5.129.228.88:9201/api/admin/orders

# ЛЮБОЙ может изменить статус заказа:
curl -X PATCH http://5.129.228.88:9201/api/admin/orders/xxx \
  -H 'Content-Type: application/json' \
  -d '{"status":"completed"}'
```

### 2. Нет поля `role` в таблице `users`
```sql
-- Текущая схема users:
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  provider TEXT,
  provider_id TEXT,
  created_at INTEGER NOT NULL
);

-- Нет поля "role" (admin/user)!
```

### 3. Нет admin UI
- Админы не могут управлять заказами через интерфейс
- Приходится использовать curl или Postman

---

## 🛠️ Что нужно сделать

### Вариант 1: Быстрый fix (Nginx Basic Auth)

**1. Добавить в Nginx config**:
```nginx
location /api/admin/ {
  auth_basic "Admin Area";
  auth_basic_user_file /etc/nginx/.htpasswd;
  proxy_pass http://localhost:9201;
}
```

**2. Создать admin пользователя**:
```bash
sudo htpasswd -c /etc/nginx/.htpasswd admin
# Password: admin123
```

**3. Перезапустить Nginx**:
```bash
sudo systemctl restart nginx
```

**Доступ**:
```
http://5.129.228.88/api/admin/orders
→ Popup с логином: admin / admin123
```

---

### Вариант 2: Полноценная реализация (лучше)

**1. Миграция БД - добавить `role`**:
```sql
-- db/migrations/002_add_user_roles.sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
CREATE INDEX idx_users_role ON users(role);

-- Сделать первого пользователя админом
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

**2. Middleware проверки админа**:
```javascript
// middleware/requireAdmin.js
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
  }
  
  next();
}
```

**3. Применить middleware**:
```javascript
// server.js
import { requireAdmin } from './middleware/requireAdmin.js';

app.get('/api/admin/orders', requireAdmin, listOrdersHandler(db, logger));
app.patch('/api/admin/orders/:id', requireAdmin, updateOrderHandler(db, logger));
```

**4. Создать admin UI** (`ui/admin-orders.html`):
```html
<!DOCTYPE html>
<html>
<head>
  <title>Admin Panel - Orders</title>
</head>
<body>
  <h1>Order Management</h1>
  
  <table id="orders-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Customer</th>
        <th>MPN</th>
        <th>Qty</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
  
  <script>
    // Загрузить заказы
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => renderOrders(data.orders));
    
    function updateStatus(orderId, newStatus) {
      fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      .then(() => location.reload());
    }
  </script>
</body>
</html>
```

---

## 📊 Текущие данные на проде

### Тестовый заказ:
```json
{
  "id": "3d19fec5-7810-4af0-9f83-539c8bad86ad",
  "created_at": 1759472706269,
  "customer_name": "Test User",
  "mpn": "LM317",
  "manufacturer": "Texas Instruments",
  "qty": 100,
  "pricing_snapshot": {
    "base_price_rub": 1000,
    "markup_percent": 0.3,
    "markup_fixed_rub": 500,
    "final_price_rub": 1800
  },
  "status": "pending"
}
```

### Доступ к заказам:

**Пользователь**:
1. Логин: http://5.129.228.88:9201/ui/auth.html
2. Мои заказы: http://5.129.228.88:9201/ui/my-orders.html

**Админ** (временно через API):
```bash
# Список всех заказов
curl http://5.129.228.88:9201/api/admin/orders

# Обновить статус
curl -X PATCH http://5.129.228.88:9201/api/admin/orders/3d19fec5-7810-4af0-9f83-539c8bad86ad \
  -H 'Content-Type: application/json' \
  -d '{"status":"processing","notes":"Admin updated status"}'
```

---

## ✅ Быстрая проверка админки

### Способ 1: Через curl
```bash
# 1. Получить все заказы
curl http://5.129.228.88:9201/api/admin/orders | jq

# 2. Обновить заказ
curl -X PATCH http://5.129.228.88:9201/api/admin/orders/3d19fec5-7810-4af0-9f83-539c8bad86ad \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "processing",
    "pricing_snapshot": {
      "base_price_rub": 1000,
      "markup_percent": 0.35,
      "markup_fixed_rub": 500,
      "final_price_rub": 1850
    }
  }'

# 3. Проверить изменения
curl http://5.129.228.88:9201/api/admin/orders/3d19fec5-7810-4af0-9f83-539c8bad86ad | jq
```

### Способ 2: Postman/Insomnia
```
GET http://5.129.228.88:9201/api/admin/orders
PATCH http://5.129.228.88:9201/api/admin/orders/:id
```

---

## 🎯 Рекомендации

### Немедленно (безопасность):
1. **Закрыть admin API** через Nginx Basic Auth или middleware
2. **Добавить роли** в таблицу users
3. **Применить requireAdmin** middleware

### В ближайшее время:
1. **Создать admin UI** (ui/admin-orders.html)
2. **Добавить фильтры** (по статусу, дате, MPN)
3. **Bulk actions** (массовое изменение статуса)
4. **Analytics** (статистика заказов, доход)

### Долгосрочно:
1. **RBAC** (role-based access control)
2. **Audit log** (кто и когда менял заказы)
3. **Email notifications** (при смене статуса)
4. **Export** (CSV/Excel для отчётности)

---

## 🔗 Полезные ссылки

**Production URLs**:
- Auth: http://5.129.228.88:9201/ui/auth.html
- My Orders: http://5.129.228.88:9201/ui/my-orders.html
- Product Card v2: http://5.129.228.88:9201/ui/product-v2.html?id=LM317

**API Endpoints**:
- Admin Orders: http://5.129.228.88:9201/api/admin/orders (⚠️ НЕ ЗАЩИЩЕНО!)
- User Orders: http://5.129.228.88:9201/api/user/orders (требует auth)

**Documentation**:
- Auth verification: `docs/AUTH-ORDERS-VERIFICATION.md`
- Deployment summary: `docs/DEPLOYMENT-TESTING-SUMMARY.md`
- Work session report: `docs/WORK-SESSION-DETAILED-REPORT.md`
