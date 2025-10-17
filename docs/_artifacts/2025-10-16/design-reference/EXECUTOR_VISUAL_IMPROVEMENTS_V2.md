# ИНСТРУКЦИИ ПО ВИЗУАЛЬНЫМ УЛУЧШЕНИЯМ V2

**Дата:** 10 декабря 2025  
**Проект:** Diponika Components Aggregator  
**Исполнитель:** Copilot Agent

---

## ВАЖНО: ОБЩИЕ ПРАВИЛА

1. **НЕ ТРОГАТЬ API И БЭКЕНД ЛОГИКУ**
   - Все изменения только визуальные (CSS, Tailwind классы, JSX разметка)
   - НЕ менять fetch запросы, обработчики данных, роуты
   - НЕ менять логику работы с данными

2. **ИСПОЛЬЗОВАТЬ СУЩЕСТВУЮЩИЕ КОМПОНЕНТЫ**
   - Все UI компоненты уже есть в `components/ui/`
   - Использовать существующие хуки и утилиты

3. **ТЕСТИРОВАТЬ ПОСЛЕ КАЖДОГО ИЗМЕНЕНИЯ**
   - Проверять что ничего не сломалось
   - Проверять на разных размерах экрана

---

## ЗАДАЧА 1: НОВЫЙ ЛОАДЕР (АНИМИРОВАННЫЙ ЧИП)

### Описание
Создать красивый анимированный лоадер в виде микрочипа, который рисуется линиями.

### Файлы для создания

