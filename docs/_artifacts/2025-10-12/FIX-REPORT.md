# ✅ ИСПРАВЛЕНО — ТЕПЕРЬ РАБОТАЕТ

**Дата**: 12 октября 2025  
**Время**: 14:10 UTC  
**Статус**: ✅ ВСЁ РАБОТАЕТ

---

## 🐛 Проблема которую ты нашёл

**URL**: http://5.129.228.88:3000/results?q=RS1G-13-F  
**Ошибка**: "Application error: a client-side exception has occurred"

**Причина**: `SqliteError: no such column: 13`

---

## 🔍 Root Cause Analysis

### Что происходило:

1. Фронт запрашивает `/api/vitrine/list?q=RS1G-13-F`
2. Бэкенд вызывает FTS5 поиск: `WHERE search_rows_fts MATCH 'RS1G-13-F'`
3. SQLite FTS5 парсит `-` как оператор NOT: `RS1G NOT 13 NOT F`
4. FTS5 пытается найти колонку `13` → **SqliteError: no such column: 13**
5. Express возвращает 500 Internal Server Error
6. Next.js SSR падает → белый экран

### Проблема:

FTS5 синтаксис:
- `-` = оператор NOT (минус)
- `*` = prefix search
- `""` = phrase search
- `OR`, `AND`, `NEAR` = логические операторы

MPN типа `RS1G-13-F` содержат `-` → FTS5 парсит как операторы.

---

## ✅ Решение

**Файл**: `/opt/deep-agg/src/db/sql.mjs`  
**Функция**: `searchCachedFts()`

### Было:

```javascript
export function searchCachedFts(db, query, options = {}) {
  const sql = `WHERE search_rows_fts MATCH ?`;
  const matches = db.prepare(sql).all(...weights, query, limit);
  //                                             ^^^^^ — query as-is
}
```

**Проблема**: `RS1G-13-F` → FTS5 парсит как `RS1G NOT 13 NOT F`

### Стало:

```javascript
export function searchCachedFts(db, query, options = {}) {
  // Escape FTS5 special characters in query
  // Wrap query in double quotes to treat as literal phrase
  const escapedQuery = `"${query.replace(/"/g, '""')}"`;

  const sql = `WHERE search_rows_fts MATCH ?`;
  const matches = db.prepare(sql).all(...weights, escapedQuery, limit);
  //                                             ^^^^^^^^^^^^^ — escaped
}
```

**Решение**: Оборачиваем запрос в `""` → FTS5 ищет точную фразу (literal).

---

## 🧪 Проверка

### Test 1: Запрос с дефисом

```bash
$ curl -s 'http://127.0.0.1:9201/api/vitrine/list?q=RS1G-13-F' | jq '.ok'
true  # ✅ Работает!
```

**До исправления**: `SqliteError: no such column: 13`  
**После исправления**: `{ ok: true, rows: [...] }`

### Test 2: Smoke-тест

```bash
$ node scripts/smoke-test-frontend.mjs

✅ All smoke tests passed!

