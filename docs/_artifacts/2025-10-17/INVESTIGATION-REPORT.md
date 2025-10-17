# ОТЧЁТ РАССЛЕДОВАНИЯ: КРИТИЧЕСКИЕ ПРОБЛЕМЫ UI/UX

**Дата:** 17 октября 2025  
**Статус:** Фаза R (Reconnaissance) — ЗАВЕРШЕНА  
**Режим:** Tech Lead Mode  

---

## EXECUTIVE SUMMARY

Обнаружено **5 критических проблем** в производственном окружении:

1. ✅ **Двойная шапка при прокрутке** — ДИАГНОСТИРОВАНА
2. ✅ **Пустой футер** — ДИАГНОСТИРОВАНА
3. ✅ **Узкая колонка "ЦЕНА"** — ДИАГНОСТИРОВАНА
4. 🔍 **AdminJS Settings пуст** — В РАССЛЕДОВАНИИ
5. 🔍 **AdminJS Notifications пуст** — В РАССЛЕДОВАНИИ

---

## 🔍 ПРОБЛЕМА №1: ДВОЙНАЯ ШАПКА ПРИ ПРОКРУТКЕ

### Симптомы
- При прокрутке страницы `/results` или `/product/[mpn]` появляется **вторая шапка** (header)
- Обе шапки имеют `position: sticky` и `top-0`

### Root Cause Analysis
**НАЙДЕН ИСТОЧНИК:** Дублирование navigation/header компонентов в архитектуре.

#### Обнаруженные дубли:

1. **`client-layout.tsx`** (глобальный):
   ```tsx
   export function ClientLayout({ children }) {
     return (
       <div className="flex flex-col min-h-screen">
         <Navigation />  ← ПЕРВАЯ ШАПКА
         <main className="flex-1">{children}</main>
         <Footer />
       </div>
     )
   }
   ```

2. **`ResultsShell.tsx`** (оболочка `/results`):
   ```tsx
   export default function ResultsShell({ children }) {
     return (
       <div className="min-h-screen relative">
         <header className="glass sticky top-0 z-50...">  ← ВТОРАЯ ШАПКА
           <div className="container...">
             <MicrochipLogo />
             <nav>О нас | Доставка | Контакты</nav>
           </div>
         </header>
         <main>{children}</main>
       </div>
     )
   }
   ```

3. **`/product/[mpn]/page.tsx`** (внутри компонента):
   ```tsx
   return (
     <div className="min-h-screen bg-background">
       <header className="glass sticky top-0 z-50...">  ← ТРЕТЬЯ ШАПКА
         <div className="container...">
           <MicrochipLogo />
           <nav>Источники | О нас</nav>
         </header>
       <main>...</main>
     </div>
   )
   ```

### Архитектурная проблема
- `ClientLayout` применяется ко **всем страницам** через `layout.tsx`
- `ResultsShell` и `/product/[mpn]` **переопределяют** собственные headers
- Результат: **2 sticky headers накладываются друг на друга**

### Решение
**СТРАТЕГИЯ:** Убрать локальные headers из `ResultsShell` и `/product/[mpn]`, оставить только глобальный `<Navigation />` в `ClientLayout`.

#### План действий:
1. ✅ Удалить `<header>` из `ResultsShell.tsx` (строки 46-87)
2. ✅ Удалить `<header>` из `/product/[mpn]/page.tsx` (строки 262-313)
3. ✅ Убедиться, что `Navigation.tsx` подтягивает корректные статические страницы через `/api/static-pages/header`
4. ✅ Проверить, что мобильное меню работает на всех экранах

#### Acceptance Criteria:
- [ ] При прокрутке видна **только одна шапка**
- [ ] Шапка sticky работает на `/`, `/results`, `/product/[mpn]`
- [ ] Мобильное меню открывается/закрывается без дублей
- [ ] Переключатель темы работает глобально

---

## 🔍 ПРОБЛЕМА №2: ПУСТОЙ ФУТЕР

