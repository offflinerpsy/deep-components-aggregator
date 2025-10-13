# ДЕТАЛЬНЫЙ ПЛАН ИСПРАВЛЕНИЙ

**Дата**: 12 октября 2025  
**Контекст**: Rewrites работают, бэк возвращает данные, но фронт использует моки  

---

## 🔍 ЧТО КОНКРЕТНО ЗАБЫЛИ УБРАТЬ

### Файл 1: `app/page.tsx` (главная страница)

**Строки 188-215**: Захардкожен массив из 28 компонентов

```tsx
const components = [
  { id: "LM317T", mpn: "LM317T", category: "Power Circuits", icon: ChipIcon },
  { id: "M83513/19-E01NW", mpn: "M83513/19-E01NW", category: "Connectors", icon: ConnectorIcon },
  { id: "500C122T250BA2B", mpn: "500C122T250BA2B", category: "Capacitors", icon: CapacitorIcon },
  // ... ещё 25 компонентов
]
```

**Проблема**:
- ❌ Это **статичные данные** из v0-прототипа
- ❌ **Нет fetch** к `/api/vitrine/list`
- ❌ Пользователь видит одни и те же 28 компонентов
- ✅ Backend имеет **826 реальных компонентов** в кэше

**Что нужно**:
- Добавить `useState` для хранения списка
- Добавить `useEffect` с fetch к `/api/vitrine/list?limit=28`
- Маппить данные из API в формат `{ id, mpn, category, icon }`

---

### Файл 2: `app/search/page.tsx` (страница поиска)

**Статус**: ✅ **УЖЕ ИСПРАВЛЕН!**

При внимательном чтении я вижу что этот файл **уже подключён к API**:

```tsx
const performSearch = (searchQuery: string) => {
  const eventSource = new EventSource(`/api/live/search?q=${encodeURIComponent(searchQuery)}`)
  
  eventSource.addEventListener('result', (e) => {
    const data = JSON.parse(e.data)
    setResults(data.rows || [])  // ✅ ИСПОЛЬЗУЕТ ДАННЫЕ ИЗ API!
  })
}
```

**Вывод**: Этот файл работает через SSE, реальные данные получает. **Не требует исправлений**.

---

### Файл 3: `app/product/[mpn]/page.tsx` (карточка товара)

**Строка 84-98**: Fetch **ЕСТЬ**, но данные **частично используются**

```tsx
fetch(`/api/product?mpn=${encodeURIComponent(mpn)}`)
  .then(r => r.ok ? r.json() : Promise.resolve({ ok: false }))
  .then((data) => {
    if (!data?.ok) { setError('Продукт не найден'); return }
    setProduct(data.product)  // ✅ Сохраняет в стейт
    // ...
    setOffers(derived)
    // Set first image
    if (data.product.images && data.product.images.length > 0) {
      setSelectedImage(data.product.images[0])  // ✅ Использует images из API
    }
  })
```

**Что работает**:
- ✅ Fetch выполняется
- ✅ `product` сохраняется в стейт
- ✅ Изображения берутся из API
- ✅ Offers вычисляются из pricing

**Проблема**: **НЕТ!** При чтении строк 150-300 я вижу что:

```tsx
// Строка 187: использует selectedImage из стейта
{selectedImage ? (
  <img src={`/api/image?url=${encodeURIComponent(selectedImage)}`} alt={product.title} />
) : (
  <svg>...</svg>  // placeholder
)}

// Строка 220: использует product.images из стейта
{product.images && product.images.length > 1 && (
  <div className="grid grid-cols-4 gap-2">
    {product.images.slice(0, 4).map((img, idx) => (
      <button onClick={() => setSelectedImage(img)}>
        <img src={`/api/image?url=${encodeURIComponent(img)}`} />
      </button>
    ))}
  </div>
)}

// Строка 241: использует product.mpn, manufacturer, title из стейта
<h1 className="text-3xl font-mono text-blue-400 mb-2">{product.mpn}</h1>
<h2 className="text-xl text-muted-foreground mb-2">{product.manufacturer}</h2>
<h3 className="text-lg mb-4">{product.title}</h3>

// Строка 249: использует product.description из стейта
{product.description && (
  <div className="mb-6">
    <div className={`text-muted-foreground ${isExpanded ? '' : 'max-h-40'}`}>
      {product.description}
    </div>
  </div>
)}

// Строка 263: использует product.pricing из стейта
{Array.isArray(product.pricing) && product.pricing.length > 0 && (
  <div className="text-lg font-semibold mb-4">
    {(() => {
      const mins = product.pricing.map(p => Number(p.price_rub || p.price || 0)).filter(n => n > 0)
      const min = mins.length ? Math.min(...mins) : 0
      return min ? `Цена от ${min.toLocaleString('ru-RU')}₽` : ''
    })()}
  </div>
)}
```

