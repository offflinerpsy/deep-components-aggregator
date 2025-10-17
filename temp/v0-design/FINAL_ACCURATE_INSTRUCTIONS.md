# ФИНАЛЬНЫЕ ТОЧНЫЕ ИНСТРУКЦИИ ДЛЯ ИСПОЛНИТЕЛЯ

**Дата:** Текущая версия  
**Статус:** Проанализированы скриншоты с https://prosnab.tech

---

## ЧТО УЖЕ СДЕЛАНО ✅

Проанализировав скриншоты, вижу что следующее УЖЕ РЕАЛИЗОВАНО:

1. ✅ **PDF иконки** - красные иконки с текстом "PDF" в табе "Документы"
2. ✅ **Колонка "Регионы"** - присутствует в таблице результатов поиска
3. ✅ **Блок количества** - есть кнопки +/- и input для ввода
4. ✅ **Чистый белый фон** - градиенты удалены
5. ✅ **Таблица характеристик** - работает и отображается корректно
6. ✅ **Табы** - Характеристики, Предложения, Документы работают

---

## ЧТО НУЖНО ДОДЕЛАТЬ ❌

### 1. ГРАДИЕНТНЫЙ ЛОГОТИП ЧИПА

**Проблема:** Логотип в шапке - простая иконка, не градиентная.

**Решение:**

