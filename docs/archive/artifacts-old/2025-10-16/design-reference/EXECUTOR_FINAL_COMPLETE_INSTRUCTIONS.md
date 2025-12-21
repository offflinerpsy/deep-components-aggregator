# ФИНАЛЬНЫЕ ИНСТРУКЦИИ ПО ВИЗУАЛЬНЫМ ПРАВКАМ И МОБИЛЬНОЙ АДАПТАЦИИ

## ВАЖНО: СТРОГИЕ ТРЕБОВАНИЯ UI/UX

Все изменения должны соответствовать современным стандартам UI/UX:
- Pixel-perfect выравнивание
- Консистентные отступы (8px grid system)
- Плавные анимации (200-300ms)
- Адаптивный дизайн без горизонтального скролла
- Доступность (WCAG 2.1 AA)

---

## ЧЕКЛИСТ ВСЕХ ИЗМЕНЕНИЙ

### ✅ Логотип и Брендинг
- [ ] Новый градиентный логотип чипа
- [ ] Удален текст "ДИПОНИКА"
- [ ] Гамбургер-меню на мобильных

### ✅ Лоадер
- [ ] MicrochipLoader интегрирован
- [ ] Используется на всех страницах загрузки

### ✅ Страница результатов поиска
- [ ] Плейсхолдер для битых изображений
- [ ] Колонка "Фото" с hover-эффектом
- [ ] Колонка "Регионы" добавлена
- [ ] Мобильная версия (карточки вместо таблицы)
- [ ] Сортировка по цене и MOQ

### ✅ Страница товара
- [ ] Уменьшенное изображение товара
- [ ] Блок заказа справа (sticky)
- [ ] Современный блок количества
- [ ] PDF иконки для документов
- [ ] Мобильная адаптация
- [ ] Улучшенная таблица характеристик

### ✅ Общее
- [ ] Удалены все градиенты фона
- [ ] Консистентные цвета
- [ ] Адаптивная типографика

---

## 1. НОВЫЙ ЛОГОТИП ЧИПА С ГРАДИЕНТОМ

### Файл: `components/MicrochipLoader.tsx`

**Что делать:** Компонент `MicrochipLogo` уже создан и экспортирован. Убедитесь что он используется везде.