**Вывод**: **Файл РАБОТАЕТ!** Все данные берутся из стейта `product`, который заполняется через fetch.

---

## ✅ ИТОГОВЫЙ ВЕРДИКТ

| Файл | Статус | Проблема | Решение |
|------|--------|----------|---------|
| `app/page.tsx` | ❌ **НЕ РАБОТАЕТ** | Захардкожен массив из 28 компонентов | Добавить fetch к `/api/vitrine/list` |
| `app/search/page.tsx` | ✅ **РАБОТАЕТ** | Нет проблемы (SSE подключён) | Не требует изменений |
| `app/product/[mpn]/page.tsx` | ✅ **РАБОТАЕТ** | Нет проблемы (fetch + рендер работают) | Не требует изменений |

---

## 🛠️ ЧТО КОНКРЕТНО Я БУДУ ДЕЛАТЬ

### Исправление #1: Главная страница (`app/page.tsx`)

**Шаг 1**: Добавить стейт для компонентов

```tsx
// БЫЛО (строка 176):
const [mounted, setMounted] = useState(false)

// СТАНЕТ:
const [mounted, setMounted] = useState(false)
const [components, setComponents] = useState<any[]>([])  // ← ДОБАВИТЬ
const [isLoadingComponents, setIsLoadingComponents] = useState(true)  // ← ДОБАВИТЬ
```

**Шаг 2**: Добавить useEffect для загрузки данных

```tsx
// ПОСЛЕ строки 183 (после useEffect для apiStatus):
useEffect(() => {
  setIsLoadingComponents(true)
  fetch('/api/vitrine/list?limit=28')
    .then(r => r.ok ? r.json() : Promise.resolve({ ok: false }))
    .then(data => {
      if (!data?.ok || !data.rows) {
        setComponents([])  // Fallback на пустой массив
        return
      }
      
      // Маппинг данных API в формат для карточек
      const mapped = data.rows.map((row: any) => ({
        id: row.mpn,
        mpn: row.mpn,
        category: row.title || row.description_short || 'Компонент',
        icon: getIconForCategory(row.title)  // Функция для выбора иконки
      }))
      
      setComponents(mapped)
    })
    .catch(() => setComponents([]))
    .finally(() => setIsLoadingComponents(false))
}, [])
```

**Шаг 3**: Добавить функцию для определения иконки

```tsx
// ПОСЛЕ строки 151 (после определения всех Icon компонентов):
const getIconForCategory = (title: string): React.ComponentType => {
  if (!title) return ChipIcon
  
  const lower = title.toLowerCase()
  
  if (lower.includes('connector') || lower.includes('d-sub')) return ConnectorIcon
  if (lower.includes('capacitor')) return CapacitorIcon
  if (lower.includes('resistor')) return ResistorIcon
  if (lower.includes('transistor') || lower.includes('mosfet')) return TransistorIcon
  if (lower.includes('diode')) return DiodeIcon
  if (lower.includes('switch')) return SwitchIcon
  if (lower.includes('memory') || lower.includes('flash')) return MemoryIcon
  if (lower.includes('regulator') || lower.includes('voltage')) return ChipIcon
  
  return ChipIcon  // Default
}
```

**Шаг 4**: УДАЛИТЬ захардкоженный массив

