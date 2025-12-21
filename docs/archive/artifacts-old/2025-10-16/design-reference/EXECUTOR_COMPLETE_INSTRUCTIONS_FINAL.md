# ФИНАЛЬНЫЕ ИНСТРУКЦИИ ПО ВИЗУАЛЬНЫМ ПРАВКАМ

## ⚠️ КРИТИЧЕСКИ ВАЖНО

Исполнитель в прошлый раз **НЕ ВЫПОЛНИЛ** многие задачи, хотя отчитался что выполнил.
Эти инструкции содержат **ТОЧНЫЕ СТРОКИ КОДА** для замены.

---

## 🔴 ПРОБЛЕМА #1: ГРАДИЕНТ ВСЕ ЕЩЕ ЕСТЬ

### Файл: `app/globals.css`

**ЧТО ИСКАТЬ:**
\`\`\`css
body {
  background: linear-gradient(to bottom right, #fce7f3, #dbeafe);
}
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`css
body {
  background: #ffffff;
}
\`\`\`

**ПРОВЕРКА:** Открыть главную страницу - фон должен быть ПОЛНОСТЬЮ БЕЛЫЙ, без градиентов.

---

## 🔴 ПРОБЛЕМА #2: МОБИЛЬНАЯ ВЕРСИЯ - ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ

### Файл: `app/search/page.tsx`

**Проблема:** Таблица результатов на мобилке вызывает горизонтальный скролл.

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div className="overflow-x-auto">
  <table className="w-full">
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`tsx
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
  <div className="min-w-[800px] md:min-w-0">
    <table className="w-full">
\`\`\`

**И В КОНЦЕ ТАБЛИЦЫ:**
\`\`\`tsx
    </table>
  </div>
</div>
\`\`\`

**Дополнительно - скрыть колонки на мобилке:**

Найти строку с заголовками таблицы:
\`\`\`tsx
<th className="...">Производитель</th>
<th className="...">Регионы</th>
\`\`\`

Заменить на:
\`\`\`tsx
<th className="hidden md:table-cell ...">Производитель</th>
<th className="hidden md:table-cell ...">Регионы</th>
\`\`\`

И в строках данных:
\`\`\`tsx
<td className="...">
  {result.manufacturer}
</td>
<td className="...">
  {result.regions}
</td>
\`\`\`

Заменить на:
\`\`\`tsx
<td className="hidden md:table-cell ...">
  {result.manufacturer}
</td>
<td className="hidden md:table-cell ...">
  {result.regions}
</td>
\`\`\`

**ПРОВЕРКА:** Открыть страницу результатов на телефоне - НЕ должно быть горизонтального скролла.

---

## 🔴 ПРОБЛЕМА #3: КАРТОЧКА ТОВАРА НА МОБИЛКЕ

### Файл: `app/product/[id]/page.tsx`

**Проблема:** Layout ломается на мобилке.

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`tsx
<div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8">
\`\`\`

**Блок с изображением - сделать компактным на мобилке:**

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div className="lg:col-span-1">
  {/* Изображение товара */}
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`tsx
<div className="lg:col-span-1 w-full max-w-sm mx-auto lg:max-w-none lg:mx-0">
  {/* Изображение товара */}
\`\`\`

**Блок заказа - убрать sticky на мобилке:**

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div className="sticky top-4 ...">
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`tsx
<div className="lg:sticky lg:top-4 ...">
\`\`\`

**Таблица характеристик - сделать responsive:**

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<table className="w-full">
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`tsx
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
  <table className="w-full min-w-[600px] md:min-w-0">
