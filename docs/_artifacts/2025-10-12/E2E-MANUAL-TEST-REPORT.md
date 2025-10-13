# 🧪 РУЧНОЙ E2E ТЕСТ — ОТЧЁТ

**Дата**: 12 октября 2025, 15:45 UTC  
**Исполнитель**: AI Assistant (через curl/Browser DevTools эмуляцию)

---

## ❌ ПРИЗНАНИЕ: Playwright не удалось запустить

**Причина**: Постоянная поломка `$PATH` в оболочке SSH; команды `chmod`, `sleep`, `tee`, `npx` не находятся.

**Вывод**: Невозможно запустить E2E автотесты в текущей среде.

---

## ✅ АЛЬТЕРНАТИВА: Ручная проверка через curl

### Тест 1: Главная страница загружается

```bash
$ curl -s 'http://localhost:3000/' | grep -o 'Deep Components Aggregator'
# ОЖИДАЕМ: "Deep Components Aggregator"
```

**Результат**: Не получен (curl зависает или Next.js не отвечает).

**Статус**: ⚠️ **НЕ ПРОВЕРЕНО** (проблема с окружением)

---

### Тест 2: API витрины возвращает компоненты

```bash
$ curl -s 'http://localhost:3000/api/vitrine/list?limit=5' | jq '.ok, (.rows | length)'
# ОЖИДАЕМ: true, 5
```

**Результат**: НЕ ПРОВЕРЕНО (curl не отвечает).

**Статус**: ⚠️ **НЕ ПРОВЕРЕНО**

---

### Тест 3: Поиск с дефисом не падает

```bash
$ curl -s 'http://127.0.0.1:9201/api/vitrine/list?q=RS1G-13-F' | jq '.ok'
# ОЖИДАЕМ: true (НЕ SqliteError)
```

**Результат**: Уже проверено ранее — **✅ РАБОТАЕТ** (FTS5 fix applied).

**Статус**: ✅ **PASSED**

---

### Тест 4: Русский поиск нормализуется

```bash
$ curl -s 'http://127.0.0.1:9201/api/vitrine/list?q=транзистор&limit=1' | jq '.ok, .meta.queryNorm.normalized'
# ОЖИДАЕМ: true, "transistor"
```

**Результат**: Уже проверено в smoke-тестах — ✅ **PASSED**.

**Статус**: ✅ **PASSED**

---

## 🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА НАЙДЕНА

**Скриншот ошибки от пользователя**:

```
Error: Rendered more hooks than during the previous render.
Source: components/ResultsClient.tsx (62:13) @ ResultsClient
```

**Root Cause**:

```typescript
useEffect(() => {
  setTimeout(() => setIsLoading(false), 800)
}, [])

if (isLoading) return <PageLoader />  // ❌ РАННИЙ ВОЗВРАТ ПОСЛЕ ХУКА!

useEffect(() => {  // ❌ ЕЩЁ ОДИН ХУКА ПОСЛЕ УСЛОВИЯ!
  if (mode !== 'live' || !q) return
  // ...
}, [mode, q])
```

**Правило React**: Хуки ДОЛЖНЫ вызываться в одинаковом порядке при каждом рендере. **Ранний возврат ПОСЛЕ хука запрещён**.

---

## ✅ ИСПРАВЛЕНИЕ

Перемещаю ранний возврат **ПОСЛЕ ВСЕХ ХУКОВ**:

```typescript
export default function ResultsClient({ initial, q }: { initial: SSRPayload | null, q: string }) {
  // Автоматически включаем live search если кэш пустой
  const initialMode = (initial?.rows?.length === 0 && q) ? 'live' : 'cache'
  
  const [mode, setMode] = useState<'cache' | 'live'>(initialMode)
  const [rows, setRows] = useState<Row[]>(initial?.rows || [])
  const [progress, setProgress] = useState<string>("")
  const [providers, setProviders] = useState<Array<{ provider: string; status: 'ok' | 'error'; count?: number; error?: string }>>([])
  const [queryNorm, setQueryNorm] = useState<any>(initial?.meta?.queryNorm || null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    manufacturer: '',
    inStock: false
  })

  // ✅ ВСЕ ХУКИ СНАЧАЛА
  useEffect(() => {
    setTimeout(() => setIsLoading(false), 800)
  }, [])

  useEffect(() => {
    if (mode !== 'live' || !q) return
    setRows([])
    setProviders([])
    setProgress('Поиск...')
    const es = new EventSource(`/api/live/search?q=${encodeURIComponent(q)}`)
    // ... (SSE логика)
    return () => { es.close() }
  }, [mode, q])

  const grouped = useMemo(() => groupByMPN(rows), [rows])

  // ✅ РАННИЙ ВОЗВРАТ ПОСЛЕ ХУКОВ
  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      {/* ... (UI) */}
    </div>
  )
}
```

---

## 📝 ФАЙЛЫ К ИЗМЕНЕНИЮ

1. **`/opt/deep-agg/v0-components-aggregator-page/components/ResultsClient.tsx`**:
   - Переместить `if (isLoading) return <PageLoader />` **ПОСЛЕ** всех `useEffect` и `useMemo`.

2. **Логика auto-live search**:
   - `const initialMode = (initial?.rows?.length === 0 && q) ? 'live' : 'cache'` — **УЖЕ ДОБАВЛЕНО**.

---

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После исправления:

1. ✅ Главная страница загружает компоненты из API
2. ✅ Клик на компонент → переход на `/search?q=<MPN>`
3. ✅ Если кэш пустой → автоматически запускается live search (SSE)
4. ✅ Русский поиск нормализуется (`транзистор` → `transistor`)
5. ✅ Запросы с дефисом не падают (`RS1G-13-F` → FTS5 escaping)

---

## 🔥 КРИТИЧНОСТЬ

**ВЫСОКАЯ** — React Hooks violation приводит к:
- Краш приложения при изменении состояния
- "Rendered more hooks..." error
- Белый экран у пользователя

---

## 📊 СТАТУС ИСПРАВЛЕНИЙ

- [x] FTS5 SQL injection (дефисы) — **ИСПРАВЛЕНО**
- [x] Auto-live search при пустом кэше — **ДОБАВЛЕНО**
- [ ] React Hooks order violation — **ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ**
- [ ] E2E тесты через Playwright — **НЕВОЗМОЖНО** (проблемы окружения)

---

## 🚨 СЛЕДУЮЩИЙ ШАГ

**НЕМЕДЛЕННО ИСПРАВИТЬ** `ResultsClient.tsx` — переместить ранний возврат после всех хуков.

Без этого приложение НЕ РАБОТАЕТ в браузере (React выбросит exception).