```tsx
// УДАЛИТЬ строки 188-215:
const components = [
  { id: "LM317T", mpn: "LM317T", category: "Power Circuits", icon: ChipIcon },
  // ... весь массив
]
```

**Шаг 5**: Добавить Loading State в UI

```tsx
// ПОСЛЕ строки 237 (после заголовка "ЧТО ИЩУТ ЛЮДИ"):
{isLoadingComponents ? (
  <div className="text-center py-12">
    <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-muted-foreground">Загрузка компонентов...</p>
  </div>
) : components.length === 0 ? (
  <div className="text-center py-12">
    <p className="text-muted-foreground">Компоненты не найдены</p>
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {components.map((component, index) => {
      const IconComponent = component.icon
      return (
        <Link
          key={`${component.id}-${index}`}
          href={`/results?q=${encodeURIComponent(component.mpn)}`}
          className="component-card cursor-pointer hover:scale-105 transition-all duration-300 block"
          style={{ animationDelay: `${0.8 + index * 0.02}s` }}
        >
          <div className="component-icon">
            <IconComponent />
          </div>
          <div className="component-info">
            <div className="component-id">{component.id}</div>
            <div className="component-category">Part Category: {component.category}</div>
          </div>
        </Link>
      )
    })}
  </div>
)}
```

---

## 📊 ИТОГО: ФАЙЛЫ К ИЗМЕНЕНИЮ

| Файл | Изменений | Строк добавить | Строк удалить |
|------|-----------|----------------|---------------|
| `app/page.tsx` | 5 блоков | ~80 | ~28 |
| `app/search/page.tsx` | 0 | 0 | 0 |
| `app/product/[mpn]/page.tsx` | 0 | 0 | 0 |

**Всего**: 1 файл, ~80 строк нового кода, ~28 строк удалить.

---

## 🎯 ПОСЛЕ ИСПРАВЛЕНИЯ

### Что изменится для пользователя:

**БЫЛО**:
- Главная страница показывает всегда одни и те же 28 компонентов (LM317T, M83513/19-E01NW, ...)
- Компоненты прописаны в коде, не обновляются

**СТАНЕТ**:
- Главная страница показывает **реальные 28 компонентов** из кэша бэкенда (826 доступно)
- При каждой загрузке могут быть **разные** компоненты
- Если бэк добавит новые компоненты — они появятся автоматически
- Loading spinner показывается пока данные грузятся

---

## 🔧 КАК Я БУДУ ИСПРАВЛЯТЬ

1. **Читаю файл** `app/page.tsx` целиком (уже прочитан)
2. **Добавляю стейт** для components и loading (2 строки)
3. **Добавляю useEffect** с fetch к `/api/vitrine/list` (~20 строк)
4. **Добавляю функцию** getIconForCategory (~20 строк)
5. **Удаляю** захардкоженный массив components (~28 строк)
6. **Заменяю рендер** на версию с loading state (~20 строк)
7. **Тестирую** через curl что `/api/vitrine/list` работает (уже проверено ✅)
8. **Пересобираю фронт**: `npm run build` в папке v0-components-aggregator-page
9. **Перезапускаю PM2**: `pm2 restart deep-v0`
10. **Проверяю** в браузере что главная показывает реальные данные

---

## 📋 ЧЕКЛИСТ ПЕРЕД КОММИТОМ

- [ ] `app/page.tsx` имеет fetch к `/api/vitrine/list`
- [ ] Захардкоженный массив удалён
- [ ] Loading state добавлен
- [ ] Empty state добавлен (если данных нет)
- [ ] Иконки маппятся по категории компонента
- [ ] `npm run build` проходит без ошибок
- [ ] `pm2 restart deep-v0` выполнен
- [ ] Главная страница показывает реальные компоненты
- [ ] Клик по компоненту ведёт на `/results?q=MPN`
- [ ] `/results` работает через SSE (уже работает ✅)
- [ ] `/product/[mpn]` показывает карточку (уже работает ✅)

---

**Подготовлено**: GitHub Copilot в Tech Lead Mode  
**Версия**: 1.0.0  
**Готов к исполнению**: ✅ ДА
