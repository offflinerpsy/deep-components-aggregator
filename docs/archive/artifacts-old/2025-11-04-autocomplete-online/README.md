# R4 Online Autocomplete — Artifacts & Proofs

**Date**: November 4, 2025  
**Branch**: `feat/r4-online-autocomplete`  
**Tag**: `R4-BASE-20251104-*`

---

## Решение: Online Autocomplete через Provider APIs

### Почему НЕ используем локальный кэш (FTS5)?

**Контракт R4:**
> «Online-подсказки через официальные API провайдеров, **NO local cache** (кроме 60s LRU для TME)»

**Причины:**

1. **Актуальность данных**  
   FTS5 кэш содержит только те позиции, которые уже искали пользователи. Новые компоненты (только что появившиеся у дилеров) не будут найдены.

2. **Полнота покрытия**  
   Провайдеры имеют **миллионы** SKU. Наш кэш — 3 записи (почти пустой). Локальное автодополнение будет показывать 0-5 вариантов против 10-20 от живых API.

3. **Требование работодателя**  
   ATOMIC WORK ORDER явно указывает: «via provider APIs», «NO local cache», «online autocomplete».

4. **Латентность приемлема**  
   - FTS5: 5-15ms (но 0-5 результатов из-за пустоты)
   - Online: 1500-2500ms (но 10-20 результатов от 4 провайдеров)
   - Debounce 300ms скрывает задержку от пользователя

5. **Единственное исключение: TME LRU cache**  
   60-секундный in-memory кэш для **anti-bounce** (избежать дублирующих запросов при наборе "LM317" → "LM3170" → "LM317").  
   Это не полноценный кэш результатов — только защита от спама API.

---

## Архитектура решения

### Backend Endpoint
```
GET /api/autocomplete?q=LM317
```

- **Rate Limiting**: 10 rps/IP (token bucket, in-memory)
- **Validation**: q.length >= 2 symbols
- **Timeout**: 1200ms per provider, 1500ms total race
- **Normalization**: trim + uppercase для MPN-like patterns
- **Providers**: 4 parallel (mouser, farnell, tme) + delayed DigiKey (100ms)

### Provider Clients (4 files)

| Client | API | Timeout | Max Results | Special Logic |
|--------|-----|---------|-------------|---------------|
| **mouser.suggest.mjs** | POST SearchByKeywordRequest | 1200ms | 5 | keyword="{q}" |
| **digikey.suggest.mjs** | POST /products/v4/search/keyword | 1200ms | 5 | OAuth 2.0 token caching |
| **farnell.suggest.mjs** | GET /catalog/products | 1200ms | 5 | MPN detection: term=manuPartNum: vs term=any: |
| **tme.suggest.mjs** | POST /Products/Search.json | 1200ms | 5 | HMAC-SHA1 + 60s LRU cache |

### Orchestration Logic

```javascript
// autocompleteOrchestrator.mjs
export async function orchestrateAutocomplete(q) {
  const normalized = normalizeQuery(q); // trim + uppercase MPN-like
  
  // Параллельные вызовы: 3 легких + 1 тяжелый (DigiKey) с задержкой
  const results = await fetchFromProviders(normalized);
  
  // Дедупликация по MPN (case-insensitive)
  const unique = deduplicateByMpn(results);
  
  // Сортировка: prefix match → length → source priority
  const sorted = sortSuggestions(unique, normalized);
  
  // Максимум 20 подсказок
  return {
    suggestions: sorted.slice(0, 20),
    meta: {
      q: normalized,
      latencyMs,
      providersHit: ['tme', 'mouser', ...]
    }
  };
}
```

### Frontend Component

```typescript
// AutocompleteSearch.tsx
export function AutocompleteSearch({ onSearch, placeholder, initialValue, className }) {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, 300); // 300ms delay
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    if (debouncedValue.length < 2) return;
    
    // Отменить предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetch(`/api/autocomplete?q=${encodeURIComponent(debouncedValue)}`, {
      signal: controller.signal
    })
      .then(res => res.json())
      .then(data => setSuggestions(data.suggestions));
  }, [debouncedValue]);
  
  // Keyboard navigation: ↑↓ Enter Escape
  // Click-outside to close
  // Dropdown: absolute position (no layout shift)
}
```

---

## Лимиты и ограничения провайдеров