**Проверка:**
\`\`\`tsx
export function MicrochipLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="chipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      {/* Квадратный корпус чипа */}
      <rect x="25" y="25" width="50" height="50" rx="4" 
            stroke="url(#chipGradient)" strokeWidth="3" fill="none" />
      {/* Внутренний квадрат */}
      <rect x="35" y="35" width="30" height="30" rx="2" 
            stroke="url(#chipGradient)" strokeWidth="2" fill="none" />
      {/* Пины сверху */}
      <line x1="35" y1="25" x2="35" y2="15" stroke="url(#chipGradient)" strokeWidth="2" />
      <circle cx="35" cy="12" r="3" fill="url(#chipGradient)" />
      {/* ... остальные пины */}
    </svg>
  )
}
\`\`\`

---

## 2. УДАЛЕНИЕ ТЕКСТА "ДИПОНИКА" ИЗ ШАПКИ

### Файл: `app/page.tsx`

**Найти (строка ~239):**
\`\`\`tsx
<div className="logo">
  <div className="logo-chip"></div>
  <div className="logo-text">ДИПОНИКА</div>
</div>
\`\`\`

**Заменить на:**
\`\`\`tsx
<div className="cursor-pointer" onClick={() => (window.location.href = "/")}>
  <MicrochipLogo className="w-10 h-10" />
</div>
\`\`\`

**Добавить импорт (в начало файла):**
\`\`\`tsx
import { MicrochipLogo } from "@/components/MicrochipLoader"
\`\`\`

---

## 3. ГАМБУРГЕР-МЕНЮ ДЛЯ МОБИЛЬНЫХ

### Файл: `app/page.tsx`

**Найти секцию header (строка ~239):**
\`\`\`tsx
<header className="glass sticky top-0 z-50 border-b border-border bg-background">
  <div className="container mx-auto px-6 py-4 flex items-center justify-between">
\`\`\`

**Заменить на:**
\`\`\`tsx
<header className="glass sticky top-0 z-50 border-b border-border bg-background">
  <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
    {/* Логотип */}
    <div className="cursor-pointer" onClick={() => (window.location.href = "/")}>
      <MicrochipLogo className="w-10 h-10" />
    </div>

    {/* Десктоп навигация */}
    <div className="hidden md:flex items-center gap-8">
      <nav className="flex items-center gap-8">
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          Источники
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          О нас
        </button>
      </nav>
      <Button variant="ghost" size="sm" onClick={() => setIsDark(!isDark)} className="w-10 h-10 p-0">
        {isDark ? <SunIcon /> : <MoonIcon />}
      </Button>
    </div>

    {/* Мобильное меню */}
    <div className="flex md:hidden items-center gap-4">
      <Button variant="ghost" size="sm" onClick={() => setIsDark(!isDark)} className="w-10 h-10 p-0">
        {isDark ? <SunIcon /> : <MoonIcon />}
      </Button>
      <button 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="w-10 h-10 flex items-center justify-center"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  </div>

  {/* Мобильное выпадающее меню */}
  {mobileMenuOpen && (
    <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg">
      <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
        <button className="text-left py-2 text-muted-foreground hover:text-foreground transition-colors">
          Источники
        </button>
        <button className="text-left py-2 text-muted-foreground hover:text-foreground transition-colors">
          О нас
        </button>
      </nav>
    </div>
  )}
</header>
\`\`\`

**Добавить state (в начало компонента):**
\`\`\`tsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
\`\`\`

---

## 4. ИНТЕГРАЦИЯ MICROCHIPLOADER

### Файл: `app/loading.tsx`

**Заменить весь файл на:**
\`\`\`tsx
import { MicrochipLoader } from "@/components/MicrochipLoader"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <MicrochipLoader />
    </div>
  )
}
\`\`\`

### Файл: `app/product/[id]/page.tsx`

**Найти (строка ~50):**
\`\`\`tsx
if (isLoading) {
  return <div>Loading...</div>
}
\`\`\`

**Заменить на:**
\`\`\`tsx
if (isLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <MicrochipLoader />
    </div>
  )
}
\`\`\`

**Добавить импорт:**
\`\`\`tsx
import { MicrochipLoader } from "@/components/MicrochipLoader"
\`\`\`

---

## 5. СТРАНИЦА РЕЗУЛЬТАТОВ ПОИСКА - МОБИЛЬНАЯ АДАПТАЦИЯ

### Файл: `app/search/page.tsx` (или `app/results/page.tsx`)

**КРИТИЧНО:** На мобильных устройствах таблица должна превращаться в карточки!

**Создать компонент ProductCard:**
\`\`\`tsx
function ProductCard({ product }: { product: SearchResult }) {
  const [imageError, setImageError] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const images = product.images || []

  return (
    <div className="glass-card p-4 rounded-xl hover:shadow-lg transition-all">
      {/* Изображение */}
      <div className="relative w-full aspect-square mb-4 bg-muted rounded-lg overflow-hidden">
        {!imageError && images.length > 0 ? (
          <>
            <img
              src={images[currentImageIndex] || "/placeholder.svg"}
              alt={product.mpn}
              className="w-full h-full object-contain p-2"
              onError={() => setImageError(true)}
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentImageIndex ? 'bg-blue-500 w-4' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 64 64" strokeWidth="1">
              <rect x="20" y="20" width="24" height="24" rx="2" />
              <line x1="28" y1="26" x2="36" y2="26" />
              <line x1="28" y1="30" x2="36" y2="30" />
            </svg>
            <span className="text-xs">Нет фото</span>
          </div>
        )}
      </div>

      {/* Информация */}
      <div className="space-y-2">
        <div className="font-mono text-sm text-blue-600 dark:text-blue-400">
          {product.mpn}
        </div>
        <div className="text-sm font-medium text-foreground line-clamp-2">
          {product.description}
        </div>
        <div className="text-xs text-muted-foreground">
          {product.manufacturer}
        </div>
        
        {/* Регионы */}
        {product.regions && product.regions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.regions.slice(0, 3).map((region, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                {region}
              </span>
            ))}
            {product.regions.length > 3 && (
              <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                +{product.regions.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Цена и кнопка */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            ₽{product.price.toFixed(2)}
          </div>
          <button
            onClick={() => window.location.href = `/product/${encodeURIComponent(product.mpn)}`}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all"
          >
            Купить
          </button>
        </div>
      </div>
    </div>
  )
}
\`\`\`

**Заменить секцию результатов:**
\`\`\`tsx
{/* Десктоп - таблица */}
<div className="hidden md:block overflow-x-auto">
  <table className="search-results-table">
    <thead>
      <tr>
        <th>Фото</th>
        <th>Артикул</th>
        <th>Название</th>
        <th>Производитель</th>
        <th>Регионы</th>
        <th className="cursor-pointer hover:text-foreground" onClick={() => handleSort('price')}>
          Цена {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
        </th>
        <th>Действия</th>
      </tr>
    </thead>
    <tbody>
      {results.map((product, idx) => (
        <tr key={idx}>
          {/* ... таблица как раньше ... */}
        </tr>
      ))}
    </tbody>
  </table>
</div>

{/* Мобильная версия - карточки */}
<div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
  {results.map((product, idx) => (
    <ProductCard key={idx} product={product} />
  ))}
</div>
\`\`\`

---

## 6. ПЛЕЙСХОЛДЕР ДЛЯ БИТЫХ ИЗОБРАЖЕНИЙ

### В таблице результатов (десктоп):

\`\`\`tsx
<td>
  <div className="product-image">
    {!imageErrors[idx] && product.image ? (
      <img
        src={product.image || "/placeholder.svg"}
        alt={product.mpn}
        className="w-full h-full object-contain"
        onError={() => {
          setImageErrors(prev => ({ ...prev, [idx]: true }))
        }}
      />
    ) : (
      <div className="flex flex-col items-center justify-center text-muted-foreground">
        <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 64 64" strokeWidth="1">
          <rect x="20" y="20" width="24" height="24" rx="2" />
          <line x1="28" y1="26" x2="36" y2="26" />
          <line x1="28" y1="30" x2="36" y2="30" />
        </svg>
        <span className="text-xs">Нет фото</span>
      </div>
    )}
  </div>
</td>
\`\`\`

**Добавить state:**
\`\`\`tsx
const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})
\`\`\`

---

## 7. HOVER-ЭФФЕКТ ПРОЛИСТЫВАНИЯ ФОТОГРАФИЙ

### В таблице результатов:

\`\`\`tsx
<td>
  <div 
    className="product-image relative"
    onMouseEnter={() => {
      if (product.images && product.images.length > 1) {
        startImageCycle(idx)
      }
    }}
    onMouseLeave={() => stopImageCycle(idx)}
  >
    {!imageErrors[idx] && product.images && product.images.length > 0 ? (
      <img
        src={product.images[currentImageIndices[idx] || 0]}
        alt={product.mpn}
        className="w-full h-full object-contain transition-opacity duration-300"
        onError={() => setImageErrors(prev => ({ ...prev, [idx]: true }))}
      />
    ) : (
      <div className="flex flex-col items-center justify-center text-muted-foreground">
        <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 64 64" strokeWidth="1">
          <rect x="20" y="20" width="24" height="24" rx="2" />
        </svg>
        <span className="text-xs">Нет фото</span>
      </div>
    )}
    {product.images && product.images.length > 1 && (
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
        {product.images.map((_, imgIdx) => (
          <div
            key={imgIdx}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              imgIdx === (currentImageIndices[idx] || 0) 
                ? 'bg-blue-500 w-3' 
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    )}
  </div>
</td>
\`\`\`

**Добавить state и функции:**
\`\`\`tsx
const [currentImageIndices, setCurrentImageIndices] = useState<Record<number, number>>({})
const [imageIntervals, setImageIntervals] = useState<Record<number, NodeJS.Timeout>>({})

const startImageCycle = (idx: number) => {
  const product = results[idx]
  if (!product.images || product.images.length <= 1) return

  const interval = setInterval(() => {
    setCurrentImageIndices(prev => ({
      ...prev,
      [idx]: ((prev[idx] || 0) + 1) % product.images.length
    }))
  }, 800) // Плавная смена каждые 800ms

  setImageIntervals(prev => ({ ...prev, [idx]: interval }))
}

const stopImageCycle = (idx: number) => {
  if (imageIntervals[idx]) {
    clearInterval(imageIntervals[idx])
    setImageIntervals(prev => {
      const newIntervals = { ...prev }
      delete newIntervals[idx]
      return newIntervals
    })
  }
  setCurrentImageIndices(prev => ({ ...prev, [idx]: 0 }))
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    Object.values(imageIntervals).forEach(interval => clearInterval(interval))
  }
}, [imageIntervals])
\`\`\`

---

## 8. КОЛОНКА "РЕГИОНЫ" В РЕЗУЛЬТАТАХ

### В таблице результатов:

**Добавить заголовок:**
\`\`\`tsx
<thead>
  <tr>
    <th>Фото</th>
    <th>Артикул</th>
    <th>Название</th>
    <th>Производитель</th>
    <th>Регионы</th> {/* <-- НОВАЯ КОЛОНКА */}
    <th>Цена</th>
    <th>Действия</th>
  </tr>
</thead>
\`\`\`

**Добавить ячейку:**
\`\`\`tsx
<tbody>
  {results.map((product, idx) => (
    <tr key={idx}>
      <td>{/* Фото */}</td>
      <td>{/* Артикул */}</td>
      <td>{/* Название */}</td>
      <td>{/* Производитель */}</td>
      <td>
        {/* НОВАЯ КОЛОНКА РЕГИОНЫ */}
        {product.regions && product.regions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {product.regions.slice(0, 2).map((region, ridx) => (
              <span key={ridx} className="region-badge">
                {region}
              </span>
            ))}
            {product.regions.length > 2 && (
              <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                +{product.regions.length - 2}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td>{/* Цена */}</td>
      <td>{/* Действия */}</td>
    </tr>
  ))}
</tbody>
\`\`\`

---

## 9. СОРТИРОВКА ТАБЛИЦ

### Добавить state:
\`\`\`tsx
const [sortField, setSortField] = useState<'price' | 'moq' | null>(null)
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
\`\`\`

### Функция сортировки:
\`\`\`tsx
const handleSort = (field: 'price' | 'moq') => {
  if (sortField === field) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
  } else {
    setSortField(field)
    setSortDirection('asc')
  }
}

const sortedResults = useMemo(() => {
  if (!sortField) return results

  return [...results].sort((a, b) => {
    const aValue = sortField === 'price' ? a.price : a.moq
    const bValue = sortField === 'price' ? b.price : b.moq
    
    if (sortDirection === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })
}, [results, sortField, sortDirection])
\`\`\`

### Обновить заголовки таблицы:
\`\`\`tsx
<th 
  className="cursor-pointer hover:text-foreground transition-colors select-none"
  onClick={() => handleSort('price')}
>
  <div className="flex items-center gap-2">
    Цена
    {sortField === 'price' && (
      <span className="text-blue-500">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )}
  </div>
</th>
\`\`\`

---

## 10. СТРАНИЦА ТОВАРА - МОБИЛЬНАЯ АДАПТАЦИЯ

### Файл: `app/product/[id]/page.tsx`

**Заменить grid layout:**
\`\`\`tsx
<main className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-7xl">
  {/* Мобильная версия - вертикальный layout */}
  <div className="lg:hidden space-y-6">
    {/* Блок заказа СВЕРХУ на мобильных */}
    <div className="glass-card p-4 rounded-xl sticky top-20 z-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-muted-foreground">Лучшая цена</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            ₽{bestPrice.toFixed(2)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 flex items-center justify-center border border-border rounded-lg"
          >
            −
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-16 px-2 py-1 text-center border border-border rounded-lg"
          />
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-8 h-8 flex items-center justify-center border border-border rounded-lg"
          >
            +
          </button>
        </div>
      </div>
      <button
        onClick={() => setShowOrderModal(true)}
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
      >
        Добавить в заказ
      </button>
    </div>

    {/* Изображение */}
    <div className="glass-card p-4 rounded-xl">
      <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center">
        {product.image ? (
          <img src={product.image || "/placeholder.svg"} alt={product.mpn} className="w-full h-full object-contain p-4" />
        ) : (
          <div className="text-muted-foreground">Нет изображения</div>
        )}
      </div>
    </div>

    {/* Информация о товаре */}
    <div className="glass-card p-4 rounded-xl">
      <h1 className="text-xl font-semibold mb-2">{product.mpn}</h1>
      <div className="text-sm text-muted-foreground mb-4">{product.manufacturer}</div>
      <div className="text-sm leading-relaxed">{product.description}</div>
    </div>

    {/* Табы */}
    <div className="glass-card rounded-xl overflow-hidden">
      {/* ... табы как раньше ... */}
    </div>
  </div>

  {/* Десктопная версия - grid layout */}
  <div className="hidden lg:grid grid-cols-12 gap-6">
    {/* ... существующий grid layout ... */}
  </div>
</main>
\`\`\`

---

## 11. СОВРЕМЕННЫЙ БЛОК КОЛИЧЕСТВА

### Заменить input количества:

\`\`\`tsx
<div className="mb-4">
  <label className="block text-sm font-medium mb-2 text-muted-foreground">
    Количество
  </label>
  <div className="flex items-center gap-2">
    <button
      onClick={() => setQuantity(Math.max(1, quantity - 1))}
      className="w-10 h-10 flex items-center justify-center border border-border rounded-lg hover:bg-muted transition-colors active:scale-95"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    </button>
    <input
      type="number"
      min="1"
      value={quantity}
      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
      className="flex-1 px-4 py-2.5 text-center border border-border rounded-lg bg-background text-foreground font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <button
      onClick={() => setQuantity(quantity + 1)}
      className="w-10 h-10 flex items-center justify-center border border-border rounded-lg hover:bg-muted transition-colors active:scale-95"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </div>
</div>
\`\`\`

---

## 12. PDF ИКОНКИ ДЛЯ ДОКУМЕНТОВ

### В табе "Документы":

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
          {/* PDF Иконка */}
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
            PDF
          </div>
          
          {/* Название файла */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
              {pdf.name || 'Документ'}
            </div>
            <div className="text-xs text-muted-foreground">
              Нажмите для скачивания
            </div>
          </div>
          
          {/* Иконка скачивания */}
          <svg
            className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </a>
      ))
    ) : (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Документы отсутствуют
      </div>
    )}
  </div>
)}
\`\`\`

---

## 13. УЛУЧШЕННАЯ ТАБЛИЦА ХАРАКТЕРИСТИК

### В табе "Характеристики":

\`\`\`tsx
{activeTab === "specs" && product.attributes && Object.keys(product.attributes).length > 0 && (
  <div className="space-y-0">
    {Object.entries(product.attributes)
      .filter(([key]) => key !== "Product URL")
      .map(([key, value], idx) => (
        <div
          key={idx}
          className="grid grid-cols-1 md:grid-cols-[minmax(150px,30%)_1fr] gap-2 md:gap-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
        >
          <div className="text-sm font-medium text-muted-foreground">
            {key}
          </div>
          <div className="text-sm text-foreground break-words leading-relaxed">
            {value}
          </div>
        </div>
      ))}
  </div>
)}
\`\`\`

**Ключевые изменения:**
- `grid-cols-1 md:grid-cols-[...]` - на мобильных вертикальный layout
- `minmax(150px,30%)` - колонка названия занимает максимум 30% ширины
- `break-words` - длинные слова переносятся
- `leading-relaxed` - увеличенный межстрочный интервал для читаемости

---

## 14. УДАЛЕНИЕ ГРАДИЕНТОВ ФОНА

### Файл: `app/globals.css`

**Найти (строки ~60-120):**
\`\`\`css
body::before {
  content: "";
  position: fixed;
  background: radial-gradient(...);
  animation: floatingBackground 25s ease-in-out infinite;
}

body::after {
  content: "";
  position: fixed;
  background: radial-gradient(...);
  animation: floatingOrbs 20s ease-in-out infinite reverse;
}
\`\`\`

**Заменить на:**
\`\`\`css
body {
  @apply text-foreground;
  font-family: "Roboto", sans-serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  background: var(--background);
}

.dark body {
  background: var(--background);
}
\`\`\`

**Удалить:**
- Все `@keyframes floatingBackground`
- Все `@keyframes floatingOrbs`
- Все `body::before` и `body::after` псевдоэлементы

---

## 15. АДАПТИВНАЯ ТИПОГРАФИКА

### Файл: `app/globals.css`

**Обновить:**
\`\`\`css
.title-main {
  font-size: clamp(24px, 5vw, 36px); /* Адаптивный размер */
  font-weight: 100;
  line-height: 1.5;
  margin-bottom: 2rem;
  font-family: "Roboto", sans-serif;
}

@media (max-width: 768px) {
  .component-card {
    padding: 16px; /* Меньше padding на мобильных */
  }
  
  .component-id {
    font-size: 14px; /* Меньше шрифт на мобильных */
  }
  
  .search-box {
    font-size: 16px; /* Предотвращает zoom на iOS */
  }
}
\`\`\`

---

## 16. ФИНАЛЬНАЯ ПРОВЕРКА

### Чеклист для тестирования:

#### Десктоп (1920x1080):
- [ ] Логотип отображается корректно (градиентный чип)
- [ ] Нет текста "ДИПОНИКА"
- [ ] Таблица результатов с колонкой "Фото" и "Регионы"
- [ ] Hover на фото пролистывает изображения
- [ ] Сортировка работает (клик на "Цена")
- [ ] Страница товара: изображение слева, блок заказа справа
- [ ] PDF иконки красные с градиентом
- [ ] Нет градиентов фона

#### Планшет (768x1024):
- [ ] Гамбургер-меню появляется
- [ ] Таблица результатов адаптируется или скроллится
- [ ] Страница товара: вертикальный layout

#### Мобильный (375x667):
- [ ] Гамбургер-меню работает
- [ ] Результаты поиска - карточки (не таблица)
- [ ] НЕТ горизонтального скролла
- [ ] Страница товара: блок заказа сверху (sticky)
- [ ] Все кнопки достаточно большие (минимум 44x44px)
- [ ] Текст читаемый (минимум 14px)

#### Все разрешения:
- [ ] MicrochipLoader показывается при загрузке
- [ ] Плейсхолдеры для битых изображений
- [ ] Темная тема работает корректно
- [ ] Анимации плавные (не дергаются)

---

## 17. ВАЖНЫЕ ЗАМЕЧАНИЯ

### UI/UX Принципы:
1. **Консистентность**: Все отступы кратны 4px (8px, 12px, 16px, 24px)
2. **Иерархия**: Заголовки четко отличаются от текста
3. **Контраст**: Текст читаемый на любом фоне (минимум 4.5:1)
4. **Feedback**: Все интерактивные элементы имеют hover/active состояния
5. **Performance**: Анимации используют `transform` и `opacity` (GPU acceleration)

### Accessibility:
- Все кнопки имеют `aria-label` если нет текста
- Изображения имеют `alt` атрибуты
- Фокус видимый (outline)
- Минимальный размер touch target: 44x44px

### Mobile-First:
- Начинаем с мобильного layout
- Используем `md:` и `lg:` префиксы для больших экранов
- Тестируем на реальных устройствах

---

## 18. ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

Полный список файлов которые нужно изменить:

1. ✅ `components/MicrochipLoader.tsx` - уже готов
2. ✅ `app/page.tsx` - главная страница (логотип, меню)
3. ✅ `app/loading.tsx` - страница загрузки
4. ✅ `app/search/page.tsx` или `app/results/page.tsx` - результаты поиска
5. ✅ `app/product/[id]/page.tsx` - страница товара
6. ✅ `app/globals.css` - глобальные стили
7. ✅ `app/client-layout.tsx` - если используется

---

## ФИНАЛЬНАЯ ПРОВЕРКА ПЕРЕД ДЕПЛОЕМ

\`\`\`bash
# 1. Проверить сборку
npm run build

# 2. Проверить типы
npm run type-check

# 3. Проверить линтер
npm run lint

# 4. Запустить на разных устройствах
# - iPhone SE (375x667)
# - iPad (768x1024)
# - Desktop (1920x1080)

# 5. Проверить в разных браузерах
# - Chrome
# - Safari
# - Firefox
\`\`\`

---

## КОНТАКТЫ ДЛЯ ВОПРОСОВ

Если что-то непонятно или нужны уточнения - пишите сразу, не гадайте!

**Успехов! 🚀**