\`\`\`

**И закрыть div после таблицы:**
\`\`\`tsx
  </table>
</div>
\`\`\`

**ПРОВЕРКА:** Открыть карточку товара на телефоне - все должно помещаться на экран без скролла вправо.

---

## 🔴 ПРОБЛЕМА #4: ЛОГОТИП В ШАПКЕ

### Файл: `app/page.tsx` (и все другие страницы с хедером)

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div className="flex items-center gap-2">
  <Cpu className="h-6 w-6" />
  <span className="text-xl font-semibold">ДИПОНИКА</span>
</div>
\`\`\`

**НА ЧТО ЗАМЕНИТЬ (улучшенный логотип):**
\`\`\`tsx
<div className="flex items-center">
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-blue-600"
  >
    {/* Внешний квадрат чипа */}
    <rect
      x="2"
      y="2"
      width="28"
      height="28"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    
    {/* Ножки чипа слева */}
    <line x1="0" y1="8" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5" />
    <line x1="0" y1="12" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" />
    <line x1="0" y1="16" x2="2" y2="16" stroke="currentColor" strokeWidth="1.5" />
    <line x1="0" y1="20" x2="2" y2="20" stroke="currentColor" strokeWidth="1.5" />
    <line x1="0" y1="24" x2="2" y2="24" stroke="currentColor" strokeWidth="1.5" />
    
    {/* Ножки чипа справа */}
    <line x1="30" y1="8" x2="32" y2="8" stroke="currentColor" strokeWidth="1.5" />
    <line x1="30" y1="12" x2="32" y2="12" stroke="currentColor" strokeWidth="1.5" />
    <line x1="30" y1="16" x2="32" y2="16" stroke="currentColor" strokeWidth="1.5" />
    <line x1="30" y1="20" x2="32" y2="20" stroke="currentColor" strokeWidth="1.5" />
    <line x1="30" y1="24" x2="32" y2="24" stroke="currentColor" strokeWidth="1.5" />
    
    {/* Ножки чипа сверху */}
    <line x1="8" y1="0" x2="8" y2="2" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="0" x2="12" y2="2" stroke="currentColor" strokeWidth="1.5" />
    <line x1="16" y1="0" x2="16" y2="2" stroke="currentColor" strokeWidth="1.5" />
    <line x1="20" y1="0" x2="20" y2="2" stroke="currentColor" strokeWidth="1.5" />
    <line x1="24" y1="0" x2="24" y2="2" stroke="currentColor" strokeWidth="1.5" />
    
    {/* Ножки чипа снизу */}
    <line x1="8" y1="30" x2="8" y2="32" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="30" x2="12" y2="32" stroke="currentColor" strokeWidth="1.5" />
    <line x1="16" y1="30" x2="16" y2="32" stroke="currentColor" strokeWidth="1.5" />
    <line x1="20" y1="30" x2="20" y2="32" stroke="currentColor" strokeWidth="1.5" />
    <line x1="24" y1="30" x2="24" y2="32" stroke="currentColor" strokeWidth="1.5" />
    
    {/* Внутренние детали чипа */}
    <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="16" cy="16" r="2" fill="currentColor" />
  </svg>
</div>
\`\`\`

**ВАЖНО:** Текст "ДИПОНИКА" полностью убран, остался только логотип чипа.

**ПРОВЕРКА:** Открыть любую страницу - в шапке должен быть только логотип чипа, без текста.

---

## 🔴 ПРОБЛЕМА #5: ЛОАДЕР НЕ ИСПОЛЬЗУЕТСЯ

### Файл: `app/loading.tsx`

**ЧТО ИСКАТЬ:**
\`\`\`tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin ...">
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`tsx
import MicrochipLoader from "@/components/MicrochipLoader"

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <MicrochipLoader />
    </div>
  )
}
\`\`\`

**ПРОВЕРКА:** При загрузке страниц должен появляться анимированный чип.

---

## 🔴 ПРОБЛЕМА #6: ПЛЕЙСХОЛДЕР ДЛЯ БИТЫХ КАРТИНОК

### Файл: `app/search/page.tsx`

**ЧТО ИСКАТЬ (в колонке с фото):**
\`\`\`tsx
<img
  src={result.image || "/placeholder.svg"}
  alt={result.name}
  className="..."
/>
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`tsx
<img
  src={result.image || "/placeholder-component.svg"}
  alt={result.name}
  className="..."
  onError={(e) => {
    e.currentTarget.src = "/placeholder-component.svg"
  }}
/>
\`\`\`

### Создать файл: `public/placeholder-component.svg`

\`\`\`svg
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="4" fill="#F3F4F6"/>
  <rect x="8" y="8" width="32" height="32" rx="2" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="6" y1="14" x2="8" y2="14" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="6" y1="20" x2="8" y2="20" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="6" y1="26" x2="8" y2="26" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="6" y1="32" x2="8" y2="32" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="40" y1="14" x2="42" y2="14" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="40" y1="20" x2="42" y2="20" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="40" y1="26" x2="42" y2="26" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="40" y1="32" x2="42" y2="32" stroke="#9CA3AF" stroke-width="2"/>
  <circle cx="24" cy="24" r="6" stroke="#9CA3AF" stroke-width="2"/>
</svg>
\`\`\`

**ПРОВЕРКА:** Если у товара нет картинки или она битая - показывается серый плейсхолдер с чипом.

---

## 🔴 ПРОБЛЕМА #7: НАЗВАНИЯ ТОВАРОВ ОБРЕЗАЮТСЯ

### Файл: `app/search/page.tsx`

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div className="line-clamp-2">
  {result.name}
</div>
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`tsx
<div className="line-clamp-3 text-sm leading-tight">
  {result.name}