### Симптомы
- Футер рендерится, но **пуст внутри** (нет ссылок, контактов, текста)
- Видна только рамка/контейнер

### Root Cause Analysis
**НАЙДЕН ИСТОЧНИК:** API `/api/static-pages/footer` возвращает **пустой массив** или ошибку.

#### Код футера (`Footer.tsx`):
```tsx
useEffect(() => {
  const fetchPages = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBase}/api/static-pages/footer`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch footer pages')
      }
      const data = await response.json()
      const pages = Array.isArray(data.pages) ? data.pages : []
      setFooterPages(pages)
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching static pages:', err)
      setError('Ссылки временно недоступны')
      setIsLoading(false)
    }
  }
  fetchPages()
}, [])
```

#### Проблемные сценарии:
1. **БД пуста:** `static_pages` таблица не содержит записей с `position='footer'` или `position='both'`
2. **API недоступен:** `NEXT_PUBLIC_API_BASE_URL` не задан или неверен
3. **Схема ответа:** Ожидается `{ pages: [...] }`, но сервер возвращает `{ ok: true, pages: [...] }`

#### Проверка API (`api/static-pages.mjs`):
```javascript
app.get('/api/static-pages/footer', (req, res) => {
  const pages = db
    .prepare(`
      SELECT slug, title, sort_order, COALESCE(section, 'info') AS section
      FROM static_pages
      WHERE is_published = 1 AND (position = 'footer' OR position = 'both')
      ORDER BY sort_order ASC, title ASC
    `)
    .all();

  return res.json({ ok: true, pages });  ← СХЕМА ПРАВИЛЬНАЯ
});
```

### Решение
**СТРАТЕГИЯ:** Добавить fallback-контент + проверить наличие записей в БД.

#### План действий:
1. ✅ Проверить БД: `SELECT * FROM static_pages WHERE is_published=1 AND (position='footer' OR position='both')`
2. ✅ Если пусто — добавить seed-данные (О нас, Доставка, Контакты, Помощь)
3. ✅ Обновить `Footer.tsx` для обработки `data.pages` (текущая схема корректна)
4. ✅ Добавить fallback-рендеринг при `footerPages.length === 0`:
   ```tsx
   {footerPages.length === 0 && (
     <div className="col-span-3 grid grid-cols-3 gap-8">
       <div>
         <h3>О компании</h3>
         <ul>
           <li><a href="/page/about">О нас</a></li>
           <li><a href="/page/delivery">Доставка</a></li>
         </ul>
       </div>
       <div>
         <h3>Помощь</h3>
         <ul>
           <li><a href="/page/help">FAQ</a></li>
         </ul>
       </div>
       <div>
         <h3>Информация</h3>
         <ul>
           <li><a href="/page/privacy">Политика</a></li>
         </ul>
       </div>
     </div>
   )}
   ```

#### Acceptance Criteria:
- [ ] Футер показывает **3 колонки** (О компании, Помощь, Информация) + Контакты
- [ ] Ссылки кликабельны и ведут на `/page/{slug}`
- [ ] При отсутствии БД-данных показывается fallback
- [ ] Контакты видны всегда (Email, Тел)

---

## 🔍 ПРОБЛЕМА №3: УЗКАЯ КОЛОНКА "ЦЕНА"

### Симптомы
- В таблице `/results` колонка "ЦЕНА" **слишком узкая**
- Текст переносится на **2 строки** (например: `1 187.45` → `1 187.` на первой строке, `.45 ₽` на второй)
- Визуально некрасиво, нарушает читаемость

### Root Cause Analysis
**НАЙДЕН ИСТОЧНИК:** Отсутствие явной ширины колонки + использование `text-right` без `whitespace-nowrap`.

#### Код таблицы (`ResultsClient.tsx`, строки 240-252):
```tsx
<th className="px-4 py-4 text-right text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('bestPriceRub')}>
  <div className="flex items-center justify-end gap-2">
    ЦЕНА
    {sortKey === 'bestPriceRub' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
  </div>
</th>
```

#### Код ячейки (строки 315-323):
```tsx
<td className="px-4 py-4">
  {g.bestPriceRub && (
    <div className="text-right">
      <div className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">
        {g.bestPriceRub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">от 1 шт</div>
    </div>
  )}
</td>
```

### Проблемные факторы:
1. **Нет `min-width`** у колонки
2. **Нет `whitespace-nowrap`** на числе
3. **`tabular-nums`** есть, но не помогает при малой ширине
4. Флекс-контейнер заголовка съедает пространство

### Решение
**СТРАТЕГИЯ:** Установить явную минимальную ширину + запретить перенос.

#### План действий:
1. ✅ Добавить `min-w-[140px]` к `<th>` колонки "ЦЕНА"
2. ✅ Добавить `whitespace-nowrap` к числу цены
3. ✅ Проверить на мобильных экранах (возможно, нужна горизонтальная прокрутка таблицы)

#### Код изменений:
```tsx
// Заголовок
<th className="px-4 py-4 text-right text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-w-[140px]" onClick={() => handleSort('bestPriceRub')}>
  <div className="flex items-center justify-end gap-2">
    ЦЕНА
    {sortKey === 'bestPriceRub' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
  </div>
</th>

// Ячейка
<td className="px-4 py-4">
  {g.bestPriceRub && (
    <div className="text-right">
      <div className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums whitespace-nowrap">
        {g.bestPriceRub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">от 1 шт</div>
    </div>
  )}
</td>
```

#### Acceptance Criteria:
- [ ] Цена отображается **на одной строке**
- [ ] Минимальная ширина колонки — **140px**
- [ ] На мобильных экранах таблица прокручивается горизонтально (если нужно)
- [ ] Выравнивание по правому краю сохраняется

---

## 🔍 ПРОБЛЕМА №4: ADMINJS SETTINGS ПУСТ

### Симптомы
- Страница `https://prosnab.tech/admin/resources/settings` загружается, но **не показывает данные**
- Возможно, пустая таблица или ошибка загрузки

### Root Cause Analysis (в процессе)
**ГИПОТЕЗЫ:**

1. **Таблица `settings` пуста:**
   - AdminJS пытается загрузить модель `Settings`, но она не содержит записей
   - Нужно проверить: `SELECT * FROM settings;`

2. **Модель не настроена в AdminJS:**
   - Файл `/opt/deep-agg/src/admin/index.mjs` не включает модель `Settings` в ресурсы
   - Нужно проверить: `resources: [...]` массив

3. **Схема БД не синхронизирована:**
   - Sequelize модели устарели или не мигрированы
   - Нужно проверить: `src/db/models.js` → модель `Settings`

4. **Права доступа:**
   - AdminJS не видит таблицу из-за неправильной конфигурации БД

### План диагностики:
```bash
# 1. Проверить содержимое таблицы
sqlite3 data/db/app.db "SELECT * FROM settings;"

# 2. Проверить структуру таблицы
sqlite3 data/db/app.db ".schema settings"

# 3. Проверить модели Sequelize
cat src/db/models.js | grep -A 20 "Settings"

# 4. Проверить конфигурацию AdminJS
cat src/admin/index.mjs | grep -A 10 "resources"
```

### Временное решение (FALLBACK):
- API эндпоинты `/api/admin/settings/pricing` и `/api/admin/settings/notifications` работают через прямые SQL-запросы (см. `api/admin.settings.js`)
- Можно использовать API напрямую для управления настройками

---

## 🔍 ПРОБЛЕМА №5: ADMINJS NOTIFICATIONS ПУСТ

### Симптомы
- Страница `https://prosnab.tech/admin/resources/admin_notifications` загружается, но **не показывает данные**

### Root Cause Analysis (в процессе)
**ГИПОТЕЗЫ:** (аналогично проблеме №4)

1. **Таблица `admin_notifications` пуста**
2. **Модель не настроена в AdminJS**
3. **Схема БД не синхронизирована**

### План диагностики:
```bash
# 1. Проверить содержимое таблицы
sqlite3 data/db/app.db "SELECT * FROM admin_notifications;"

# 2. Проверить структуру таблицы
sqlite3 data/db/app.db ".schema admin_notifications"

# 3. Проверить модели Sequelize
cat src/db/models.js | grep -A 20 "AdminNotification"

# 4. Проверить API эндпоинты
curl -H "Authorization: Basic ..." https://prosnab.tech/api/admin/notifications
```

### Временное решение (FALLBACK):
- API эндпоинт `/api/admin/notifications` доступен через Nginx Basic Auth (см. `api/admin.notifications.js`)

---

## 📋 ЧЕКЛИСТ ДАЛЬНЕЙШИХ ДЕЙСТВИЙ

### Фаза I: IMPLEMENTATION (немедленно)

#### UI Fixes (критичные):
- [ ] Удалить дубликаты headers из `ResultsShell.tsx`
- [ ] Удалить дубликат header из `/product/[mpn]/page.tsx`
- [ ] Добавить `min-w-[140px]` + `whitespace-nowrap` к колонке "ЦЕНА"
- [ ] Добавить seed-данные для футера в `static_pages`
- [ ] Добавить fallback-рендеринг в `Footer.tsx`

#### AdminJS Fixes (диагностика):
- [ ] Проверить БД: `settings` и `admin_notifications` таблицы
- [ ] Проверить модели Sequelize: `src/db/models.js`
- [ ] Проверить конфигурацию AdminJS: `src/admin/index.mjs`
- [ ] Если модели отсутствуют — добавить их в `resources: []`

### Фаза P: PROOF (после фиксов)

#### Артефакты для PR:
- [ ] Скриншот: `/results` с одной шапкой (desktop)
- [ ] Скриншот: `/product/[mpn]` с одной шапкой (desktop)
- [ ] Скриншот: Колонка "ЦЕНА" без переноса строк
- [ ] Скриншот: Футер с заполненными ссылками (3 колонки + контакты)
- [ ] Скриншот: AdminJS Settings с данными (если починено)
- [ ] Скриншот: AdminJS Notifications с данными (если починено)
- [ ] curl-дамп: `/api/static-pages/footer` (JSON response)
- [ ] curl-дамп: `/api/admin/settings/pricing` (JSON response)

---

## 🚨 РИСКИ И ОГРАНИЧЕНИЯ

### Риск №1: Ломаются другие страницы
**Митигация:** Проверить `/`, `/results`, `/product/[mpn]`, `/page/{slug}` после удаления локальных headers.

### Риск №2: AdminJS требует миграций
**Митигация:** Если модели отсутствуют, создать через Sequelize CLI или вручную через SQL.

### Риск №3: Респонсивность таблицы
**Митигация:** На мобильных экранах обернуть таблицу в `<div className="overflow-x-auto">`.

---

## 📊 МЕТРИКИ УСПЕХА

### Критерии готовности (DoD):
1. ✅ Одна шапка на всех страницах
2. ✅ Футер с 4 колонками (3 динамических + контакты)
3. ✅ Цена на одной строке в таблице результатов
4. 🔍 AdminJS Settings показывает данные (или fallback на API)
5. 🔍 AdminJS Notifications показывает данные (или fallback на API)

### Технические гарантии:
- Нет изменения v0-сетки
- Нет изменения утилити-классов (только добавление)
- Conventional Commits для всех изменений
- Playwright smoke-тесты для `/`, `/results`, `/product/[mpn]`

---

## 🔗 СВЯЗАННЫЕ ДОКУМЕНТЫ

- [API-CONTRACT.md](/opt/deep-agg/API-CONTRACT.md)
- [ARCHITECTURE.md](/opt/deep-agg/ARCHITECTURE.md)
- [copilot-instructions.md](/opt/deep-agg/.github/copilot-instructions.md)
- [russia.instructions.md](/opt/deep-agg/.github/instructions/russia.instructions.md)

---

**Ответственный:** AI Tech Lead  
**Следующий шаг:** Переход к фазе I (Implementation) после утверждения плана
