# TODO: ПЛАН ВНЕДРЕНИЯ ИСПРАВЛЕНИЙ

**Дата:** 17 октября 2025  
**Фаза:** I (Implementation)  
**Режим:** Tech Lead Mode — Атомарные коммиты  

---

## 🎯 ЦЕЛЬ

Исправить **5 критических UI/UX проблем** без нарушения дизайна и респонсивности.

---

## ✅ TODO LIST

### БЛОК 1: ДВОЙНАЯ ШАПКА (Priority: CRITICAL)

#### Task 1.1: Удалить header из ResultsShell
- **Файл:** `/opt/deep-agg/v0-components-aggregator-page/components/ResultsShell.tsx`
- **Действие:** Удалить строки 46-87 (весь `<header>` блок)
- **Затронутые компоненты:** `ResultsShell`
- **Риск:** Низкий (глобальный `Navigation` заменит локальный)
- **Rollback:** Git revert коммита
- **Команда проверки:**
  ```bash
  curl -I https://prosnab.tech/results?q=capacitor
  # Ожидается: 200 OK, HTML с одной шапкой
  ```
- **Acceptance:**
  - [ ] При прокрутке `/results` видна только одна шапка
  - [ ] Логотип кликабелен и ведёт на `/`
  - [ ] Переключатель темы работает
  - [ ] Мобильное меню открывается без дублей

**Коммит:**
```
fix(ui): remove duplicate header from ResultsShell

- Убран локальный <header> из ResultsShell.tsx (строки 46-87)
- Глобальный Navigation из ClientLayout теперь единственный
- Исправлена двойная шапка при прокрутке /results

Relates-to: #INVESTIGATION-REPORT-2025-10-17
```

---

#### Task 1.2: Удалить header из product page
- **Файл:** `/opt/deep-agg/v0-components-aggregator-page/app/product/[mpn]/page.tsx`
- **Действие:** Удалить строки 262-313 (весь `<header>` блок внутри return)
- **Затронутые компоненты:** `ProductPage`
- **Риск:** Низкий (глобальный `Navigation` заменит локальный)
- **Rollback:** Git revert коммита
- **Команда проверки:**
  ```bash
  curl -I https://prosnab.tech/product/CRCW0603000Z0EA
  # Ожидается: 200 OK, HTML с одной шапкой
  ```
- **Acceptance:**
  - [ ] При прокрутке `/product/[mpn]` видна только одна шапка
  - [ ] Sticky поведение работает
  - [ ] Навигационные ссылки кликабельны
  - [ ] Мобильное меню работает

**Коммит:**
```
fix(ui): remove duplicate header from product page

- Убран локальный <header> из /product/[mpn]/page.tsx (строки 262-313)
- Глобальный Navigation из ClientLayout используется единственный
- Исправлена двойная шапка при прокрутке /product/[mpn]

Relates-to: #INVESTIGATION-REPORT-2025-10-17
```

---

### БЛОК 2: ПУСТОЙ ФУТЕР (Priority: HIGH)

#### Task 2.1: Проверить БД на наличие static_pages
- **Команда:**
  ```bash
  sqlite3 /opt/deep-agg/data/db/app.db "SELECT id, slug, title, position, section, is_published FROM static_pages WHERE is_published=1 AND (position='footer' OR position='both');"
  ```
- **Ожидается:** Минимум 3-4 записи (О нас, Доставка, Контакты, Помощь)
- **Если пусто:** Переходим к Task 2.2

---

#### Task 2.2: Добавить seed-данные для футера
- **Файл:** Создать `/opt/deep-agg/scripts/seed-footer-pages.sql`
- **Содержимое:**
  ```sql
  -- Seed static pages for footer
  INSERT OR IGNORE INTO static_pages (slug, title, content, meta_description, is_published, position, section, sort_order, created_at, updated_at)
  VALUES
    ('about', 'О нас', '<h1>О компании</h1><p>Мы — агрегатор поиска электронных компонентов.</p>', 'О компании', 1, 'both', 'about', 1, datetime('now'), datetime('now')),
    ('delivery', 'Доставка', '<h1>Доставка</h1><p>Доставка по России и миру.</p>', 'Условия доставки', 1, 'footer', 'help', 2, datetime('now'), datetime('now')),
    ('contacts', 'Контакты', '<h1>Контакты</h1><p>Email: zapros@prosnab.tech</p>', 'Контактная информация', 1, 'footer', 'info', 3, datetime('now'), datetime('now')),
    ('help', 'Помощь', '<h1>Помощь</h1><p>FAQ и инструкции.</p>', 'Справка', 1, 'footer', 'help', 4, datetime('now'), datetime('now')),
    ('privacy', 'Политика конфиденциальности', '<h1>Политика</h1><p>Обработка персональных данных.</p>', 'Политика', 1, 'footer', 'info', 5, datetime('now'), datetime('now'));
  ```
