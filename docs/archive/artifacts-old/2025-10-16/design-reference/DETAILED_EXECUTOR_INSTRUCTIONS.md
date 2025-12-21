# ДЕТАЛЬНЫЕ ИНСТРУКЦИИ ДЛЯ ИСПОЛНИТЕЛЯ

## АНАЛИЗ ТЕКУЩЕГО СОСТОЯНИЯ САЙТА

### ✅ ЧТО УЖЕ РАБОТАЕТ ПРАВИЛЬНО:
1. Блок фильтров на странице результатов
2. Табы "Кэш (SSR)" и "Live (SSE)"
3. Ссылка "Показано по:"
4. Кнопка "Купить" на странице результатов
5. Общая структура страниц
6. Белый фон без градиентов

### ❌ ЧТО НУЖНО ИСПРАВИТЬ:

---

## 1. ЛОГОТИП (КРИТИЧНО!)

### Проблема:
Используется старая простая иконка чипа вместо градиентного логотипа.

### Решение:

**Файл: `components/MicrochipLogo.tsx`**

Убедитесь что этот файл существует и содержит:

\`\`\`tsx
export function MicrochipLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="chipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#ec4899", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* Pins - Left */}
      <rect x="5" y="20" width="10" height="3" fill="url(#chipGradient)" />
      <rect x="5" y="35" width="10" height="3" fill="url(#chipGradient)" />
      <rect x="5" y="50" width="10" height="3" fill="url(#chipGradient)" />
      <rect x="5" y="65" width="10" height="3" fill="url(#chipGradient)" />
      <rect x="5" y="80" width="10" height="3" fill="url(#chipGradient)" />
      
      {/* Pins - Right */}
      <rect x="85" y="20" width="10" height="3" fill="url(#chipGradient)" />
      <rect x="85" y="35" width="10" height="3" fill="url(#chipGradient)" />
      <rect x="85" y="50" width="10" height="3" fill="url(#chipGradient)" />
      <rect x="85" y="65" width="10" height="3" fill="url(#chipGradient)" />
      <rect x="85" y="80" width="10" height="3" fill="url(#chipGradient)" />
      
      {/* Pins - Top */}
      <rect x="25" y="5" width="3" height="10" fill="url(#chipGradient)" />
      <rect x="40" y="5" width="3" height="10" fill="url(#chipGradient)" />
      <rect x="55" y="5" width="3" height="10" fill="url(#chipGradient)" />
      <rect x="70" y="5" width="3" height="10" fill="url(#chipGradient)" />
      
      {/* Pins - Bottom */}
      <rect x="25" y="85" width="3" height="10" fill="url(#chipGradient)" />
      <rect x="40" y="85" width="3" height="10" fill="url(#chipGradient)" />
      <rect x="55" y="85" width="3" height="10" fill="url(#chipGradient)" />
      <rect x="70" y="85" width="3" height="10" fill="url(#chipGradient)" />
      
      {/* Main chip body */}
      <rect
        x="20"
        y="20"
        width="60"
        height="60"
        rx="4"
        fill="url(#chipGradient)"
        opacity="0.9"
      />
      
      {/* Inner details */}
      <circle cx="35" cy="35" r="3" fill="white" opacity="0.3" />
      <circle cx="65" cy="35" r="3" fill="white" opacity="0.3" />
      <circle cx="35" cy="65" r="3" fill="white" opacity="0.3" />
      <circle cx="65" cy="65" r="3" fill="white" opacity="0.3" />
      <rect x="45" y="45" width="10" height="10" rx="1" fill="white" opacity="0.4" />
    </svg>
  )
}
\`\`\`

**Файл: `components/Header.tsx` (или где у вас хедер)**

Найдите текущий логотип и замените на:

\`\`\`tsx
import { MicrochipLogo } from "@/components/MicrochipLogo"

// В JSX хедера:
<Link href="/" className="flex items-center gap-2">
  <MicrochipLogo className="w-8 h-8" />
</Link>
\`\`\`

**Проверка:**
- Логотип должен быть градиентным (синий → фиолетовый → розовый)
- Должен отображаться на всех страницах
- При клике должен вести на главную

---

## 2. СТРАНИЦА ТОВАРА - БЛОК ЗАКАЗА

### Проблема 1: Кнопка "Добавить в заказ" вместо "Купить"

**Файл: `app/product/[id]/page.tsx`**

Найдите:
\`\`\`tsx
<Button>Добавить в заказ</Button>
\`\`\`

Замените на:
\`\`\`tsx
<Button>Купить</Button>
\`\`\`

### Проблема 2: Кнопка Datasheet в неправильном месте

**Текущее состояние:** Кнопка Datasheet находится рядом с кнопкой "Добавить в заказ"

**Правильное решение:** Убрать кнопку Datasheet из блока заказа полностью. Она не нужна там.

Найдите и УДАЛИТЕ:
\`\`\`tsx
<Button variant="outline">Datasheet</Button>
\`\`\`

### Проблема 3: Двойной символ ₽ в цене

**Файл: `app/product/[id]/page.tsx`**

Найдите строку где отображается итоговая цена:
\`\`\`tsx
₽ {totalPrice}₽
\`\`\`

Замените на:
\`\`\`tsx
{totalPrice}₽
\`\`\`

### Проблема 4: Селектор количества слишком большой

**Файл: `app/product/[id]/page.tsx`**

Найдите блок с селектором количества и замените на компактную версию:

\`\`\`tsx
<div className="space-y-4">
  <div>
    <p className="text-sm text-muted-foreground mb-2">Количество</p>
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 bg-transparent"
        onClick={() => setQuantity(Math.max(1, quantity - 1))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
        className="h-9 w-20 text-center"
      />
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 bg-transparent"
        onClick={() => setQuantity(quantity + 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </div>

  <div className="flex items-center justify-between pt-4 border-t">
    <span className="text-sm text-muted-foreground">Итого:</span>
    <span className="text-2xl font-bold">{totalPrice}₽</span>
  </div>

  <Button className="w-full" size="lg">
    Купить
  </Button>
</div>
\`\`\`

**Ключевые изменения:**
- Input поле: `w-20` (узкое, 80px)
- Кнопки +/-: `h-9 w-9` (квадратные, компактные)
- Кнопка "Купить" вместо "Добавить в заказ"
- Убрана кнопка Datasheet

---

## 3. СТРАНИЦА ТОВАРА - ТАБЛИЦА ХАРАКТЕРИСТИК (МОБИЛЬНАЯ)

### Проблема: Таблица слишком длинная на мобильных

**Файл: `app/product/[id]/page.tsx`**

Найдите таблицу характеристик и добавьте ограничение высоты:

\`\`\`tsx
<TabsContent value="characteristics" className="mt-6">
  <div className="max-h-[600px] overflow-y-auto border rounded-lg">
    <table className="w-full">
      <tbody className="divide-y">
        {/* ... строки таблицы ... */}
      </tbody>
    </table>
  </div>
</TabsContent>
\`\`\`

**Ключевые изменения:**
- `max-h-[600px]` - максимальная высота 600px
- `overflow-y-auto` - вертикальный скролл
- `border rounded-lg` - рамка и скругленные углы

---

## 4. СТРАНИЦА ТОВАРА - ФИКСИРОВАННЫЙ ФУТЕР

### Проблема: Футер прыгает при переключении табов

**Файл: `app/product/[id]/page.tsx`**

Найдите блок с табами и добавьте минимальную высоту:

\`\`\`tsx
<Tabs defaultValue="characteristics" className="mt-8">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="characteristics">Характеристики</TabsTrigger>
    <TabsTrigger value="offers">Предложения</TabsTrigger>
    <TabsTrigger value="documents">Документы</TabsTrigger>
  </TabsList>

  <div className="min-h-[400px]">
    <TabsContent value="characteristics" className="mt-6">
      {/* ... контент ... */}
    </TabsContent>

    <TabsContent value="offers" className="mt-6">
      {/* ... контент ... */}
    </TabsContent>

    <TabsContent value="documents" className="mt-6">
      {/* ... контент ... */}
    </TabsContent>
  </div>
</Tabs>
\`\`\`

**Ключевое изменение:**
- Обернуть все TabsContent в `<div className="min-h-[400px]">` - минимальная высота предотвращает прыжки футера

---

## 5. СТРАНИЦА ТОВАРА - ГАЛЕРЕЯ ИЗОБРАЖЕНИЙ

### Проблема: Нет переключения между несколькими изображениями

**Файл: `app/product/[id]/page.tsx`**

Найдите блок с изображениями и добавьте переключение при наведении:

\`\`\`tsx
"use client"

import { useState } from "react"

// В компоненте:
const [selectedImage, setSelectedImage] = useState(0)

const images = [
  "/electronic-chip-component.jpg",
  "/transistor-component.jpg",
]

// В JSX:
<div className="space-y-4">
  {/* Основное изображение */}
  <div className="aspect-square bg-white rounded-lg border p-8 flex items-center justify-center">
    <img
      src={images[selectedImage] || "/placeholder.svg"}
      alt="Product"
      className="max-w-full max-h-full object-contain"
    />
  </div>

  {/* Миниатюры */}
  {images.length > 1 && (
    <div className="flex gap-2">
      {images.map((img, idx) => (
        <button
          key={idx}
          onMouseEnter={() => setSelectedImage(idx)}
          onClick={() => setSelectedImage(idx)}
          className={`w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
            selectedImage === idx
              ? "border-primary"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <img
            src={img || "/placeholder.svg"}
            alt={`Thumbnail ${idx + 1}`}
            className="w-full h-full object-contain p-2 bg-white"
          />
        </button>
      ))}
    </div>
  )}