**1. Создать файл: `components/MicrochipLoader.tsx`**
\`\`\`typescript
"use client"

export function MicrochipLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        className="microchip-loader"
        viewBox="0 0 128 128"
        width="64px"
        height="64px"
        role="img"
        aria-label="Loading"
      >
        {/* Скопировать весь SVG код из приложенного файла */}
      </svg>
    </div>
  )
}
\`\`\`

**2. Добавить стили в `app/globals.css`:**
\`\`\`css
/* Microchip Loader Animation */
.microchip-loader {
  display: block;
  margin: auto;
  color: hsl(var(--primary));
}

.microchip__center,
.microchip__dot,
.microchip__line,
.microchip__lines,
.microchip__spark,
.microchip__wave {
  animation-duration: 5s;
  animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1);
  animation-iteration-count: infinite;
}

.microchip__core,
.microchip__dot {
  fill: hsl(var(--primary));
  transition: fill 0.3s;
}

.microchip__center,
.microchip__wave {
  transform-origin: 25px 25px;
}

.microchip__center {
  animation-name: center-scale;
}

/* Animations for dots */
@keyframes dot-scale1 {
  from, 20%, 81.25%, to { transform: scale(0); }
  32.5%, 68.75% { transform: scale(1); }
}

/* ... остальные keyframes из приложенного CSS файла ... */

.microchip__line {
  stroke: hsl(var(--primary));
}

.microchip__spark,
.microchip__wave {
  animation-timing-function: linear;
  stroke: hsl(var(--primary) / 0.6);
}
\`\`\`

**3. Использовать лоадер:**

В файле `app/loading.tsx`:
\`\`\`typescript
import { MicrochipLoader } from "@/components/MicrochipLoader"

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <MicrochipLoader />
    </div>
  )
}
\`\`\`

В файле `app/client-layout.tsx`:
\`\`\`typescript
import { MicrochipLoader } from "@/components/MicrochipLoader"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<MicrochipLoader className="min-h-screen" />}>
      {children}
    </Suspense>
  )
}
\`\`\`

---

## ЗАДАЧА 2: НОВЫЙ ЛОГОТИП В ШАПКЕ

### Описание
Заменить логотип "Д ДИПОНИКА" на иконку микрочипа БЕЗ текста "ДИПОНИКА".

### Файлы для изменения

**Файл: `app/page.tsx`**

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div className="logo">
  <div className="logo-chip"></div>
  <svg className="logo-text-svg" width="180" height="32" viewBox="0 0 180 32" fill="none">
    <text ... >ДИПОНИКА</text>
  </svg>
</div>
\`\`\`

**НА ЧТО МЕНЯТЬ:**
\`\`\`tsx
<a href="/" className="flex items-center">
  <svg
    className="w-8 h-8 text-primary"
    viewBox="0 0 128 128"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="40" y="40" width="48" height="48" rx="4" />
    <line x1="52" y1="52" x2="76" y2="52" />
    <line x1="52" y1="60" x2="76" y2="60" />
    <line x1="52" y1="68" x2="76" y2="68" />
    <line x1="52" y1="76" x2="76" y2="76" />
    {/* Pins left */}
    <line x1="40" y1="48" x2="32" y2="48" />
    <line x1="40" y1="56" x2="32" y2="56" />
    <line x1="40" y1="64" x2="32" y2="64" />
    <line x1="40" y1="72" x2="32" y2="72" />
    <line x1="40" y1="80" x2="32" y2="80" />
    {/* Pins right */}
    <line x1="88" y1="48" x2="96" y2="48" />
    <line x1="88" y1="56" x2="96" y2="56" />
    <line x1="88" y1="64" x2="96" y2="64" />
    <line x1="88" y1="72" x2="96" y2="72" />
    <line x1="88" y1="80" x2="96" y2="80" />
  </svg>
</a>
\`\`\`

**ПОЧЕМУ:** Убираем текст "ДИПОНИКА", оставляем только иконку чипа как логотип.

**Повторить для всех страниц:**
- `app/search/page.tsx` (строка ~113)
- `app/product/[id]/page.tsx` (строка ~205)
- `app/search-simple/page.tsx` (строка ~52)
- `app/product-simple/[id]/page.tsx` (строка ~82)

---

## ЗАДАЧА 3: СТРАНИЦА РЕЗУЛЬТАТОВ ПОИСКА

### 3.1 Компактные фильтры цены

**Файл: `app/search/page.tsx`**

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<input
  type="number"
  placeholder="0"
  className="..."
/>
\`\`\`

**НА ЧТО МЕНЯТЬ:**
\`\`\`tsx
<input
  type="number"
  placeholder="0"
  className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
\`\`\`

**ПОЧЕМУ:** Уменьшаем ширину инпутов с полной ширины до 96px (w-24), так как туда вводятся только цифры.

---

### 3.2 Улучшенный чекбокс "Только в наличии"

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<label className="flex items-center gap-2">
  <input type="checkbox" ... />
  Только в наличии
</label>
\`\`\`

**НА ЧТО МЕНЯТЬ:**
\`\`\`tsx
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
    ...
  />
  <span className="text-sm text-gray-700">Только в наличии</span>
</label>
\`\`\`

**ПОЧЕМУ:** Добавляем стилизацию чекбокса и делаем его более заметным.

---

### 3.3 КОЛОНКА С ФОТО ТОВАРА

**ВАЖНО:** В таблице результатов ОБЯЗАТЕЛЬНО должна быть колонка с фото товара!

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<table>
  <thead>
    <tr>
      <th>Артикул</th>
      <th>Название</th>
      ...
    </tr>
  </thead>
</table>
\`\`\`

**НА ЧТО МЕНЯТЬ:**
\`\`\`tsx
<table className="w-full">
  <thead>
    <tr className="border-b border-gray-200">
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Фото</th>
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Артикул</th>
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Название</th>
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Производитель</th>
      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 tabular-nums">Цена</th>
      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Действия</th>
    </tr>
  </thead>
  <tbody>
    {results.map((item, index) => (
      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        {/* КОЛОНКА С ФОТО */}
        <td className="px-4 py-3">
          <ProductImageCell images={item.images} partNumber={item.partNumber} />
        </td>
        
        <td className="px-4 py-3">
          <a href={`/product/${item.partNumber}`} className="text-blue-600 hover:underline font-mono text-sm">
            {item.partNumber}
          </a>
        </td>
        
        <td className="px-4 py-3">
          <div className="text-sm text-gray-900 line-clamp-2">{item.description}</div>
        </td>
        
        <td className="px-4 py-3">
          <div className="text-sm text-gray-600">{item.manufacturer}</div>
        </td>
        
        <td className="px-4 py-3 text-right">
          <div className="text-sm font-semibold text-gray-900 tabular-nums">
            {item.price ? `₽${item.price.toFixed(2)}` : '—'}
          </div>
        </td>
        
        <td className="px-4 py-3 text-center">
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
            Купить
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
\`\`\`

**СОЗДАТЬ КОМПОНЕНТ: `components/ProductImageCell.tsx`**
\`\`\`typescript
"use client"

import { useState } from "react"
import Image from "next/image"

interface ProductImageCellProps {
  images?: string[]
  partNumber: string
}

export function ProductImageCell({ images, partNumber }: ProductImageCellProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)

  // Если нет изображений, показываем placeholder
  if (!images || images.length === 0) {
    return (
      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  // Если одно изображение
  if (images.length === 1) {
    return (
      <div className="w-16 h-16 relative">
        <Image
          src={images[0] || "/placeholder.svg"}
          alt={partNumber}
          fill
          className="object-contain rounded"
          sizes="64px"
        />
      </div>
    )
  }

  // Если несколько изображений - при ховере плавно переключаем
  return (
    <div
      className="w-16 h-16 relative cursor-pointer"
      onMouseEnter={() => {
        setIsHovering(true)
        // Запускаем плавное пролистывание
        const interval = setInterval(() => {
          setCurrentImageIndex((prev) => (prev + 1) % images.length)
        }, 800) // Меняем каждые 800ms
        
        // Сохраняем interval ID для очистки
        ;(window as any).__imageInterval = interval
      }}
      onMouseLeave={() => {
        setIsHovering(false)
        setCurrentImageIndex(0)
        // Очищаем interval
        if ((window as any).__imageInterval) {
          clearInterval((window as any).__imageInterval)
        }
      }}
    >
      <Image
        src={images[currentImageIndex] || "/placeholder.svg"}
        alt={`${partNumber} - фото ${currentImageIndex + 1}`}
        fill
        className="object-contain rounded transition-opacity duration-300"
        sizes="64px"
      />
      {images.length > 1 && (
        <div className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1 rounded">
          {currentImageIndex + 1}/{images.length}
        </div>
      )}
    </div>
  )
}
\`\`\`

**ПОЧЕМУ:** 
- Добавляем колонку с фото для лучшей визуализации товаров
- При наведении на фото с несколькими изображениями они плавно пролистываются
- Если фото нет - показываем красивый placeholder
- Используем `tabular-nums` для выравнивания цифр в цене

---

### 3.4 Правильный перенос длинных названий

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<td>{item.description}</td>
\`\`\`

**НА ЧТО МЕНЯТЬ:**
\`\`\`tsx
<td className="px-4 py-3 max-w-xs">
  <div className="text-sm text-gray-900 line-clamp-2">
    {item.description}
  </div>
</td>
\`\`\`

**ПОЧЕМУ:** `line-clamp-2` обрезает текст после 2 строк с многоточием, не создавая огромные строки.

---

## ЗАДАЧА 4: СТРАНИЦА КАРТОЧКИ ТОВАРА

### 4.1 Уменьшить изображение товара

**Файл: `app/product/[id]/page.tsx`**

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div className="lg:w-2/5">
  {/* Изображение товара */}
</div>
<div className="lg:w-3/5">
  {/* Информация о товаре */}
</div>
\`\`\`

**НА ЧТО МЕНЯТЬ:**
\`\`\`tsx
<div className="lg:w-1/4">
  {/* Изображение товара - теперь 25% вместо 40% */}
  <div className="sticky top-24">
    <div className="aspect-square relative bg-white rounded-lg border border-gray-200 p-4">
      <Image
        src={currentImage || "/placeholder.svg"}
        alt={product.partNumber}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 100vw, 25vw"
      />
    </div>
    
    {/* Миниатюры */}
    {product.images && product.images.length > 1 && (
      <div className="flex gap-2 mt-4 overflow-x-auto">
        {product.images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentImage(img)}
            className={`flex-shrink-0 w-16 h-16 rounded border-2 transition-all ${
              currentImage === img
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Image src={img || "/placeholder.svg"} alt={`Фото ${idx + 1}`} width={64} height={64} className="object-contain" />
          </button>
        ))}
      </div>
    )}
  </div>