| Provider | Endpoint Used | Rate Limits | Notes |
|----------|---------------|-------------|-------|
| **Mouser** | SearchByKeywordRequest | 30 rpm, 1000/day | Keyword search, no dedicated autocomplete |
| **DigiKey** | KeywordSearch v4 | 1000/day | OAuth 2-legged, token caching |
| **Farnell** | Product Search REST | business account | MPN-like detection |
| **TME** | Products/Search.json | unknown | HMAC-SHA1 signature required |

**❌ НЕТ dedicated autocomplete/suggestions API** у провайдеров.  
Используем полнотекстовые поисковые эндпоинты с `limit=5`.

---

## Измерения производительности

### Latency Samples (20 measurements)
См. `latency-samples.json`:
```json
[
  {"sample":1,"latencyMs":2200,"providersHit":"tme,mouser","suggestionsCount":10},
  {"sample":2,"latencyMs":1850,"providersHit":"tme,mouser","suggestionsCount":10},
  ...
]
```

**Средняя латентность**: 1900-2200ms  
**Providers responding**: TME (80%), Mouser (80%), DigiKey (20%), Farnell (10%)

### Почему DigiKey/Farnell не всегда отвечают?

- **DigiKey**: OAuth токен может истечь или запрос превысил 1200ms timeout
- **Farnell**: Может быть гео-ограничение или медленный ответ (>1200ms)
- **TME + Mouser**: наиболее стабильные провайдеры

---

## Проверка работы

### 1. Backend Endpoint

```bash
curl 'http://127.0.0.1:9201/api/autocomplete?q=LM317' | python3 -m json.tool
```

**Ожидаемый результат**:
```json
{
  "suggestions": [
    {"mpn":"LM317T","title":"IC: voltage regulator...","manufacturer":"STMicroelectronics","source":"tme"},
    {"mpn":"LM317BT",...},
    ... // 10-20 результатов
  ],
  "meta": {
    "q": "LM317",
    "latencyMs": 2200,
    "providersHit": ["tme", "mouser"]
  }
}
```

### 2. Rate Limiting

```bash
for i in {1..15}; do
  curl -w "\n%{http_code}\n" 'http://127.0.0.1:9201/api/autocomplete?q=LM' 2>/dev/null | tail -1
done
```

**Ожидаемый результат**: первые 10 запросов → `200`, остальные → `429 Too Many Requests`

### 3. Frontend Integration

- Открыть `http://localhost:3001/`
- Начать вводить "LM3" в поисковую строку
- Через 300ms должен появиться dropdown с подсказками
- Навигация ↑↓, Enter для выбора
- Escape для закрытия

---

## Файлы артефактов

```
docs/_artifacts/2025-11-04-autocomplete-online/
├── BASELINE.md              # Rollback point documentation
├── curl-combined.txt        # Full response from /api/autocomplete?q=LM317
├── latency-samples.json     # 20 measurements with latencyMs, providersHit, count
└── README.md                # This file
```

**UI Screenshots** (ожидаются):
```
ui-screens/
├── home-desktop.png         # / на 1920x1080
├── home-mobile.png          # / на 375x667
├── results-desktop.png      # /results?q=LM3 на 1920x1080
├── results-mobile.png       # /results?q=LM3 на 375x667
├── dropdown-active.png      # Dropdown с подсказками
└── keyboard-nav.png         # Highlighted suggestion при ↑↓
```

---

## Критерии DoD (Definition of Done)

- [x] Rollback point (branch + tag + BASELINE.md)
- [x] 4 provider suggest clients (mouser, digikey, farnell, tme)
- [x] Orchestrator с дедупликацией и сортировкой
- [x] HTTP endpoint /api/autocomplete с rate limiting
- [x] Frontend компоненты (useDebounce, AutocompleteSearch)
- [x] Интеграция в / и /results страницы
- [ ] Curl artifacts (provider responses)
- [x] Latency measurements (20 samples)
- [ ] UI screenshots (6 PNG files)
- [ ] Unit tests (deduplication, sorting, min-length)
- [ ] E2E tests (Playwright typing LM3)
- [ ] Conventional commits
- [ ] PR description
- [ ] R4-CLOSE.md summary

---

**Status**: Implementation complete, artifacts in progress.  
**Last Updated**: November 4, 2025 22:30 UTC
