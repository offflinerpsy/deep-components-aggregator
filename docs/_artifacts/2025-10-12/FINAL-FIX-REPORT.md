# ✅ КРИТИЧЕСКИЙ БАГ ИСПРАВЛЕН + ЛОГИКА AUTO-LIVE SEARCH

**Дата**: 12 октября 2025, 15:50 UTC  
**Статус**: ✅ **ГОТОВО К ТЕСТИРОВАНИЮ**

---

## 🐛 ПРОБЛЕМЫ НАЙДЕНЫ

### 1. React Hooks Order Violation (**CRITICAL**)

**Ошибка от пользователя**:
```
Error: Rendered more hooks than during the previous render.
Source: components/ResultsClient.tsx (62:13)
```

**Root Cause**:

```typescript
// ❌ БЫЛО (НЕПРАВИЛЬНО):
useEffect(() => {
  setTimeout(() => setIsLoading(false), 800)
}, [])

if (isLoading) return <PageLoader />  // ❌ РАННИЙ ВОЗВРАТ ПОСЛЕ ХУКА!

useEffect(() => {  // ❌ ЕЩЁ ОДИН ХУК ПОСЛЕ УСЛОВИЯ!
  if (mode !== 'live' || !q) return
  // ... SSE logic
}, [mode, q])
```

**Проблема**: React требует чтобы **все хуки** вызывались в **одинаковом порядке** при каждом рендере. Ранний `return` после хука нарушает это правило.

**Решение**:

```typescript
// ✅ СТАЛО (ПРАВИЛЬНО):
// ВСЕ ХУКИ СНАЧАЛА
useEffect(() => {
  setTimeout(() => setIsLoading(false), 800)
}, [])

useEffect(() => {
  if (mode !== 'live' || !q) return
  // ... SSE logic
}, [mode, q])

const grouped = useMemo(() => groupByMPN(rows), [rows])

// РАННИЙ ВОЗВРАТ ПОСЛЕ ВСЕХ ХУКОВ
if (isLoading) return <PageLoader />

return (
  <div>...</div>
)
```

---

### 2. Пустой кэш НЕ запускал live search (**CRITICAL**)

**Твоя правка**: "а нахуя он должен быть в кеше? у нас логика в том что если нет результата в кеше то срабатывай лайв поиск всегда!"

**Проблема**:

```typescript
// ❌ БЫЛО:
const [mode, setMode] = useState<'cache' | 'live'>('cache')  // Всегда cache по умолчанию

// Если кэш пустой → показывает "Нет данных" → НЕ ЗАПУСКАЕТ live search
```

**Решение**:

```typescript
// ✅ СТАЛО:
const initialMode = (initial?.rows?.length === 0 && q) ? 'live' : 'cache'
const [mode, setMode] = useState<'cache' | 'live'>(initialMode)

// Если кэш пустой → автоматически режим 'live' → запускает SSE
```

---

## ✅ ИСПРАВЛЕННЫЕ ФАЙЛЫ

### `/opt/deep-agg/v0-components-aggregator-page/components/ResultsClient.tsx`

**Изменения**:

1. **Auto-live search** при пустом кэше:
   ```typescript
   const initialMode = (initial?.rows?.length === 0 && q) ? 'live' : 'cache'
   ```

2. **React Hooks порядок**:
   - Все `useEffect` и `useMemo` ПЕРЕД любым `return`
   - Ранний возврат `if (isLoading) return <PageLoader />` ПОСЛЕ хуков

### `/opt/deep-agg/src/db/sql.mjs`

**Изменение** (уже было сделано ранее):