- **Команда выполнения:**
  ```bash
  sqlite3 /opt/deep-agg/data/db/app.db < /opt/deep-agg/scripts/seed-footer-pages.sql
  ```
- **Проверка:**
  ```bash
  curl http://localhost:9201/api/static-pages/footer | jq '.pages | length'
  # Ожидается: >= 4
  ```

**Коммит:**
```
feat(db): add seed data for footer static pages

- Добавлены 5 страниц: О нас, Доставка, Контакты, Помощь, Политика
- Страницы распределены по секциям (about, help, info)
- is_published=1 для всех записей

Relates-to: #INVESTIGATION-REPORT-2025-10-17
```

---

#### Task 2.3: Добавить fallback в Footer.tsx
- **Файл:** `/opt/deep-agg/v0-components-aggregator-page/components/Footer.tsx`
- **Действие:** После строки 71 (перед блоком "Контакты") добавить:
  ```tsx
  {footerPages.length === 0 && !isLoading && (
    <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <h3 className="font-semibold text-lg mb-4">О компании</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><a href="/page/about" className="hover:text-foreground transition-colors">О нас</a></li>
          <li><a href="/page/delivery" className="hover:text-foreground transition-colors">Доставка</a></li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-4">Помощь</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><a href="/page/help" className="hover:text-foreground transition-colors">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-4">Информация</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><a href="/page/privacy" className="hover:text-foreground transition-colors">Политика</a></li>
          <li><a href="/page/contacts" className="hover:text-foreground transition-colors">Контакты</a></li>
        </ul>
      </div>
    </div>
  )}
  ```
- **Acceptance:**
  - [ ] При пустом БД футер показывает fallback (3 колонки)
  - [ ] При заполненном БД футер показывает динамические данные
  - [ ] Колонка "Контакты" видна всегда

**Коммит:**
```
feat(ui): add fallback rendering for empty footer

- Добавлен fallback с 3 колонками при отсутствии БД-данных
- Ссылки: О нас, Доставка, FAQ, Политика, Контакты
- Колонка "Контакты" рендерится всегда независимо от API

Relates-to: #INVESTIGATION-REPORT-2025-10-17
```

---

### БЛОК 3: УЗКАЯ КОЛОНКА "ЦЕНА" (Priority: HIGH)

#### Task 3.1: Установить min-width для колонки
- **Файл:** `/opt/deep-agg/v0-components-aggregator-page/components/ResultsClient.tsx`
- **Действие 1:** Строка 248 (заголовок `<th>` для "ЦЕНА"):
  ```tsx
  // БЫЛО:
  <th className="px-4 py-4 text-right text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('bestPriceRub')}>

  // СТАЛО:
  <th className="px-4 py-4 text-right text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-w-[140px]" onClick={() => handleSort('bestPriceRub')}>
  ```
- **Действие 2:** Строка 318 (ячейка с ценой):
  ```tsx
  // БЫЛО:
  <div className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">

  // СТАЛО:
  <div className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums whitespace-nowrap">
  ```
- **Acceptance:**
  - [ ] Цена отображается на одной строке (без переноса)
  - [ ] Минимальная ширина колонки — 140px
  - [ ] На мобильных экранах таблица прокручивается горизонтально

**Коммит:**
```
fix(ui): prevent price column text wrapping in results table

- Добавлен min-w-[140px] к заголовку колонки "ЦЕНА"
- Добавлен whitespace-nowrap к числу цены
- Исправлен перенос текста "1 187.45 ₽" на 2 строки

Relates-to: #INVESTIGATION-REPORT-2025-10-17
```

---

#### Task 3.2: Обернуть таблицу в overflow-x для мобильных
- **Файл:** `/opt/deep-agg/v0-components-aggregator-page/components/ResultsClient.tsx`
- **Действие:** Обернуть `<table>` (строка ~230) в:
  ```tsx
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      {/* существующий код */}
    </table>
  </div>
  ```
