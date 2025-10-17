# ИНСТРУКЦИИ ПО ПЕРЕДЕЛКЕ КАРТОЧКИ ТОВАРА

## ОБЗОР ИЗМЕНЕНИЙ

Переделываем карточку товара на **компактный 3-колоночный layout** (вариант 3):
- **Колонка 1:** Картинка + миниатюры
- **Колонка 2:** Название + производитель + описание + PDF документы (мелкие иконки)
- **Колонка 3:** Цена + блок покупки
- **Внизу:** Табы только для Характеристик и Предложений (документы убраны из табов)

---

## ФАЙЛ: `app/product/[id]/page.tsx`

### ШАГ 1: Найти основной layout контейнер

**Найти:**
\`\`\`tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
\`\`\`

**Заменить на:**
\`\`\`tsx
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
\`\`\`

**Пояснение:** Меняем на 12-колоночную сетку для более гибкого управления шириной колонок.

---

### ШАГ 2: Переделать блок с картинкой

**Найти:**
\`\`\`tsx
<div className="lg:col-span-2">
  {/* Картинка */}
</div>
\`\`\`

**Заменить на:**
\`\`\`tsx
<div className="lg:col-span-3">
  <div className="bg-white rounded-lg border p-4">
    {/* Основная картинка */}
    <div className="relative aspect-square mb-4 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
      <Image
        src={currentImage || "/placeholder.svg"}
        alt={mockProduct.name}
        fill
        className="object-contain p-4"
        onError={(e) => {
          e.currentTarget.src = "/placeholder.svg?height=400&width=400"
        }}
      />
    </div>

    {/* Миниатюры */}
    {mockProduct.images.length > 1 && (
      <div className="flex gap-2">
        {mockProduct.images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentImage(img)}
            onMouseEnter={() => setCurrentImage(img)}
            className={`relative w-16 h-16 rounded border-2 transition-all overflow-hidden ${
              currentImage === img
                ? "border-blue-500 ring-2 ring-blue-200"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Image
              src={img || "/placeholder.svg"}
              alt={`View ${idx + 1}`}
              fill
              className="object-contain p-1"
            />
          </button>
        ))}
      </div>
    )}
  </div>
