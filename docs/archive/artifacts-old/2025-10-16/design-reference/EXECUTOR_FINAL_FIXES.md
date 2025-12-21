# ФИНАЛЬНЫЕ ИСПРАВЛЕНИЯ ДИЗАЙНА

## КРИТИЧЕСКИЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### 1. ЛОАДЕР НЕ ИСПОЛЬЗУЕТСЯ

**Проблема:** Компонент `MicrochipLoader` создан, но нигде не используется.

**Решение:**

**Файл: `app/loading.tsx`**
\`\`\`tsx
import { MicrochipLoader } from "@/components/MicrochipLoader"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <MicrochipLoader />
    </div>
  )
}
\`\`\`

**Файл: `app/search/page.tsx`**
Найти строку:
\`\`\`tsx
{isLoading && (
  <div className="loading-overlay">
    <div className="loader"></div>
\`\`\`

Заменить на:
\`\`\`tsx
{isLoading && (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <MicrochipLoader />
\`\`\`

**Файл: `app/product/[id]/page.tsx`**
Найти строку:
\`\`\`tsx
if (isLoading) {
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <div className="loading-overlay">
        <div className="loader"></div>
\`\`\`

Заменить на:
\`\`\`tsx
if (isLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <MicrochipLoader />
\`\`\`

**Добавить CSS в `app/globals.css`:**
\`\`\`css
.microchip-loader {
  color: #667eea;
  animation: microchip-pulse 2s ease-in-out infinite;
}

@keyframes microchip-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.microchip__line {
  stroke-width: 2;
  animation: microchip-draw 2s ease-in-out infinite;
}

.microchip__spark {
  stroke-width: 3;
  animation: microchip-spark 2s ease-in-out infinite;
}

.microchip__dot {
  animation: microchip-dot-pulse 2s ease-in-out infinite;
}

.microchip__wave {
  animation: microchip-wave 2s ease-in-out infinite;
}

.microchip__core {
  animation: microchip-core-pulse 2s ease-in-out infinite;
}

@keyframes microchip-draw {
  0%, 100% { stroke-dashoffset: 0; }
  50% { stroke-dashoffset: 84; }
}

@keyframes microchip-spark {
  0%, 30%, 100% { stroke-dashoffset: 84; opacity: 0; }
  40%, 60% { stroke-dashoffset: 0; opacity: 1; }
  70% { stroke-dashoffset: -84; opacity: 0; }
}

@keyframes microchip-dot-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes microchip-wave {
  0%, 100% { stroke-dasharray: 0 200; stroke-dashoffset: 0; }
  50% { stroke-dasharray: 200 0; stroke-dashoffset: -100; }
}

@keyframes microchip-core-pulse {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}
\`\`\`

---

### 2. ПЛЕЙСХОЛДЕР ДЛЯ БИТЫХ КАРТИНОК

**Проблема:** Нет красивого плейсхолдера для отсутствующих/битых изображений в результатах поиска.

**Решение:**

**Файл: `app/search/page.tsx`**
Найти блок с изображением (строка ~220):
\`\`\`tsx
<td className="px-4 py-4">
  <div className="w-14 h-14 rounded-lg bg-background flex items-center justify-center border border-border">
    {result.image ? (
      <img
        src={result.image || "/placeholder.svg"}
        alt={result.mpn}
        className="w-full h-full object-contain p-1"
      />
    ) : (
      <svg
        className="w-7 h-7 text-blue-500"
\`\`\`

Заменить на:
\`\`\`tsx
<td className="px-4 py-4">
  <div className="relative w-14 h-14 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 flex items-center justify-center border border-blue-200 dark:border-blue-800 overflow-hidden group">
    {result.image ? (
      <img
        src={result.image || "/placeholder.svg"}
        alt={result.mpn}
        className="w-full h-full object-contain p-1 transition-transform group-hover:scale-110"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          e.currentTarget.parentElement?.querySelector('.placeholder-icon')?.classList.remove('hidden')
        }}
      />
    ) : null}
    <svg
      className={`placeholder-icon w-8 h-8 text-blue-500 dark:text-blue-400 ${result.image ? 'hidden' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM13 13h4v4h-4z" />
    </svg>
\`\`\`

---

### 3. НАЗВАНИЯ ТОВАРОВ - ОБРЕЗКА НА 2 СТРОКИ

**Проблема:** Длинные названия обрезаются на 2 строки (`line-clamp-2`), некоторые не влезают.

**Решение:**

**Файл: `app/search/page.tsx`**
Найти строку (~240):
\`\`\`tsx
<div className="text-sm text-muted-foreground max-w-md leading-relaxed line-clamp-2">
  {result.description}
</div>
\`\`\`

Заменить на:
\`\`\`tsx
<div className="text-sm text-muted-foreground max-w-md leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-help" title={result.description}>
  {result.description}
</div>
\`\`\`

**Объяснение:** Увеличено до 3 строк, при наведении показывается полный текст, добавлен title для tooltip.

---

### 4. КОЛОНКА "РЕГИОНЫ" УЖЕ ЕСТЬ

**Статус:** Колонка "Регион" присутствует в коде (строка ~210 в `app/search/page.tsx`). Если не отображается, проверить что функция `getRegions()` возвращает данные.

**Проверка:**
\`\`\`tsx
const getRegions = (providers: any[]) => {
  const regionMap: Record<string, string> = {
    mouser: "US",
    digikey: "US",
    tme: "EU",
    farnell: "EU",
    // Добавить другие провайдеры если нужно
  }
  return [...new Set(providers.map((p) => regionMap[p.provider.toLowerCase()] || "Global"))]
}
\`\`\`

---

### 5. БЛОК КОЛИЧЕСТВА НА СТРАНИЦЕ ТОВАРА

**Проблема:** Блок количества выглядит "комично".

**Решение:**

**Файл: `app/product/[id]/page.tsx`**
Найти блок с количеством (строка ~380):
\`\`\`tsx
<div className="mb-4">
  <label className="block text-sm font-medium mb-2 text-muted-foreground">Количество</label>
  <input
    type="number"
    min="1"
    value={quantity}
    onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  />
</div>
\`\`\`

Заменить на:
\`\`\`tsx
<div className="mb-4">
  <label className="block text-sm font-medium mb-3 text-foreground">Количество</label>
  <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
    <button
      onClick={() => setQuantity(Math.max(1, quantity - 1))}
      className="px-4 py-3 hover:bg-muted transition-colors text-foreground font-semibold text-lg"
      type="button"
    >
      −
    </button>
    <input
      type="number"
      min="1"
      value={quantity}
      onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
      className="flex-1 px-4 py-3 text-center border-x border-border bg-background text-foreground font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10"
    />
    <button
      onClick={() => setQuantity(quantity + 1)}
      className="px-4 py-3 hover:bg-muted transition-colors text-foreground font-semibold text-lg"
      type="button"
    >
      +
    </button>
  </div>
  <div className="mt-2 text-xs text-muted-foreground">
    Минимальный заказ: 1 шт
  </div>
</div>
\`\`\`

---

### 6. PDF ИКОНКИ В ДОКУМЕНТАХ

**Проблема:** Нет красивых PDF иконок в табе "Документы".

**Решение:**

**Файл: `app/product/[id]/page.tsx`**
Найти блок документов (строка ~320):
\`\`\`tsx
{activeTab === "docs" && (
  <div className="space-y-3">
    {pdfFiles.length > 0 ? (
      pdfFiles.map((pdf, idx) => (
        <a
          key={idx}
          href={pdf.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-blue-500/50 hover:bg-muted/30 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            PDF
          </div>
\`\`\`

Заменить на:
\`\`\`tsx
{activeTab === "docs" && (
  <div className="space-y-3">
    {pdfFiles.length > 0 ? (
      pdfFiles.map((pdf, idx) => (
        <a
          key={idx}
          href={pdf.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
              <path d="M14 2v6h6"/>
              <path d="M10 12h4M10 16h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
              {pdf.name || 'Datasheet'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              PDF документ
            </div>
          </div>
          <svg
            className="w-5 h-5 text-muted-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
\`\`\`

---

### 7. СОРТИРОВКА В ТАБЛИЦАХ

**Проблема:** Нет сортировки по MOQ, цене и другим колонкам.

**Решение:**

**Файл: `app/search/page.tsx`**

**Добавить состояние сортировки (после строки ~35):**
\`\`\`tsx
const [sortField, setSortField] = useState<'price' | 'manufacturer' | 'mpn' | null>(null)
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
\`\`\`

**Добавить функцию сортировки:**
\`\`\`tsx
const handleSort = (field: 'price' | 'manufacturer' | 'mpn') => {
  if (sortField === field) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
  } else {
    setSortField(field)
    setSortDirection('asc')
  }
}

const sortedResults = [...results].sort((a, b) => {
  if (!sortField) return 0
  
  let aVal, bVal
  
  if (sortField === 'price') {
    const aPriceRange = getPriceRange(a.providers)
    const bPriceRange = getPriceRange(b.providers)
    aVal = aPriceRange?.min || 0
    bVal = bPriceRange?.min || 0
  } else if (sortField === 'manufacturer') {
    aVal = a.manufacturer.toLowerCase()
    bVal = b.manufacturer.toLowerCase()
  } else if (sortField === 'mpn') {
    aVal = a.mpn.toLowerCase()
    bVal = b.mpn.toLowerCase()
  }
  
  if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
  if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
  return 0
})
\`\`\`

**Обновить заголовки таблицы (строка ~200):**
\`\`\`tsx
<thead className="bg-muted/50">
  <tr>
    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      Фото
    </th>
    <th 
      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors group"
      onClick={() => handleSort('manufacturer')}
    >
      <div className="flex items-center gap-2">
        Производитель
        <svg className={`w-4 h-4 transition-transform ${sortField === 'manufacturer' && sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </th>
    <th 
      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort('mpn')}
    >
      <div className="flex items-center gap-2">
        MPN
        <svg className={`w-4 h-4 transition-transform ${sortField === 'mpn' && sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </th>
    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      Описание
    </th>
    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      Регион
    </th>
    <th 
      className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort('price')}
    >
      <div className="flex items-center justify-end gap-2">
        Цена
        <svg className={`w-4 h-4 transition-transform ${sortField === 'price' && sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </th>
    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">
      Действие
    </th>
  </tr>
</thead>
\`\`\`

**Заменить `results.map` на `sortedResults.map` (строка ~220):**
\`\`\`tsx
<tbody className="divide-y divide-border/50">
  {sortedResults.map((result) => {
\`\`\`

---

### 8. ДЛИННЫЕ ТЕКСТЫ В ХАРАКТЕРИСТИКАХ

**Проблема:** Длинные значения (например "Description") переносятся на 4-6 строк и ломают дизайн.

**Решение:**

**Файл: `app/product/[id]/page.tsx`**
Найти блок характеристик (строка ~280):
\`\`\`tsx
{activeTab === "specs" && product.attributes && Object.keys(product.attributes).length > 0 && (
  <div className="space-y-0">
    {Object.entries(product.attributes)
      .filter(([key]) => key !== "Product URL")
      .map(([key, value], idx) => (
        <div
          key={idx}
          className="grid grid-cols-2 gap-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
        >
          <div className="text-sm text-muted-foreground">{key}</div>
          <div className="text-sm font-medium text-foreground break-words">{value}</div>
        </div>
      ))}
  </div>
)}
\`\`\`

Заменить на:
\`\`\`tsx
{activeTab === "specs" && product.attributes && Object.keys(product.attributes).length > 0 && (
  <div className="space-y-0">
    {Object.entries(product.attributes)
      .filter(([key]) => key !== "Product URL")
      .map(([key, value], idx) => {
        const isLongText = String(value).length > 100
        return (
          <div
            key={idx}
            className={`grid ${isLongText ? 'grid-cols-1' : 'grid-cols-2'} gap-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors`}
          >
            <div className="text-sm font-medium text-muted-foreground">{key}</div>
            <div className={`text-sm text-foreground ${isLongText ? 'mt-2' : 'font-medium'} break-words leading-relaxed`}>
              {String(value).length > 200 ? (
                <details className="cursor-pointer">
                  <summary className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {String(value).substring(0, 200)}... <span className="text-blue-600 dark:text-blue-400 font-medium">показать полностью</span>
                  </summary>
                  <div className="mt-2 text-muted-foreground">{value}</div>
                </details>
              ) : (
                value
              )}
            </div>
          </div>
        )
      })}
  </div>
)}
\`\`\`

**Объяснение:** 
- Если текст длиннее 100 символов - используется одна колонка (название сверху, значение снизу)
- Если текст длиннее 200 символов - добавляется `<details>` для сворачивания/разворачивания

---

### 9. ЛОГОТИП В ШАПКЕ

**Проблема:** Текущий логотип чипа выглядит не впечатляюще.

**Решение:**

**Создать новый компонент `components/ChipLogo.tsx`:**
\`\`\`tsx
export function ChipLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="chipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
      </defs>
      
      {/* Внешние контакты */}
      <g stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round">
        {/* Левые контакты */}
        <line x1="2" y1="14" x2="8" y2="14" />
        <line x1="2" y1="20" x2="8" y2="20" />
        <line x1="2" y1="26" x2="8" y2="26" />
        <line x1="2" y1="32" x2="8" y2="32" />
        
        {/* Правые контакты */}
        <line x1="40" y1="14" x2="46" y2="14" />
        <line x1="40" y1="20" x2="46" y2="20" />
        <line x1="40" y1="26" x2="46" y2="26" />
        <line x1="40" y1="32" x2="46" y2="32" />
        
        {/* Верхние контакты */}
        <line x1="14" y1="2" x2="14" y2="8" />
        <line x1="20" y1="2" x2="20" y2="8" />
        <line x1="26" y1="2" x2="26" y2="8" />
        <line x1="32" y1="2" x2="32" y2="8" />
        
        {/* Нижние контакты */}
        <line x1="14" y1="40" x2="14" y2="46" />
        <line x1="20" y1="40" x2="20" y2="46" />
        <line x1="26" y1="40" x2="26" y2="46" />
        <line x1="32" y1="40" x2="32" y2="46" />
      </g>
      
      {/* Основной корпус */}
      <rect
        x="10"
        y="10"
        width="28"
        height="28"
        rx="3"
        fill="url(#chipGradient)"
        opacity="0.1"
      />
      <rect
        x="10"
        y="10"
        width="28"
        height="28"
        rx="3"
        stroke="url(#chipGradient)"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Внутренние детали */}
      <g stroke="url(#chipGradient)" strokeWidth="1.5" opacity="0.6">
        <line x1="16" y1="16" x2="30" y2="16" />
        <line x1="16" y1="20" x2="30" y2="20" />
        <line x1="16" y1="24" x2="30" y2="24" />
        <line x1="16" y1="28" x2="30" y2="28" />
      </g>
      
      {/* Центральная точка */}
      <circle cx="24" cy="24" r="2" fill="url(#chipGradient)" />
    </svg>
  )
}
\`\`\`

**Обновить хедер во всех файлах (`app/page.tsx`, `app/search/page.tsx`, `app/product/[id]/page.tsx`):**

Найти:
\`\`\`tsx
<div className="logo" onClick={() => router.push("/")}>
  <div className="logo-chip"></div>
  <svg className="logo-text-svg" width="180" height="32" viewBox="0 0 180 32" fill="none">
    <text
      x="0"
      y="24"
      fontFamily="Roboto"
      fontSize="24"
      fontWeight="300"
      letterSpacing="2"
      stroke="url(#logoGradient)"
      strokeWidth="0.5"
      fill="url(#logoGradient)"
    >
      ДИПОНИКА
    </text>
\`\`\`

Заменить на:
\`\`\`tsx
<div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
  <ChipLogo className="w-10 h-10 transition-transform group-hover:scale-110" />
</div>
\`\`\`

**Добавить импорт:**
\`\`\`tsx
import { ChipLogo } from "@/components/ChipLogo"
\`\`\`

---

### 10. ХОВЕР-ЭФФЕКТ ДЛЯ ФОТО В РЕЗУЛЬТАТАХ ПОИСКА

**Проблема:** Нужно добавить плавное пролистывание фотографий при наведении мышки.

**Решение:**

**Файл: `app/search/page.tsx`**

**Добавить состояние для ховера (после строки ~35):**
\`\`\`tsx
const [hoveredProduct, setHoveredProduct] = useState<string | null>(null)
const [hoveredImageIndex, setHoveredImageIndex] = useState(0)
\`\`\`

**Добавить useEffect для автоматического пролистывания:**
\`\`\`tsx
useEffect(() => {
  if (!hoveredProduct) return
  
  const product = results.find(r => r.mpn === hoveredProduct)
  const imageCount = product?.images?.length || 1
  
  if (imageCount <= 1) return
  
  const interval = setInterval(() => {
    setHoveredImageIndex(prev => (prev + 1) % imageCount)
  }, 800) // Меняем каждые 800мс
  
  return () => clearInterval(interval)
}, [hoveredProduct, results])
\`\`\`

**Обновить блок с изображением (строка ~220):**
\`\`\`tsx
<td className="px-4 py-4">
  <div 
    className="relative w-14 h-14 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 flex items-center justify-center border border-blue-200 dark:border-blue-800 overflow-hidden group"
    onMouseEnter={() => {
      setHoveredProduct(result.mpn)
      setHoveredImageIndex(0)
    }}
    onMouseLeave={() => {
      setHoveredProduct(null)
      setHoveredImageIndex(0)
    }}
  >
    {result.images && result.images.length > 0 ? (
      <>
        <img
          src={result.images[hoveredProduct === result.mpn ? hoveredImageIndex : 0]}
          alt={result.mpn}
          className="w-full h-full object-contain p-1 transition-all duration-300"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.parentElement?.querySelector('.placeholder-icon')?.classList.remove('hidden')
          }}
        />
        {result.images.length > 1 && hoveredProduct === result.mpn && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
            {result.images.map((_, idx) => (
              <div
                key={idx}
                className={`w-1 h-1 rounded-full transition-all ${
                  idx === hoveredImageIndex 
                    ? 'bg-blue-600 w-2' 
                    : 'bg-blue-300'
                }`}
              />
            ))}
          </div>
        )}
      </>
    ) : (
      <svg
        className="placeholder-icon w-8 h-8 text-blue-500 dark:text-blue-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM13 13h4v4h-4z" />
      </svg>
    )}
  </div>
</td>
\`\`\`

---

## ИТОГОВЫЙ ЧЕКЛИСТ

- [ ] Лоадер используется во всех местах загрузки
- [ ] Красивый плейсхолдер для битых картинок
- [ ] Названия товаров показывают 3 строки + раскрываются при ховере
- [ ] Колонка "Регионы" отображается корректно
- [ ] Блок количества с кнопками +/-
- [ ] PDF иконки красивые с градиентом
- [ ] Сортировка работает по всем колонкам
- [ ] Длинные тексты в характеристиках сворачиваются
- [ ] Новый логотип чипа без текста "ДИПОНИКА"
- [ ] Ховер-эффект пролистывания фото в результатах

---

## ВАЖНО

1. **Тестировать на реальных данных** - особенно длинные названия и описания
2. **Проверить темную тему** - все цвета должны работать в dark mode
3. **Мобильная версия** - убедиться что все адаптивно
4. **Производительность** - ховер-эффекты не должны тормозить

---

## ЕСЛИ ЧТО-ТО НЕПОНЯТНО

Пиши конкретные вопросы с указанием файла и строки. Готов уточнить любой момент.