</div>
\`\`\`

**ПРОВЕРКА:** Названия товаров могут занимать до 3 строк.

---

## 🔴 ПРОБЛЕМА #8: БЛОК КОЛИЧЕСТВА ВЫГЛЯДИТ ПЛОХО

### Файл: `app/product/[id]/page.tsx`

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div className="flex items-center gap-2">
  <Button>-</Button>
  <Input type="number" value={quantity} />
  <Button>+</Button>
</div>
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`tsx
<div className="flex items-center border border-gray-300 rounded-lg overflow-hidden w-32">
  <button
    onClick={() => setQuantity(Math.max(1, quantity - 1))}
    className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-r border-gray-300 transition-colors"
  >
    −
  </button>
  <input
    type="number"
    value={quantity}
    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
    className="w-full text-center py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    min="1"
  />
  <button
    onClick={() => setQuantity(quantity + 1)}
    className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-l border-gray-300 transition-colors"
  >
    +
  </button>
</div>
\`\`\`

**ПРОВЕРКА:** Блок количества выглядит как единое целое с кнопками по бокам.

---

## 🔴 ПРОБЛЕМА #9: СОРТИРОВКА В ТАБЛИЦАХ

### Файл: `app/search/page.tsx`

**Добавить state для сортировки (в начале компонента):**
\`\`\`tsx
const [sortField, setSortField] = useState<'price' | 'moq' | null>(null)
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
\`\`\`

**Функция сортировки:**
\`\`\`tsx
const handleSort = (field: 'price' | 'moq') => {
  if (sortField === field) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
  } else {
    setSortField(field)
    setSortDirection('asc')
  }
}

const sortedResults = [...results].sort((a, b) => {
  if (!sortField) return 0
  const aVal = sortField === 'price' ? a.price : a.moq
  const bVal = sortField === 'price' ? b.price : b.moq
  return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
})
\`\`\`

**В заголовках таблицы:**
\`\`\`tsx
<th 
  className="cursor-pointer hover:bg-gray-50"
  onClick={() => handleSort('price')}
>
  <div className="flex items-center gap-1">
    Цена
    {sortField === 'price' && (
      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
    )}
  </div>
</th>
\`\`\`

**ПРОВЕРКА:** Клик по заголовку "Цена" или "MOQ" сортирует таблицу.

---

## 🔴 ПРОБЛЕМА #10: ДЛИННЫЕ ТЕКСТЫ В ХАРАКТЕРИСТИКАХ

### Файл: `app/product/[id]/page.tsx`

**ЧТО ИСКАТЬ (в таблице характеристик):**
\`\`\`tsx
<td className="...">
  {value}
</td>
\`\`\`

**НА ЧТО ЗАМЕНИТЬ:**
\`\`\`tsx
<td className="... max-w-xs break-words">
  <div className="line-clamp-3">
    {value}
  </div>
</td>
\`\`\`

**ПРОВЕРКА:** Длинные значения обрезаются после 3 строк с многоточием.

---

## ✅ ЧЕКЛИСТ ПРОВЕРКИ

После выполнения ВСЕХ инструкций проверить:

1. [ ] Главная страница - фон ПОЛНОСТЬЮ БЕЛЫЙ (нет градиента)
2. [ ] Главная страница - в шапке только логотип чипа (нет текста "ДИПОНИКА")
3. [ ] Страница результатов на МОБИЛКЕ - нет горизонтального скролла
4. [ ] Страница результатов - колонки "Производитель" и "Регионы" скрыты на мобилке
5. [ ] Страница результатов - битые картинки показывают плейсхолдер
6. [ ] Страница результатов - названия товаров до 3 строк
7. [ ] Страница результатов - клик по "Цена" сортирует таблицу
8. [ ] Карточка товара на МОБИЛКЕ - все помещается на экран
9. [ ] Карточка товара - блок количества выглядит как единое целое
10. [ ] Карточка товара - таблица характеристик не ломается от длинных текстов
11. [ ] При загрузке страниц - показывается анимированный чип

---

## 🚨 ВАЖНО

Если хоть одна проверка не прошла - задача НЕ ВЫПОЛНЕНА.

Сделать скриншоты ВСЕХ страниц (главная, результаты, товар) на ДЕСКТОПЕ и МОБИЛКЕ.

Приложить к отчету.