- **Acceptance:**
  - [ ] На экранах <768px таблица прокручивается горизонтально
  - [ ] На desktop прокрутка не появляется

**Коммит:**
```
feat(ui): add horizontal scroll for results table on mobile

- Обёрнута таблица в overflow-x-auto контейнер
- Сохранена ширина колонок на мобильных экранах
- Улучшена адаптивность для узких экранов

Relates-to: #INVESTIGATION-REPORT-2025-10-17
```

---

### БЛОК 4: ADMINJS SETTINGS ПУСТ (Priority: MEDIUM)

#### Task 4.1: Проверить наличие модели Settings в БД
- **Команда:**
  ```bash
  sqlite3 /opt/deep-agg/data/db/app.db ".schema settings"
  ```
- **Ожидается:** Схема таблицы `settings` существует
- **Если нет:** Создать таблицу вручную

---

#### Task 4.2: Проверить регистрацию модели в AdminJS
- **Файл:** `/opt/deep-agg/src/admin/index.mjs`
- **Проверка:** Модель `Setting` присутствует в массиве `resources` (строка 41)
- **Статус:** ✅ **УЖЕ НАСТРОЕНО** (найдено в расследовании)

---

#### Task 4.3: Добавить seed-данные для settings
- **Файл:** Создать `/opt/deep-agg/scripts/seed-settings.sql`
- **Содержимое:**
  ```sql
  -- Seed settings table
  INSERT OR IGNORE INTO settings (key, value, type, category, description, is_public, created_at, updated_at)
  VALUES
    ('pricing_policy', '{"markup_percent": 15, "markup_fixed_rub": 0}', 'json', 'pricing', 'Политика ценообразования', 0, datetime('now'), datetime('now')),
    ('notifications', '{"admin_notify_email": "zapros@prosnab.tech", "telegram_bot_token": null, "telegram_chat_id": null}', 'json', 'notifications', 'Настройки уведомлений', 0, datetime('now'), datetime('now')),
    ('site_name', 'Components Aggregator', 'string', 'general', 'Название сайта', 1, datetime('now'), datetime('now')),
    ('site_description', 'Поиск электронных компонентов', 'string', 'general', 'Описание сайта', 1, datetime('now'), datetime('now'));
  ```
- **Команда выполнения:**
  ```bash
  sqlite3 /opt/deep-agg/data/db/app.db < /opt/deep-agg/scripts/seed-settings.sql
  ```
- **Проверка:**
  ```bash
  sqlite3 /opt/deep-agg/data/db/app.db "SELECT key, category FROM settings;"
  # Ожидается: 4 записи
  ```

**Коммит:**
```
feat(db): add seed data for settings table

- Добавлены базовые настройки: pricing_policy, notifications, site_name, site_description
- Категории: general, pricing, notifications
- Готовность для AdminJS интерфейса

Relates-to: #INVESTIGATION-REPORT-2025-10-17
```

---

#### Task 4.4: Проверить доступ к AdminJS Settings
- **URL:** https://prosnab.tech/admin/resources/settings
- **Ожидается:** Таблица с 4 записями
- **Если пусто:** Проверить логи AdminJS на ошибки авторизации/БД

---

### БЛОК 5: ADMINJS NOTIFICATIONS ПУСТ (Priority: MEDIUM)

#### Task 5.1: Проверить наличие модели AdminNotification в БД
- **Команда:**
  ```bash
  sqlite3 /opt/deep-agg/data/db/app.db ".schema admin_notifications"
  ```
- **Ожидается:** Схема таблицы `admin_notifications` существует
- **Если нет:** Создать таблицу вручную

---

#### Task 5.2: Проверить регистрацию модели в AdminJS
- **Файл:** `/opt/deep-agg/src/admin/index.mjs`
- **Проверка:** Модель `AdminNotification` присутствует в массиве `resources` (строка 111)
- **Статус:** ✅ **УЖЕ НАСТРОЕНО** (найдено в расследовании)

---