</div>

<div className="lg:w-3/4 lg:pl-8">
  {/* Информация о товаре - теперь 75% */}
</div>
\`\`\`

**ПОЧЕМУ:** Уменьшаем изображение с 40% до 25%, освобождая место для информации. Делаем изображение sticky чтобы оно оставалось видимым при скролле.

---

### 4.2 Структурированная информация о товаре

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div>
  <h1>{product.partNumber}</h1>
  <p>{product.manufacturer}</p>
  <p>{product.description}</p>
  <div>Цена: {product.price}</div>
</div>
\`\`\`

**НА ЧТО МЕНЯТЬ:**
\`\`\`tsx
<div className="space-y-6">
  {/* Заголовок и производитель */}
  <div className="border-b border-gray-200 pb-4">
    <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.partNumber}</h1>
    <div className="flex items-center gap-2 text-gray-600">
      <span className="text-sm">Производитель:</span>
      <span className="font-semibold text-blue-600">{product.manufacturer}</span>
    </div>
  </div>

  {/* Описание */}
  <div className="border-b border-gray-200 pb-4">
    <h2 className="text-sm font-semibold text-gray-700 mb-2">Описание</h2>
    <p className="text-gray-900">{product.description}</p>
  </div>

  {/* Цена и наличие */}
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div className="flex items-baseline gap-3 mb-2">
      <span className="text-4xl font-bold text-gray-900 tabular-nums">
        ₽{product.price?.toFixed(2)}
      </span>
      {product.discountPrice && (
        <span className="text-2xl font-semibold text-green-600 tabular-nums">
          ₽{product.discountPrice.toFixed(2)}
        </span>
      )}
    </div>
    
    <div className="flex items-center gap-2 text-sm">
      <span className={`px-2 py-1 rounded ${
        product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {product.inStock ? `В наличии: ${product.stockQuantity} шт` : 'Нет в наличии'}
      </span>
      {product.leadTime && (
        <span className="text-gray-600">Срок поставки: {product.leadTime} дней</span>
      )}
    </div>
  </div>

  {/* БЛОК ЗАКАЗА - ПЕРЕМЕЩЕН СЮДА ВВЕРХ */}
  <div className="sticky top-24 bg-white border-2 border-blue-500 rounded-lg p-6 shadow-lg">
    <div className="flex items-center gap-4 mb-4">
      <label className="text-sm font-semibold text-gray-700">Количество:</label>
      <input
        type="number"
        min="1"
        defaultValue="1"
        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />
    </div>
    
    <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors">
      Добавить в заказ
    </button>
    
    <div className="mt-4 text-center">
      <span className="text-2xl font-bold text-gray-900 tabular-nums">
        Итого: ₽{(product.price * 1).toFixed(2)}
      </span>
    </div>
  </div>
</div>
\`\`\`

**ПОЧЕМУ:** 
- Добавляем четкую структуру с разделителями
- Выделяем цену и наличие в отдельный блок
- Перемещаем блок заказа вверх и делаем его sticky
- Убираем кнопку Datasheet (она есть в табе "Документы")

---

### 4.3 Улучшенные табы

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<div className="tabs">
  <button>Характеристики</button>
  <button>Предложения</button>
  <button>Документы</button>
</div>
\`\`\`

**НА ЧТО МЕНЯТЬ:**
\`\`\`tsx
<div className="border-b border-gray-200 mb-6">
  <nav className="flex gap-8">
    <button
      onClick={() => setActiveTab('specs')}
      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
        activeTab === 'specs'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Характеристики
    </button>
    <button
      onClick={() => setActiveTab('docs')}
      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
        activeTab === 'docs'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Документы
    </button>
  </nav>
</div>
\`\`\`

**ПОЧЕМУ:** 
- Убираем таб "Предложения" (предложения теперь справа от изображения)
- Делаем табы в стиле Material Design с подчеркиванием
- Улучшаем визуальную обратную связь

---

### 4.4 Таблица характеристик

**ЧТО ИСКАТЬ:**
\`\`\`tsx
<table>
  <tbody>
    {specs.map(spec => (
      <tr>
        <td>{spec.name}</td>
        <td>{spec.value}</td>
      </tr>
    ))}
  </tbody>
</table>
\`\`\`

**НА ЧТО МЕНЯТЬ:**
\`\`\`tsx
<table className="w-full">
  <tbody>
    {specs
      .filter(spec => spec.name !== 'Product URL') // СКРЫВАЕМ Product URL
      .map((spec, index) => (
        <tr
          key={index}
          className={`border-b border-gray-200 ${
            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
          }`}
        >
          <td className="px-4 py-3 text-sm font-medium text-gray-700 w-1/3">
            {spec.name}
          </td>
          <td className="px-4 py-3 text-sm text-gray-900">
            <div className="break-words">{spec.value}</div>
          </td>
        </tr>
      ))}
  </tbody>
</table>
\`\`\`

**ПОЧЕМУ:**
- Чередующиеся строки для лучшей читаемости
- Скрываем поле "Product URL" через filter
- Добавляем `break-words` для правильного переноса длинных значений

---

## ЗАДАЧА 5: ПРЕДЛОЖЕНИЯ (OFFERS)

**Файл: `app/product/[id]/page.tsx`**

**УБРАТЬ таб "Предложения" и добавить блок справа от изображения:**

\`\`\`tsx
<div className="lg:w-1/4">
  {/* Изображение товара */}
  <div className="sticky top-24">
    {/* ... изображение ... */}
    
    {/* БЛОК ПРЕДЛОЖЕНИЙ ПОД ИЗОБРАЖЕНИЕМ */}
    {product.offers && product.offers.length > 0 && (
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Предложения ({product.offers.length})
        </h3>
        <div className="space-y-2">
          {product.offers.slice(0, 3).map((offer, idx) => (
            <div key={idx} className="text-xs border-b border-gray-100 pb-2 last:border-0">
              <div className="font-medium text-gray-900">{offer.supplier}</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-600">{offer.quantity} шт</span>
                <span className="font-semibold text-blue-600 tabular-nums">
                  ₽{offer.price.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {product.offers.length > 3 && (
          <button className="text-xs text-blue-600 hover:underline mt-2">
            Показать все ({product.offers.length})
          </button>
        )}
      </div>
    )}
  </div>
</div>
\`\`\`

**ПОЧЕМУ:** Предложения компактно размещены рядом с изображением, не занимают отдельный таб.

---

## ПРОВЕРКА ПОСЛЕ ВЫПОЛНЕНИЯ

### Чеклист для исполнителя:

- [ ] Создан компонент `MicrochipLoader.tsx`
- [ ] Добавлены CSS анимации для лоадера в `globals.css`
- [ ] Лоадер используется в `loading.tsx` и `client-layout.tsx`
- [ ] Логотип заменен на иконку чипа БЕЗ текста "ДИПОНИКА" на всех страницах
- [ ] В таблице результатов добавлена колонка "Фото"
- [ ] Создан компонент `ProductImageCell.tsx` с ховер-эффектом
- [ ] Фильтры цены компактные (w-24)
- [ ] Чекбокс "Только в наличии" стилизован
- [ ] Длинные названия обрезаются через `line-clamp-2`
- [ ] Изображение товара уменьшено до 25% (lg:w-1/4)
- [ ] Информация о товаре структурирована с рамками
- [ ] Блок заказа перемещен вверх и сделан sticky
- [ ] Таб "Предложения" убран
- [ ] Предложения показываются под изображением
- [ ] Поле "Product URL" скрыто в характеристиках
- [ ] Таблица характеристик с чередующимися строками
- [ ] Все работает на мобильных устройствах

### Тестирование:

1. Открыть главную страницу - проверить новый логотип
2. Сделать поиск - проверить колонку с фото и ховер-эффект
3. Открыть карточку товара - проверить layout и блок заказа
4. Проверить на мобильном (responsive)
5. Проверить что API запросы работают

---

## ВАЖНО

- Все изменения ТОЛЬКО визуальные
- НЕ трогать API endpoints и fetch запросы
- НЕ менять логику обработки данных
- Использовать существующие Tailwind классы
- Тестировать после каждого изменения

---

**Конец инструкций**