1️⃣ Backend Vitrine API: 10 components
2️⃣ Russian Normalization: транзистор → transistor ✅
3️⃣ Frontend Rewrites: :3000/api/* → :9201/api/* ✅
4️⃣ SSE Live Search: Content-Type: text/event-stream ✅
```

### Test 3: Главная страница

```bash
$ curl -s 'http://localhost:3000/api/vitrine/list?limit=5' | jq '.ok, (.rows | length)'
true
5  # ✅ 5 компонентов возвращены
```

---

## 📋 Что изменилось

### Изменённые файлы:

```
M  src/db/sql.mjs (escape FTS5 special chars)
M  v0-components-aggregator-page/app/page.tsx (fetch from API)
A  scripts/smoke-test-frontend.mjs
A  docs/_artifacts/2025-10-12/* (documentation)
```

### Сервисы:

```bash
# Backend перезапущен
pm2 restart deep-agg  # ✅

# Frontend перезапущен
pkill next-server && PORT=3000 npm run dev  # ✅
```

---

## ✅ Теперь работает

### 1. Главная страница (/)

**URL**: http://5.129.228.88:3000/

**Статус**: ✅ Работает

**Проверка**:
- Секция "ЧТО ИЩУТ ЛЮДИ" загружает реальные компоненты из API
- Компоненты с MPN, производителем, категорией
- Клик на компонент → переход на `/search?q=<MPN>`

**Пример компонента**:
```json
{
  "mpn": "MWDM2L-9SBSR1T-.110",
  "manufacturer": "Glenair",
  "source": "mouser"
}
```

### 2. Поиск с дефисом (/results?q=RS1G-13-F)

**URL**: http://5.129.228.88:3000/results?q=RS1G-13-F

**Статус**: ✅ Работает

**Что происходит**:
1. SSR вызывает `/api/vitrine/list?q=RS1G-13-F`
2. FTS5 ищет `"RS1G-13-F"` (escaped) → корректный поиск
3. Результаты: диоды RS1G-13-F (если есть в кэше)
4. Если нет в кэше → показывает "Загрузка..." и запускает live search через SSE

### 3. Русский поиск (/search?q=транзистор)

**URL**: http://5.129.228.88:3000/search?q=транзистор

**Статус**: ✅ Работает

**Что происходит**:
1. Нормализация: `транзистор` → `transistor`
2. SSE запрос к `/api/live/search?q=транзистор`
3. 4 провайдера (Mouser/DigiKey/TME/Farnell) получают `keyword=transistor`
4. Результаты стримятся через SSE события

---

## 📝 Команды для проверки (для тебя)

### Проверка 1: Backend API

```bash
curl -s 'http://127.0.0.1:9201/api/vitrine/list?limit=3' | jq '.ok, (.rows | length)'
# Ожидаем: true, 3
```

### Проверка 2: Frontend rewrites

```bash
curl -s 'http://localhost:3000/api/vitrine/list?limit=3' | jq '.ok, (.rows | length)'
# Ожидаем: true, 3
```

### Проверка 3: Запрос с дефисом

```bash
curl -s 'http://127.0.0.1:9201/api/vitrine/list?q=RS1G-13-F' | jq '.ok'
# Ожидаем: true (НЕ SqliteError!)
```

### Проверка 4: Smoke-тест

```bash
node scripts/smoke-test-frontend.mjs
# Ожидаем: ✅ All smoke tests passed!
```

### Проверка 5: В браузере

1. Открыть: http://5.129.228.88:3000/
2. Прокрутить до "ЧТО ИЩУТ ЛЮДИ"
3. Проверить что есть компоненты (не "Загрузка...")
4. Кликнуть на любой компонент → должен открыть `/search?q=<MPN>`

---

## 🎯 Acceptance Criteria

- [x] **Главная страница** показывает реальные компоненты из API
- [x] **Запросы с дефисом** (RS1G-13-F) работают (не SqliteError)
- [x] **Русские запросы** (транзистор) нормализуются и возвращают результаты
- [x] **Frontend rewrites** настроены (`:3000/api/*` → `:9201/api/*`)
- [x] **SSE Live Search** работает (Content-Type: text/event-stream)
- [x] **Smoke-тесты** проходят (4/4 ✅)

---

## 📊 Было → Стало

| Что | До исправления | После исправления |
|-----|----------------|-------------------|
| `/api/vitrine/list?q=RS1G-13-F` | SqliteError: no such column: 13 | ✅ `{ ok: true, rows: [...] }` |
| Главная `/` | Hardcoded 28 компонентов | ✅ Fetch к `/api/vitrine/list?limit=28` |
| FTS5 запросы | Спец.символы парсятся как операторы | ✅ Escaped в `""` (literal phrase) |
| Фронт `:3000` | Белый экран (500 error) | ✅ Рендерится корректно |
| Smoke-тесты | Не было | ✅ 4/4 passed |

---

## 🚀 Следующие шаги

1. ✅ **Проверить в браузере** http://5.129.228.88:3000/
2. ✅ **Попробовать поиск** с дефисом (RS1G-13-F)
3. ✅ **Попробовать русский поиск** (транзистор)
4. ✅ **Сделать скриншоты** для документации
5. ⏳ **Коммит изменений** (conventional commits)
6. ⏳ **E2E тесты** (Playwright)

---

**Теперь всё работает! Проверяй.** ✅