#### Task 5.3: Добавить seed-данные для notifications
- **Файл:** Создать `/opt/deep-agg/scripts/seed-notifications.sql`
- **Содержимое:**
  ```sql
  -- Seed admin_notifications table
  INSERT OR IGNORE INTO admin_notifications (title, message, type, priority, payload, read_at, created_at)
  VALUES
    ('Новый заказ', 'Получен заказ ORD-1729000000-ABC123 от customer@example.com', 'order', 'high', '{"order_code":"ORD-1729000000-ABC123"}', NULL, datetime('now')),
    ('Система запущена', 'Сервер успешно перезапущен', 'system', 'normal', NULL, datetime('now'), datetime('now', '-1 day')),
    ('API Offline', 'DigiKey API недоступен', 'alert', 'high', '{"service":"digikey"}', NULL, datetime('now', '-2 hours'));
  ```
- **Команда выполнения:**
  ```bash
  sqlite3 /opt/deep-agg/data/db/app.db < /opt/deep-agg/scripts/seed-notifications.sql
  ```
- **Проверка:**
  ```bash
  sqlite3 /opt/deep-agg/data/db/app.db "SELECT id, title, type FROM admin_notifications;"
  # Ожидается: 3 записи
  ```

**Коммит:**
```
feat(db): add seed data for admin_notifications

- Добавлены 3 тестовых уведомления: заказ, система, алерт
- Типы: order, system, alert
- Приоритеты: high, normal

Relates-to: #INVESTIGATION-REPORT-2025-10-17
```

---

#### Task 5.4: Проверить доступ к AdminJS Notifications
- **URL:** https://prosnab.tech/admin/resources/admin_notifications
- **Ожидается:** Таблица с 3 записями
- **Если пусто:** Проверить логи AdminJS на ошибки

---

## 📊 КРИТЕРИИ ГОТОВНОСТИ (DoD)

### UI Fixes:
- [ ] При прокрутке видна только одна шапка на всех страницах
- [ ] Футер показывает 4 колонки (3 динамических + контакты)
- [ ] Цена в таблице результатов на одной строке
- [ ] Мобильная версия работает без UI-багов

### AdminJS Fixes:
- [ ] Settings показывает минимум 4 записи
- [ ] Notifications показывает минимум 3 записи
- [ ] Редактирование записей работает без ошибок

### Технические гарантии:
- [ ] Все коммиты следуют Conventional Commits
- [ ] Каждый коммит атомарный (один фикс = один коммит)
- [ ] Нет изменений v0-сетки/утилити-классов (только добавления)
- [ ] Создан PR с артефактами (скриншоты, curl-дампы)

---

## 🔗 АРТЕФАКТЫ ДЛЯ PR

### Обязательные скриншоты:
1. `/results` — одна шапка при прокрутке (desktop + mobile)
2. `/product/[mpn]` — одна шапка при прокрутке (desktop + mobile)
3. Футер с 4 колонками (desktop)
4. Колонка "ЦЕНА" без переноса строк (desktop)
5. AdminJS Settings с записями
6. AdminJS Notifications с записями

### Curl-дампы:
```bash
# API static pages
curl http://localhost:9201/api/static-pages/footer | jq > footer-pages.json

# AdminJS dashboard (через авторизацию)
curl -u admin:password http://localhost:9201/admin/api/resources/settings/list | jq > settings-list.json

# Health check
curl http://localhost:9201/api/health | jq > health.json
```

---

## 🚀 КОМАНДЫ ВЫПОЛНЕНИЯ

### Локальное тестирование:
```bash
# 1. Seed БД
sqlite3 /opt/deep-agg/data/db/app.db < /opt/deep-agg/scripts/seed-footer-pages.sql
sqlite3 /opt/deep-agg/data/db/app.db < /opt/deep-agg/scripts/seed-settings.sql
sqlite3 /opt/deep-agg/data/db/app.db < /opt/deep-agg/scripts/seed-notifications.sql

# 2. Перезапустить сервер
pm2 restart deep-agg

# 3. Проверить API
curl http://localhost:9201/api/static-pages/footer | jq '.pages | length'
curl http://localhost:9201/api/health

# 4. Открыть в браузере
firefox http://localhost:9201/results?q=resistor
firefox http://localhost:9201/admin
```

### Playwright smoke-тесты (после фиксов):
```bash
cd /opt/deep-agg/v0-components-aggregator-page
npx playwright test --project=chromium --grep "header|footer|price"
```

---

**Статус:** Готов к выполнению  
**Ответственный:** AI Tech Lead  
**Следующий шаг:** Начать с Task 1.1 (удаление header из ResultsShell)