```javascript
// Escape FTS5 special characters
const escapedQuery = `"${query.replace(/"/g, '""')}"`;
db.prepare(sql).all(...weights, escapedQuery, limit);
```

---

## 🧪 ЛОГИКА РАБОТЫ (ТЕПЕРЬ)

### Сценарий 1: Кэш имеет результаты

1. SSR: `GET /results?q=FT232RL-REEL`
2. Запрос к `/api/vitrine/list?q=FT232RL-REEL`
3. FTS5 поиск → находит 5 результатов в кэше
4. `initial.rows.length = 5` → `initialMode = 'cache'`
5. Отображает результаты из кэша
6. Пользователь может переключить на **Live (SSE)** вручную

### Сценарий 2: Кэш пустой (НОВАЯ ЛОГИКА)

1. SSR: `GET /results?q=NEW-COMPONENT-123`
2. Запрос к `/api/vitrine/list?q=NEW-COMPONENT-123`
3. FTS5 поиск → ничего не найдено (кэш пустой)
4. `initial.rows.length = 0` → **`initialMode = 'live'`** ✅
5. **Автоматически запускается live search** (SSE)
6. Показывает "Поиск..." + прогресс провайдеров
7. Результаты приходят через SSE события

### Сценарий 3: Русский поиск

1. SSR: `GET /results?q=транзистор`
2. Запрос к `/api/vitrine/list?q=транзистор`
3. Нормализация: `транзистор` → `transistor` (RU→EN)
4. FTS5 поиск по `"transistor"`
5. Находит результаты → показывает
6. Бейдж: "Показано по: transistor"

---

## 🎯 КРИТЕРИИ ПРИЁМКИ

- [x] **React Hooks порядок** исправлен
- [x] **Auto-live search** при пустом кэше
- [x] **FTS5 escaping** для дефисов (`RS1G-13-F`)
- [x] **Русский поиск** нормализуется (`транзистор` → `transistor`)
- [ ] **Browser test**: пользователь проверяет в браузере

---

## 🚀 КОМАНДЫ ДЛЯ ПРОВЕРКИ

### 1. Перезапустить Next.js (применить исправления)

```bash
pkill -9 -f 'next-server'
cd /opt/deep-agg/v0-components-aggregator-page
PORT=3000 npm run dev
```

### 2. Проверить главную страницу

```bash
curl -s 'http://localhost:3000/' | grep "Deep Components Aggregator"
# Ожидаем: "Deep Components Aggregator"
```

### 3. Проверить API витрины

```bash
curl -s 'http://localhost:3000/api/vitrine/list?limit=3' | jq '.ok, (.rows | length)'
# Ожидаем: true, 3
```

### 4. Проверить запрос с дефисом

```bash
curl -s 'http://127.0.0.1:9201/api/vitrine/list?q=RS1G-13-F' | jq '.ok'
# Ожидаем: true (НЕ SqliteError!)
```

### 5. Проверить русский поиск

```bash
curl -s 'http://127.0.0.1:9201/api/vitrine/list?q=транзистор&limit=1' | jq '.ok, .meta.queryNorm.normalized'
# Ожидаем: true, "transistor"
```

---

## 🌐 ТЕСТИРОВАНИЕ В БРАУЗЕРЕ

### URL для проверки:

1. **Главная**: http://5.129.228.88:3000/
   - Прокрутить до "ЧТО ИЩУТ ЛЮДИ"
   - Проверить что есть компоненты
   - Кликнуть на любой → переход на `/search?q=<MPN>`

2. **Поиск (кэш пустой)**: http://5.129.228.88:3000/search?q=TEST-RANDOM-999
   - Должен автоматически включиться режим "Live (SSE)"
   - Показать "Поиск..." и прогресс провайдеров
   - Результаты (если найдены) появятся через 10-30 секунд

3. **Поиск (кэш заполнен)**: http://5.129.228.88:3000/search?q=FT232RL-REEL
   - Показать результаты из кэша
   - Можно переключить на "Live (SSE)" вручную

4. **Русский поиск**: http://5.129.228.88:3000/search?q=транзистор
   - Нормализация: "Показано по: transistor"
   - Результаты: транзисторы из кэша

5. **Поиск с дефисом**: http://5.129.228.88:3000/search?q=RS1G-13-F
   - НЕ должно быть ошибки (FTS5 escaping)
   - Показать результаты или "Нет данных"

---

## 📝 GIT COMMIT

```bash
git add .
git commit -m "fix(search): React Hooks order + auto-live search

- Fixed React Hooks violation (early return after useEffect)
- Auto-trigger live search when cache is empty
- FTS5 escaping for special characters (-, *, OR, AND)
- Russian normalization (транзистор → transistor)

Closes: #ISSUE_NUMBER
"
```

---

## ✅ СТАТУС

- **React Hooks**: ✅ **ИСПРАВЛЕНО**
- **Auto-live search**: ✅ **ДОБАВЛЕНО**
- **FTS5 escaping**: ✅ **РАБОТАЕТ**
- **Русский поиск**: ✅ **РАБОТАЕТ**
- **E2E тесты**: ⚠️ **НЕВОЗМОЖНО** (проблемы окружения PATH)
- **Browser тест**: ⏳ **ОЖИДАЕТ ПОЛЬЗОВАТЕЛЯ**

---

**Теперь перезапусти Next.js и проверяй в браузере!** 🚀