</div>
\`\`\`

**Пояснение:** 
- Колонка занимает 3 из 12 колонок (25% ширины)
- Картинка квадратная с aspect-square
- Миниатюры переключаются по клику и наведению
- Обработка ошибок загрузки картинок

---

### ШАГ 3: Создать блок с информацией и документами

**Найти блок с названием товара и заменить на:**

\`\`\`tsx
<div className="lg:col-span-5">
  <div className="bg-white rounded-lg border p-6">
    {/* Название товара */}
    <h1 className="text-2xl font-bold text-gray-900 mb-2 line-clamp-3">
      {mockProduct.name}
    </h1>

    {/* Производитель */}
    <div className="text-sm text-gray-600 mb-4">
      <span className="font-medium">Производитель:</span>{" "}
      <span className="text-blue-600">{mockProduct.manufacturer}</span>
    </div>

    {/* Описание */}
    <div className="text-sm text-gray-700 mb-4 leading-relaxed">
      {mockProduct.description}
    </div>

    {/* PDF Документы - мелкие иконки */}
    {mockProduct.documents && mockProduct.documents.length > 0 && (
      <div className="flex items-center gap-2 pt-2 border-t">
        <span className="text-xs text-gray-500">Документы:</span>
        <div className="flex gap-1">
          {mockProduct.documents.map((doc, idx) => (
            <a
              key={idx}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
              title={doc.name}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              PDF
            </a>
          ))}
        </div>
      </div>
    )}
  </div>
</div>
\`\`\`

**Пояснение:**
- Колонка занимает 5 из 12 колонок (~42% ширины)
- Название с line-clamp-3 (максимум 3 строки)
- Описание с хорошим line-height
- PDF документы - маленькие inline кнопки с иконкой, не привлекают много внимания
- Все в одной белой карточке

---

### ШАГ 4: Создать компактный блок покупки

**Заменить блок с ценой на:**

\`\`\`tsx
<div className="lg:col-span-4">
  <div className="bg-white rounded-lg border p-6 sticky top-4">
    {/* Цена */}
    <div className="mb-4">
      <div className="text-sm text-gray-600 mb-1">Лучшая цена</div>
      <div className="text-3xl font-bold text-green-600">
        ₽{mockProduct.price.toFixed(2)}
      </div>
      <div className="text-xs text-gray-500">за единицу</div>
    </div>

    {/* Наличие */}
    <div className="mb-4 pb-4 border-b">
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-gray-700">
          В наличии: <span className="font-semibold">{mockProduct.stock.toLocaleString()}</span> шт
        </span>
      </div>
    </div>

    {/* Количество */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Количество
      </label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          −
        </button>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-16 h-8 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="1"
        />
        <button
          onClick={() => setQuantity(quantity + 1)}
          className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          +
        </button>
      </div>
    </div>

    {/* Итого */}
    <div className="mb-4 pb-4 border-b">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Итого:</span>
        <span className="text-xl font-bold text-gray-900">
          ₽{(mockProduct.price * quantity).toFixed(2)}
        </span>
      </div>
    </div>

    {/* Кнопка Купить */}
    <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mb-3">
      Купить
    </button>

    {/* Регионы */}
    {mockProduct.regions && mockProduct.regions.length > 0 && (
      <div className="pt-3 border-t">
        <div className="text-xs text-gray-500 mb-2">Доступно в регионах:</div>
        <div className="flex flex-wrap gap-1">
          {mockProduct.regions.map((region, idx) => (
            <span
              key={idx}
              className="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded"
            >
              {region}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
</div>
\`\`\`

**Пояснение:**
- Колонка занимает 4 из 12 колонок (~33% ширины)
- Компактный селектор количества (узкое поле 64px)
- Кнопка "Купить" (не "Добавить в заказ")
- sticky top-4 - блок прилипает при скролле
- Регионы внизу маленькими бейджами

---

### ШАГ 5: Убрать документы из табов

**Найти массив табов:**
\`\`\`tsx
const tabs = [
  { id: "characteristics", label: "Характеристики" },
  { id: "offers", label: "Предложения" },
  { id: "documents", label: "Документы" }, // <-- УДАЛИТЬ ЭТУ СТРОКУ
]
\`\`\`

**Заменить на:**
\`\`\`tsx
const tabs = [
  { id: "characteristics", label: "Характеристики" },
  { id: "offers", label: "Предложения" },
]
\`\`\`

**Найти и удалить весь блок рендеринга документов в табах:**
\`\`\`tsx
{activeTab === "documents" && (
  <div className="space-y-2">
    {/* ... весь код документов ... */}
  </div>
)}
\`\`\`

**Пояснение:** Документы теперь показываются в блоке информации, не нужны в табах.

---

### ШАГ 6: Исправить мобильную адаптацию

**Найти контейнер табов и убедиться что есть:**
\`\`\`tsx
<div className="lg:col-span-12">
  <div className="bg-white rounded-lg border">
    {/* Табы */}
  </div>
</div>
\`\`\`

**Пояснение:** На мобилке все колонки стекаются вертикально (grid-cols-1), на десктопе табы занимают всю ширину (col-span-12).

---

### ШАГ 7: Добавить тестовые данные для документов

**В начале компонента, в mockProduct добавить:**
\`\`\`tsx
const mockProduct = {
  documents: [
    {
      name: "Datasheet",
      url: "#",
      type: "PDF"
    },
    {
      name: "Technical Specs",
      url: "#",
      type: "PDF"
    }
  ],
}
\`\`\`

---

### ШАГ 8: Добавить state для текущей картинки

**В начале компонента добавить:**
\`\`\`tsx
const [currentImage, setCurrentImage] = useState(mockProduct.images[0])
\`\`\`

**Найти импорты и добавить useState если его нет:**
\`\`\`tsx
import { useState } from "react"
\`\`\`

---

## МОБИЛЬНАЯ АДАПТАЦИЯ

На мобилке (< 1024px) все автоматически стекается вертикально:

\`\`\`
┌──────────────┐
│ [Картинка]   │
│ [Миниатюры]  │
├──────────────┤
│ Название     │
│ Производитель│
│ Описание     │
│ 📄 PDF PDF   │
├──────────────┤
│ Цена         │
│ Количество   │
│ [Купить]     │
│ Регионы      │
├──────────────┤
│ [Табы]       │
└──────────────┘
\`\`\`

---

## ЧЕКЛИСТ ПРОВЕРКИ

### Десктоп (>1024px):
- [ ] Три колонки: картинка (25%) | инфо (42%) | покупка (33%)
- [ ] Картинка квадратная с миниатюрами внизу
- [ ] Миниатюры переключают картинку при наведении
- [ ] PDF документы - маленькие inline кнопки с иконкой
- [ ] Селектор количества компактный (поле 64px)
- [ ] Кнопка "Купить" (не "Добавить в заказ")
- [ ] Блок покупки прилипает при скролле (sticky)
- [ ] Табы только "Характеристики" и "Предложения"
- [ ] Табы на всю ширину экрана
- [ ] Таблица характеристик с max-height и скроллом

### Планшет (768px - 1024px):
- [ ] Все стекается вертикально
- [ ] Блоки на всю ширину
- [ ] Кнопки удобно нажимать

### Мобилка (<768px):
- [ ] Вертикальный layout
- [ ] Картинка → Инфо → Покупка → Табы
- [ ] Кнопка "Купить" на всю ширину
- [ ] Табы с горизонтальным скроллом если не влезают
- [ ] Таблицы с горизонтальным скроллом

---

## ТИПИЧНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема 1: Картинки не загружаются
**Решение:** Проверь что в onError есть fallback на placeholder

### Проблема 2: Блок покупки не прилипает
**Решение:** Убедись что родитель не имеет overflow-hidden

### Проблема 3: PDF иконки слишком большие
**Решение:** Проверь что используется text-xs и w-3 h-3 для SVG

### Проблема 4: На мобилке кнопки слишком маленькие
**Решение:** Убедись что кнопки имеют минимум h-10 (40px) для удобного нажатия

### Проблема 5: Табы прыгают при переключении
**Решение:** Добавь min-h-[400px] на контейнер контента табов

---

## ОЦЕНКА ВРЕМЕНИ

- **Изменение layout:** 30 минут
- **Переделка блока документов:** 15 минут
- **Тестирование на разных экранах:** 20 минут
- **Исправление багов:** 15 минут

**ИТОГО:** ~1.5 часа

---

## ФИНАЛЬНАЯ ПРОВЕРКА

После внедрения открой страницу товара и проверь:

1. **Десктоп:** Открой `/product/[id]` на широком экране
   - Три колонки рядом
   - PDF документы маленькие
   - Блок покупки прилипает при скролле

2. **Мобилка:** Открой в DevTools с шириной 375px
   - Все вертикально
   - Кнопки удобно нажимать
   - Нет горизонтального скролла (кроме таблиц)

3. **Планшет:** Проверь на ширине 768px
   - Плавный переход между layouts
   - Все читаемо

---

## КОНТАКТЫ ДЛЯ ВОПРОСОВ

Если что-то непонятно или не работает - пиши в чат, разберем.