**Создать файл: `components/ChipLogo.tsx`**
\`\`\`tsx
export function ChipLogo({ className = "w-10 h-10" }: { className?: string }) {
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
          <stop offset="50%" stopColor="#764ba2" />
          <stop offset="100%" stopColor="#f093fb" />
        </linearGradient>
      </defs>
      
      {/* Pins - Left */}
      <line x1="2" y1="14" x2="10" y2="14" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="20" x2="10" y2="20" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="26" x2="10" y2="26" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="32" x2="10" y2="32" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="14" r="2" fill="url(#chipGradient)" />
      <circle cx="10" cy="32" r="2" fill="url(#chipGradient)" />
      
      {/* Pins - Right */}
      <line x1="38" y1="14" x2="46" y2="14" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="20" x2="46" y2="20" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="26" x2="46" y2="26" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="32" x2="46" y2="32" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="38" cy="14" r="2" fill="url(#chipGradient)" />
      <circle cx="38" cy="32" r="2" fill="url(#chipGradient)" />
      
      {/* Pins - Top */}
      <line x1="14" y1="2" x2="14" y2="10" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="2" x2="20" y2="10" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="2" x2="26" y2="10" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="2" x2="32" y2="10" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="10" r="2" fill="url(#chipGradient)" />
      
      {/* Pins - Bottom */}
      <line x1="14" y1="38" x2="14" y2="46" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="38" x2="20" y2="46" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="38" x2="26" y2="46" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="38" x2="32" y2="46" stroke="url(#chipGradient)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="26" cy="38" r="2" fill="url(#chipGradient)" />
      
      {/* Main body - outer square */}
      <rect
        x="12"
        y="12"
        width="24"
        height="24"
        rx="3"
        stroke="url(#chipGradient)"
        strokeWidth="2.5"
        fill="none"
      />
      
      {/* Main body - inner square */}
      <rect
        x="16"
        y="16"
        width="16"
        height="16"
        rx="2"
        stroke="url(#chipGradient)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
    </svg>
  )
}
\`\`\`

**Заменить логотип во ВСЕХ файлах:**

**Файл: `app/page.tsx`**
\`\`\`tsx
// Добавить импорт
import { ChipLogo } from "@/components/ChipLogo"

// Найти строку с логотипом (примерно строка 239)
<div className="cursor-pointer" onClick={() => (window.location.href = "/")}>
  {/* СТАРЫЙ КОД - УДАЛИТЬ */}
  <svg className="w-10 h-10" viewBox="0 0 128 128" fill="none" stroke="currentColor" strokeWidth="2">
    ...
  </svg>
</div>

// ЗАМЕНИТЬ НА:
<div className="cursor-pointer" onClick={() => (window.location.href = "/")}>
  <ChipLogo className="w-10 h-10" />
</div>
\`\`\`

**Повторить для:**
- `app/search/page.tsx` (строка ~113)
- `app/product/[id]/page.tsx` (строка ~205)

---

### 2. ГАМБУРГЕР-МЕНЮ ДЛЯ МОБИЛЬНЫХ

**Проблема:** На мобильных устройствах нет гамбургер-меню, навигация не адаптирована.

**Решение:**

**Файл: `app/page.tsx`**

Найти блок header (строка ~235):
\`\`\`tsx
<header className="glass sticky top-0 z-50 border-b border-border bg-background">
  <div className="container mx-auto px-6 py-4 flex items-center justify-between">
\`\`\`

ЗАМЕНИТЬ НА:
\`\`\`tsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

<header className="glass sticky top-0 z-50 border-b border-border bg-background">
  <div className="container mx-auto px-4 md:px-6 py-4">
    <div className="flex items-center justify-between">
      {/* Hamburger button - visible only on mobile */}
      <button
        className="md:hidden flex flex-col gap-1.5 w-10 h-10 items-center justify-center"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <span className={`w-6 h-0.5 bg-foreground transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`w-6 h-0.5 bg-foreground transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
        <span className={`w-6 h-0.5 bg-foreground transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Logo */}
      <div className="cursor-pointer" onClick={() => (window.location.href = "/")}>
        <ChipLogo className="w-10 h-10" />
      </div>

      {/* Desktop navigation - hidden on mobile */}
      <div className="hidden md:flex items-center gap-8">
        <nav className="flex items-center gap-8">
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            Источники
          </button>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            О нас
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">GREEN 4/4</div>
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-10 h-10 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile theme toggle */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="md:hidden w-10 h-10 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
      >
        {isDark ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </div>

    {/* Mobile menu dropdown */}
    {mobileMenuOpen && (
      <div className="md:hidden mt-4 pb-4 border-t border-border pt-4 animate-in slide-in-from-top-2">
        <nav className="flex flex-col gap-4">
          <button 
            className="text-left text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Источники
          </button>
          <button 
            className="text-left text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            О нас
          </button>
          <div className="text-sm text-muted-foreground py-2">GREEN 4/4</div>
        </nav>
      </div>
    )}
  </div>
</header>
\`\`\`

**Повторить для:**
- `app/search/page.tsx`
- `app/product/[id]/page.tsx`

---

### 3. МОБИЛЬНАЯ АДАПТАЦИЯ РЕЗУЛЬТАТОВ ПОИСКА

**Проблема:** Таблица результатов на мобильных создает горизонтальный скролл.

**Решение:**

**Файл: `app/search/page.tsx`**

Найти таблицу результатов (примерно строка 200):
\`\`\`tsx
<table className="w-full">
  <thead>
    ...
  </thead>
  <tbody>
    ...
  </tbody>
</table>
\`\`\`

ОБЕРНУТЬ В:
\`\`\`tsx
{/* Desktop table - hidden on mobile */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    {/* ... existing table code ... */}
  </table>
</div>

{/* Mobile cards - visible only on mobile */}
<div className="md:hidden space-y-4">
  {results.map((result, index) => (
    <div key={index} className="glass-card p-4 rounded-lg border border-border hover:border-blue-500/50 transition-colors">
      <div className="flex gap-4 mb-3">
        {/* Product image */}
        <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {result.image ? (
            <img 
              src={result.image || "/placeholder.svg"} 
              alt={result.mpn}
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement.innerHTML = `
                  <svg class="w-10 h-10 text-muted-foreground" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="12" y="12" width="24" height="24" rx="2" />
                    <line x1="18" y1="18" x2="30" y2="18" />
                    <line x1="18" y1="24" x2="30" y2="24" />
                    <line x1="18" y1="30" x2="30" y2="30" />
                  </svg>
                `
              }}
            />
          ) : (
            <svg className="w-10 h-10 text-muted-foreground" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="12" y="12" width="24" height="24" rx="2" />
              <line x1="18" y1="18" x2="30" y2="18" />
              <line x1="18" y1="24" x2="30" y2="24" />
              <line x1="18" y1="30" x2="30" y2="30" />
            </svg>
          )}
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <a 
            href={`/product/${result.mpn}`}
            className="font-mono text-sm text-blue-600 hover:underline block mb-1"
          >
            {result.mpn}
          </a>
          <p className="text-sm text-foreground line-clamp-2 mb-2">
            {result.description}
          </p>
          <p className="text-xs text-muted-foreground">
            {result.manufacturer}
          </p>
        </div>
      </div>

      {/* Price and action */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          <div className="text-lg font-semibold text-foreground">
            {result.price ? `₽${result.price.toFixed(2)}` : '—'}
          </div>
          {result.regions && result.regions.length > 0 && (
            <div className="flex gap-1 mt-1">
              {result.regions.slice(0, 2).map((region, idx) => (
                <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {region}
                </span>
              ))}
            </div>
          )}
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Купить
        </button>
      </div>
    </div>
  ))}
</div>
\`\`\`

---

### 4. МОБИЛЬНАЯ АДАПТАЦИЯ СТРАНИЦЫ ТОВАРА

**Проблема:** Страница товара не оптимизирована для мобильных устройств.

**Решение:**

**Файл: `app/product/[id]/page.tsx`**

Найти основной layout (примерно строка 250):
\`\`\`tsx
<div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
\`\`\`

ЗАМЕНИТЬ НА:
\`\`\`tsx
<div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-8">
  {/* Left column: Image - order-2 on mobile, order-1 on desktop */}
  <div className="order-2 lg:order-1">
    <div className="sticky top-24">
      {/* ... existing image code ... */}
    </div>
  </div>

  {/* Right column: Info - order-1 on mobile, order-2 on desktop */}
  <div className="order-1 lg:order-2 space-y-4 lg:space-y-6">
    {/* Order block - shown first on mobile */}
    <div className="glass-card p-4 lg:p-6 rounded-lg border-2 border-blue-500">
      {/* ... existing order block code ... */}
    </div>

    {/* Product info */}
    <div className="glass-card p-4 lg:p-6 rounded-lg">
      {/* ... existing product info ... */}
    </div>

    {/* Tabs */}
    <div className="glass-card p-4 lg:p-6 rounded-lg">
      {/* ... existing tabs ... */}
    </div>
  </div>
</div>
\`\`\`

**Адаптировать таблицу предложений для мобильных:**

Найти таблицу предложений (таб "Предложения"):
\`\`\`tsx
<table className="w-full">
  <thead>
    <tr>
      <th>Регион</th>
      <th>Цена (₽)</th>
      <th>MOQ</th>
      <th>ETA</th>
    </tr>
  </thead>
  <tbody>
    ...
  </tbody>
</table>
\`\`\`

ОБЕРНУТЬ В:
\`\`\`tsx
{/* Desktop table */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    {/* ... existing table ... */}
  </table>
</div>

{/* Mobile cards */}
<div className="md:hidden space-y-3">
  {offers.map((offer, idx) => (
    <div key={idx} className="p-4 rounded-lg border border-border bg-muted/30">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground text-xs mb-1">Регион</div>
          <div className="font-medium">{offer.region}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">Цена</div>
          <div className="font-semibold text-lg">{offer.price}₽</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">MOQ</div>
          <div className="font-medium">{offer.moq}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">ETA</div>
          <div className="font-medium">{offer.eta || '—'}</div>
        </div>
      </div>
    </div>
  ))}
</div>
\`\`\`

---

### 5. ДОБАВИТЬ MICROCHIPLOADER

**Файл: `app/loading.tsx`**

\`\`\`tsx
import MicrochipLoader from "@/components/MicrochipLoader"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <MicrochipLoader />
    </div>
  )
}
\`\`\`

**Файл: `app/search/page.tsx`**

Найти блок загрузки (если есть):
\`\`\`tsx
{isLoading && (
  <div className="loading">Loading...</div>
)}
\`\`\`

ЗАМЕНИТЬ НА:
\`\`\`tsx
{isLoading && (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <MicrochipLoader />
  </div>
)}
\`\`\`

---

### 6. ПЛЕЙСХОЛДЕРЫ ДЛЯ БИТЫХ ИЗОБРАЖЕНИЙ

**УЖЕ ЧАСТИЧНО РЕАЛИЗОВАНО** в мобильных карточках выше.

Для десктопной таблицы добавить обработку ошибок:

**Файл: `app/search/page.tsx`**

В десктопной таблице найти:
\`\`\`tsx
<img src={result.image || "/placeholder.svg"} alt={result.mpn} />
\`\`\`

ДОБАВИТЬ onError:
\`\`\`tsx
<img 
  src={result.image || "/placeholder.svg"} 
  alt={result.mpn}
  onError={(e) => {
    e.currentTarget.style.display = 'none'
    const placeholder = document.createElement('div')
    placeholder.className = 'w-full h-full flex items-center justify-center'
    placeholder.innerHTML = `
      <svg class="w-8 h-8 text-muted-foreground" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="12" y="12" width="24" height="24" rx="2" />
        <line x1="18" y1="18" x2="30" y2="18" />
        <line x1="18" y1="24" x2="30" y2="24" />
        <line x1="18" y1="30" x2="30" y2="30" />
      </svg>
    `
    e.currentTarget.parentElement.appendChild(placeholder)
  }}
/>
\`\`\`

---

### 7. СОРТИРОВКА ТАБЛИЦ (ОПЦИОНАЛЬНО)

Если нужна сортировка, добавить состояние и обработчики:

**Файл: `app/product/[id]/page.tsx`** (таб Предложения)

\`\`\`tsx
const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

const handleSort = (key) => {
  const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
  setSortConfig({ key, direction })
  
  const sorted = [...offers].sort((a, b) => {
    if (direction === 'asc') {
      return a[key] > b[key] ? 1 : -1
    }
    return a[key] < b[key] ? 1 : -1
  })
  
  setOffers(sorted)
}

// В заголовках таблицы:
<th 
  className="cursor-pointer hover:bg-accent transition-colors"
  onClick={() => handleSort('price')}
>
  <div className="flex items-center gap-2">
    Цена (₽)
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  </div>
</th>
\`\`\`

---

## ФИНАЛЬНЫЙ ЧЕКЛИСТ ДЛЯ ПРОВЕРКИ

### Десктоп (1024px+):
- [ ] Градиентный логотип чипа отображается
- [ ] Навигация в шапке работает
- [ ] Таблица результатов с колонками: Фото, Артикул, Название, Производитель, Регионы, Цена, Действия
- [ ] Страница товара: изображение слева (300px), информация справа
- [ ] PDF иконки кликабельны
- [ ] Блок количества с кнопками +/-
- [ ] Все табы работают

### Мобильные (320px - 768px):
- [ ] Гамбургер-меню открывается/закрывается
- [ ] Логотип по центру или слева
- [ ] Результаты поиска - карточки (НЕ таблица)
- [ ] Нет горизонтального скролла
- [ ] Страница товара: блок заказа вверху, потом информация, потом изображение
- [ ] Таблица предложений - карточки
- [ ] Все кнопки кликабельны (минимум 44x44px)
- [ ] Текст читаем (минимум 14px)

### Планшеты (769px - 1023px):
- [ ] Навигация отображается полностью (без гамбургера)
- [ ] Таблицы адаптированы
- [ ] Layout промежуточный между мобильным и десктопным

### Общее:
- [ ] MicrochipLoader показывается при загрузке
- [ ] Плейсхолдеры для битых картинок
- [ ] Темная тема работает корректно
- [ ] Нет ошибок в консоли браузера

---

## ВАЖНО

1. **Тестировать на реальных устройствах** - Chrome DevTools не всегда точны
2. **Проверять производительность** - анимации должны быть плавными
3. **Не ломать существующий функционал** - все что работает должно продолжать работать
4. **Accessibility** - все интерактивные элементы доступны с клавиатуры

---

## ПОРЯДОК ВНЕДРЕНИЯ

1. Создать `ChipLogo.tsx` и заменить логотип на всех страницах
2. Добавить гамбургер-меню на всех страницах
3. Адаптировать результаты поиска (добавить мобильные карточки)
4. Адаптировать страницу товара (изменить order, добавить мобильные карточки для предложений)
5. Добавить MicrochipLoader
6. Добавить плейсхолдеры для битых изображений
7. (Опционально) Добавить сортировку таблиц

---

## ЕСЛИ ЧТО-ТО НЕПОНЯТНО

Пиши конкретные вопросы с указанием файла и строки кода. Готов уточнить любой момент.

**Удачи!**
