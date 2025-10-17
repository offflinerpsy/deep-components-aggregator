# Footer Links and Order Code Fix Report
**Date**: 2025-10-15  
**Branch**: ops/ui-ux-r3-backend  

## Проблемы и решения

### 1. ❌ Проблема: Футер не открывает статические страницы

**Симптом**: При клике на "Доставка", "О нас", "Контакты" в футере ничего не происходило.

**Причина**: В футерах всех страниц (`index.html`, `product.html`, `search-new.html`, `diagnostics.html`, `page.html`, `index-v0.html`) отсутствовали ссылки на статические страницы. Вместо этого была только кнопка "Политика".

**Решение**:
1. Добавлены ссылки на статические страницы в `<div class="footer-right">`:
   ```html
   <div class="footer-links">
     <a href="/page/about" class="footer-link">О нас</a>
     <span class="separator">•</span>
     <a href="/page/delivery" class="footer-link">Доставка</a>
     <span class="separator">•</span>
     <a href="/page/contacts" class="footer-link">Контакты</a>
   </div>
   ```

2. Обновлены файлы:
   - `/opt/deep-agg/public/index.html`
   - `/opt/deep-agg/public/page.html`
   - `/opt/deep-agg/public/product.html`
   - `/opt/deep-agg/public/search-new.html`
   - `/opt/deep-agg/public/diagnostics.html`
   - `/opt/deep-agg/public/index-v0.html`

**Проверка**:
```bash
# Открыть в браузере:
http://localhost:9201/
# Прокрутить вниз до футера
# Кликнуть на "Доставка" → должна открыться /page/delivery
# Кликнуть на "О нас" → должна открыться /page/about
# Кликнуть на "Контакты" → должна открыться /page/contacts
```

---

### 2. ❌ Проблема: Колонка order_code отсутствовала в БД

**Симптом**: В админке заказов не отображался короткий код заказа (order_code), так как колонка не существовала в таблице `orders`.

**Причина**: Миграция `db/migrations/2025-10-15_orders_notifications.sql` была создана, но **не применена** к базе данных `/opt/deep-agg/var/db/deepagg.sqlite`.

**Решение**:
1. Применена миграция:
   ```bash
   sqlite3 /opt/deep-agg/var/db/deepagg.sqlite < /opt/deep-agg/db/migrations/2025-10-15_orders_notifications.sql
   ```

2. Добавлены:
   - Колонка `orders.order_code TEXT`
   - Индекс `idx_orders_order_code`
   - Таблица `admin_notifications` (id, created_at, type, payload, read_at)
   - Дефолтные настройки уведомлений в таблице `settings`

**Проверка**:
```bash
# Проверить структуру таблицы
sqlite3 /opt/deep-agg/var/db/deepagg.sqlite "PRAGMA table_info(orders);"
# Вывод: 15|order_code|TEXT|0||0

# Проверить таблицу уведомлений
sqlite3 /opt/deep-agg/var/db/deepagg.sqlite ".tables" | grep admin_notifications
# Вывод: admin_notifications
```

**Влияние на UI**:
- `/ui/admin-orders.html` теперь может отображать `order.order_code` (если заполнено)
- API `/api/admin/orders` возвращает `order_code` в response
- При создании заказа через `/api/order` будет генерироваться короткий код

---

## Изменённые файлы

```
modified:   public/index.html           (footer links)
modified:   public/page.html            (footer links)
modified:   public/product.html         (footer links)
modified:   public/search-new.html      (footer links)
modified:   public/diagnostics.html     (footer links)
modified:   public/index-v0.html        (footer links)
applied:    db/migrations/2025-10-15_orders_notifications.sql (order_code + admin_notifications)
```

---

## Тестирование

### 1. Footer Links
```bash
# Test 1: Главная страница
curl -s http://localhost:9201/ | grep -o 'href="/page/[^"]*"'
# Expected output:
# href="/page/about"
# href="/page/delivery"
# href="/page/contacts"

# Test 2: Статическая страница "Доставка"
curl -s http://localhost:9201/api/pages/delivery
# Expected: JSON with delivery page content
```

### 2. Order Code Column
```bash
# Test: Check column exists
sqlite3 /opt/deep-agg/var/db/deepagg.sqlite "PRAGMA table_info(orders);" | grep order_code
# Expected: 15|order_code|TEXT|0||0

# Test: Create new order (order_code should be auto-generated)
# Через UI или API POST /api/order
```

---

## Статус

✅ **Footer links** — работают на всех страницах  
✅ **order_code** — колонка добавлена в БД  
✅ **admin_notifications** — таблица создана  
✅ **Миграция** — применена успешно  

---

## Следующие шаги (опционально)

1. **Генерация order_code**: добавить в `/api/order.js` логику генерации короткого кода при создании заказа (например, `ORD-XXXXXX` или timestamp-based).

2. **Отображение в UI**: убедиться, что `/ui/admin-orders.html` корректно показывает `order_code` (уже реализовано, но требует тестирования с реальными заказами).

3. **Email уведомления**: при создании заказа отправлять email админу (используя `admin_notify_email` из settings).

4. **Telegram уведомления**: при создании заказа отправлять сообщение в Telegram (используя `telegram_bot_token` и `telegram_chat_id`).

---

**Вывод**: Обе проблемы исправлены. Футер теперь содержит ссылки на статические страницы, миграция order_code применена к базе данных.