</div>
\`\`\`

**Ключевые изменения:**
- При наведении (`onMouseEnter`) картинка меняется
- При клике тоже меняется
- Активная миниатюра подсвечивается синей рамкой
- Если картинка одна - миниатюры не показываются

---

## 6. СТРАНИЦА ТОВАРА - УМЕНЬШЕННЫЙ БЛОК КАРТИНКИ

### Проблема: Блок картинки слишком большой

**Файл: `app/product/[id]/page.tsx`**

Найдите grid layout и измените пропорции:

**БЫЛО:**
\`\`\`tsx
<div className="grid lg:grid-cols-3 gap-8">
  <div className="lg:col-span-1"> {/* Картинка */}
  <div className="lg:col-span-2"> {/* Инфо */}
\`\`\`

**ДОЛЖНО БЫТЬ:**
\`\`\`tsx
<div className="grid lg:grid-cols-5 gap-8">
  <div className="lg:col-span-2"> {/* Картинка - 2 из 5 колонок */}
  <div className="lg:col-span-3"> {/* Инфо - 3 из 5 колонок */}
\`\`\`

**Результат:** Картинка занимает 40% ширины вместо 33%

---

## 7. ГАМБУРГЕР-МЕНЮ (МОБИЛЬНАЯ ВЕРСИЯ)

### Проблема: Нет гамбургер-меню на мобильных

**Файл: `components/Header.tsx`**

Добавьте гамбургер-меню для мобильных устройств:

\`\`\`tsx
"use client"

import { useState } from "react"
import { Menu, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Логотип */}
        <Link href="/" className="flex items-center gap-2">
          <MicrochipLogo className="w-8 h-8" />
        </Link>

        {/* Десктоп навигация */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/sources" className="text-sm font-medium hover:text-primary">
            Источники
          </Link>
          <Link href="/about" className="text-sm font-medium hover:text-primary">
            О нас
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium">GREEN 4/4</span>
          </div>
        </nav>

        {/* Мобильное меню */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <nav className="flex flex-col gap-4 mt-8">
              <Link
                href="/sources"
                className="text-lg font-medium hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Источники
              </Link>
              <Link
                href="/about"
                className="text-lg font-medium hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                О нас
              </Link>
              <div className="flex items-center gap-2 pt-4 border-t">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">GREEN 4/4</span>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
\`\`\`

**Ключевые моменты:**
- Гамбургер-меню показывается только на мобильных (`md:hidden`)
- Десктоп навигация скрыта на мобильных (`hidden md:flex`)
- Меню выезжает справа
- При клике на ссылку меню закрывается

---

## 8. ТИПОГРАФИКА И ШРИФТЫ

### Проблема: Используется системный шрифт

**Файл: `app/layout.tsx`**

Убедитесь что используются правильные шрифты:

\`\`\`tsx
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
\`\`\`

**Файл: `app/globals.css`**

Убедитесь что в Tailwind конфиге указан шрифт:

\`\`\`css
@theme inline {
  --font-sans: var(--font-inter), system-ui, sans-serif;
}
\`\`\`

---

## 9. МОБИЛЬНАЯ АДАПТАЦИЯ СТРАНИЦЫ РЕЗУЛЬТАТОВ

### Проблема: Таблица результатов на мобильных

**Файл: `app/search/page.tsx` или `app/results/page.tsx`**

Добавьте адаптивное отображение - карточки на мобильных, таблица на десктопе:

\`\`\`tsx
{/* Десктоп - таблица */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    {/* ... таблица ... */}
  </table>
</div>

{/* Мобильные - карточки */}
<div className="md:hidden space-y-4">
  {results.map((product) => (
    <Card key={product.id} className="p-4">
      <Link href={`/product/${product.id}`} className="font-semibold text-primary hover:underline">
        {product.partNumber}
      </Link>
      <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
      <p className="text-sm mt-2">
        <span className="font-medium">Производитель:</span> {product.manufacturer}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="secondary">{product.region}</Badge>
        <span className="text-sm text-muted-foreground">
          {product.stock} шт
        </span>
      </div>
      {product.price && (
        <p className="text-lg font-bold text-green-600 mt-2">
          {product.price}₽
        </p>
      )}
      <Button className="w-full mt-4">Купить</Button>
    </Card>
  ))}
</div>
\`\`\`

---

## 10. ФИНАЛЬНЫЙ ЧЕКЛИСТ

### Десктоп (≥1024px):

- [ ] Градиентный логотип чипа отображается
- [ ] Навигация в хедере видна (Источники, О нас, GREEN 4/4)
- [ ] Страница товара: 2 колонки (картинка 40% + инфо 60%)
- [ ] Компактный селектор количества (поле 80px)
- [ ] Кнопка "Купить" вместо "Добавить в заказ"
- [ ] НЕТ кнопки Datasheet в блоке заказа
- [ ] Цена без двойного символа ₽
- [ ] Переключение картинок при наведении на миниатюры
- [ ] Таблица характеристик с max-height и скроллом
- [ ] Футер не прыгает при переключении табов
- [ ] Таблица результатов поиска отображается корректно
- [ ] Блок фильтров работает

### Мобильные (<1024px):

- [ ] Градиентный логотип чипа отображается
- [ ] Гамбургер-меню в правом верхнем углу
- [ ] При клике на гамбургер открывается боковое меню
- [ ] Страница товара: вертикальный layout (картинка сверху, инфо снизу)
- [ ] Компактный селектор количества
- [ ] Кнопка "Купить" на всю ширину
- [ ] Таблица характеристик с max-height 600px и скроллом
- [ ] Футер не прыгает при переключении табов
- [ ] Результаты поиска отображаются карточками (не таблицей)
- [ ] Блок фильтров адаптирован для мобильных

---

## ПОРЯДОК ВНЕДРЕНИЯ

1. **Логотип** (5 мин) - создать/обновить MicrochipLogo компонент
2. **Хедер с гамбургер-меню** (15 мин) - добавить мобильное меню
3. **Страница товара - блок заказа** (10 мин) - исправить кнопки, селектор, цену
4. **Страница товара - галерея** (10 мин) - добавить переключение картинок
5. **Страница товара - таблицы** (10 мин) - добавить max-height и min-height
6. **Страница товара - layout** (5 мин) - изменить пропорции колонок
7. **Страница результатов - мобильная** (15 мин) - добавить карточки для мобильных
8. **Типографика** (5 мин) - проверить шрифты
9. **Тестирование** (20 мин) - проверить все на десктопе и мобильных

**ОБЩЕЕ ВРЕМЯ: ~1.5 часа**

---

## ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **НЕ ТРОГАЙТЕ** логику работы с API - только UI
2. **НЕ УДАЛЯЙТЕ** существующие функции - только меняйте UI
3. **ТЕСТИРУЙТЕ** каждое изменение на десктопе И мобильных
4. **ИСПОЛЬЗУЙТЕ** существующие компоненты из shadcn/ui
5. **СОХРАНЯЙТЕ** все существующие данные и функциональность

---

## КОНТАКТЫ ДЛЯ ВОПРОСОВ

Если что-то непонятно - спрашивайте СРАЗУ, не додумывайте сами.
