# ПОШАГОВЫЕ ИНСТРУКЦИИ ПО ПЕРЕДЕЛКЕ КАРТОЧКИ ТОВАРА
## ДЛЯ ИСПОЛНИТЕЛЯ (МАКСИМАЛЬНО ДЕТАЛЬНО)

---

## ⚠️ ВАЖНО ПЕРЕД НАЧАЛОМ

1. **Сделай бэкап** текущего файла `app/product/[id]/page.tsx`
2. **Открой файл** `app/product/[id]/page.tsx` в редакторе
3. **Читай каждый шаг** и делай ТОЧНО как написано
4. **Проверяй результат** после каждого шага
5. **Не пропускай** ни одного шага

---

## ШАГ 1: НАЙТИ ТЕКУЩУЮ СТРУКТУРУ LAYOUT

### 1.1 Найди в файле строку с классом `grid grid-cols-1 lg:grid-cols-3`

Это текущая структура с 3 колонками. Выглядит примерно так:

\`\`\`tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Левая колонка - картинка */}
  <div className="lg:col-span-1">
    ...
  </div>
  
  {/* Средняя колонка - инфо */}
  <div className="lg:col-span-1">
    ...
  </div>
  
  {/* Правая колонка - цена */}
  <div className="lg:col-span-1">
    ...
  </div>
</div>
\`\`\`

### 1.2 Проверка
✅ Нашел эту структуру? Переходи к шагу 2
❌ Не нашел? Скопируй весь файл и отправь мне

---

## ШАГ 2: ЗАМЕНИТЬ СТРУКТУРУ НА НОВУЮ

### 2.1 Удали ВСЮ секцию с `grid grid-cols-1 lg:grid-cols-3`

Удали от открывающего `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">` до закрывающего `</div>` этого блока.

### 2.2 Вставь НОВУЮ структуру на это место:

\`\`\`tsx
{/* НОВАЯ СТРУКТУРА: 3 колонки на десктопе */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
  
  {/* КОЛОНКА 1: Картинка (3 колонки из 12) */}
  <div className="lg:col-span-3">
    <div className="bg-background rounded-lg border p-4">
      {/* Основная картинка */}
      <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        {selectedImage ? (
          <img
            src={selectedImage || "/placeholder.svg"}
            alt={product.partNumber}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg?height=300&width=300'
            }}
          />
        ) : (
          <div className="text-muted-foreground text-sm">No image</div>
        )}
      </div>

      {/* Миниатюры */}
      <div className="flex gap-2">
        {product.images?.map((img: string, idx: number) => (
          <button
            key={idx}
            onClick={() => setSelectedImage(img)}
            className={`w-16 h-16 rounded border-2 overflow-hidden transition-all ${
              selectedImage === img ? 'border-primary' : 'border-border hover:border-primary/50'
            }`}
          >
            <img
              src={img || "/placeholder.svg"}
              alt={`${product.partNumber} view ${idx + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg?height=64&width=64'
              }}
            />
          </button>
        ))}
      </div>
    </div>
  </div>

  {/* КОЛОНКА 2: Информация о товаре (6 колонок из 12) */}
  <div className="lg:col-span-6">
    <div className="space-y-4">
      {/* Название товара */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          {product.partNumber}
        </h1>
        <p className="text-sm text-muted-foreground">
          {product.manufacturer}
        </p>
      </div>

      {/* Описание */}
      <div className="text-sm text-foreground leading-relaxed">
        {product.description}
      </div>

      {/* ДОКУМЕНТЫ - маленькие иконки в одну строку */}
      {product.documents && product.documents.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Документы:</span>
          <div className="flex gap-2">
            {product.documents.map((doc: any, idx: number) => (
              <a
                key={idx}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 transition-colors text-xs"
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

      {/* Наличие */}
      <div className="text-sm">
        <span className="text-green-600 font-medium">
          В наличии: {product.stock?.toLocaleString() || 0} шт
        </span>
      </div>
    </div>
  </div>

  {/* КОЛОНКА 3: Цена и покупка (3 колонки из 12) */}
  <div className="lg:col-span-3">
    <div className="bg-background rounded-lg border p-4 sticky top-4">
      <div className="space-y-4">
        {/* Лучшая цена */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Лучшая цена</p>
          <p className="text-3xl font-bold text-green-600">
            ₽{product.bestPrice?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">за единицу</p>
        </div>

        {/* Количество */}
        <div>
          <label className="text-sm text-muted-foreground block mb-2">
            Количество
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded border border-border hover:bg-muted flex items-center justify-center transition-colors"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-8 text-center border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              min="1"
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded border border-border hover:bg-muted flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Общая стоимость */}
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">Итого:</span>
            <span className="text-xl font-bold text-foreground">
              ₽{((product.bestPrice || 0) * quantity).toFixed(2)}
            </span>
          </div>

          {/* Кнопка Купить */}
          <button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-lg font-medium transition-colors">
            Купить
          </button>
        </div>

        {/* Регионы */}
        {product.regions && product.regions.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Регионы:</p>
            <div className="flex flex-wrap gap-2">
              {product.regions.map((region: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs"
                >
                  {region}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
</div>
\`\`\`

### 2.3 Проверка после замены
1. Сохрани файл
2. Обнови страницу в браузере
3. Проверь что видишь:
   - ✅ Картинка слева (узкая колонка)
   - ✅ Информация о товаре в центре (широкая)
   - ✅ Цена и кнопка справа (узкая колонка)
   - ✅ Маленькие PDF иконки под описанием

❌ Если что-то не так - скопируй ошибку из консоли браузера и отправь мне

---

## ШАГ 3: ИЗМЕНИТЬ ТАБЫ (убрать "Документы")

### 3.1 Найди секцию с табами

Ищи код который выглядит так:

\`\`\`tsx
<Tabs defaultValue="characteristics">
  <TabsList>
    <TabsTrigger value="characteristics">Характеристики</TabsTrigger>
    <TabsTrigger value="offers">Предложения</TabsTrigger>
    <TabsTrigger value="documents">Документы</TabsTrigger>
  </TabsList>
\`\`\`

### 3.2 Удали таб "Документы"

Удали строку:
\`\`\`tsx
<TabsTrigger value="documents">Документы</TabsTrigger>
\`\`\`

### 3.3 Удали контент таба "Документы"

Найди и удали весь блок:
\`\`\`tsx
<TabsContent value="documents">
  ...весь контент...
</TabsContent>
\`\`\`

### 3.4 Проверка
1. Сохрани файл
2. Обнови страницу
3. Проверь что видишь только 2 таба:
   - ✅ Характеристики
   - ✅ Предложения
   - ❌ Документы (должен исчезнуть)

---

## ШАГ 4: ДОБАВИТЬ STATE ДЛЯ КАРТИНОК

### 4.1 Найди секцию с useState в начале компонента

Ищи строки типа:
\`\`\`tsx
const [quantity, setQuantity] = useState(1)
\`\`\`

### 4.2 Добавь новый state ПОСЛЕ существующих:

\`\`\`tsx
const [selectedImage, setSelectedImage] = useState<string>(
  product.images?.[0] || '/placeholder.svg?height=400&width=400'
)
\`\`\`

### 4.3 Проверка
1. Сохрани файл
2. Обнови страницу
3. Проверь что нет ошибок в консоли браузера

---

## ШАГ 5: МОБИЛЬНАЯ АДАПТАЦИЯ

### 5.1 Проверь что используются правильные классы

В новой структуре должны быть классы:
- `grid-cols-1` - для мобилки (1 колонка)
- `lg:grid-cols-12` - для десктопа (12 колонок)
- `lg:col-span-3` - картинка занимает 3 из 12
- `lg:col-span-6` - инфо занимает 6 из 12
- `lg:col-span-3` - цена занимает 3 из 12

### 5.2 Проверка на мобилке
1. Открой DevTools (F12)
2. Включи режим мобильного устройства (Ctrl+Shift+M)
3. Проверь что видишь вертикальный layout:
   - ✅ Картинка сверху
   - ✅ Информация под картинкой
   - ✅ Цена и кнопка под информацией
   - ✅ Табы внизу

---

## ШАГ 6: ФИНАЛЬНАЯ ПРОВЕРКА

### 6.1 Чеклист для ДЕСКТОПА (ширина > 1024px):

- [ ] Три колонки: картинка (узкая) | инфо (широкая) | цена (узкая)
- [ ] Картинка с миниатюрами внизу
- [ ] Название товара крупным шрифтом
- [ ] Описание под названием
- [ ] Маленькие PDF иконки в одну строку (не таб!)
- [ ] "В наличии: X шт" зеленым цветом
- [ ] Блок цены справа с "Лучшая цена"
- [ ] Селектор количества: кнопки - [ 1 ] +
- [ ] Кнопка "Купить" синяя на всю ширину
- [ ] Регионы под кнопкой (синие бейджи)
- [ ] Только 2 таба: Характеристики и Предложения
- [ ] Футер не прыгает при переключении табов

### 6.2 Чеклист для МОБИЛКИ (ширина < 768px):

- [ ] Одна колонка, все вертикально
- [ ] Картинка сверху
- [ ] Миниатюры под картинкой
- [ ] Название товара
- [ ] Описание
- [ ] PDF иконки
- [ ] Наличие
- [ ] Цена
- [ ] Селектор количества
- [ ] Кнопка "Купить" на всю ширину
- [ ] Регионы
- [ ] Табы внизу

### 6.3 Чеклист для ПЛАНШЕТА (768px - 1024px):

- [ ] Две колонки: картинка+инфо | цена
- [ ] Все элементы видны и не перекрываются

---

## ШАГ 7: ИСПРАВЛЕНИЕ ТИПИЧНЫХ ОШИБОК

### Ошибка 1: "[object Object]" в таблице
**Причина:** Пытаешься вывести объект как строку

**Решение:** Найди в коде где выводятся данные таблицы и используй:
\`\`\`tsx
{typeof value === 'object' ? JSON.stringify(value) : value}
\`\`\`

### Ошибка 2: Текст наезжает друг на друга
**Причина:** Не хватает отступов или ширины

**Решение:** Добавь классы:
\`\`\`tsx
className="break-words overflow-hidden"
\`\`\`

### Ошибка 3: Картинка не загружается
**Причина:** Неправильный URL или CORS

**Решение:** Используй обработчик ошибок:
\`\`\`tsx
onError={(e) => {
  e.currentTarget.src = '/placeholder.svg?height=300&width=300'
}}
\`\`\`

### Ошибка 4: Футер прыгает
**Причина:** Разная высота контента в табах

**Решение:** Добавь к контейнеру табов:
\`\`\`tsx
className="min-h-[600px]"
\`\`\`

---

## ШАГ 8: ТЕСТИРОВАНИЕ

### 8.1 Открой эти страницы и проверь:
1. `/product/BSS138L`
2. `/product/GRM033C71C104KE14D`
3. `/product/JMK105BJ105KV-F`

### 8.2 На каждой странице проверь:
- [ ] Все элементы на месте
- [ ] Нет ошибок в консоли
- [ ] Картинки загружаются
- [ ] Кнопки работают
- [ ] Табы переключаются
- [ ] Футер не прыгает

---

## ШАГ 9: ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### 9.1 Собери информацию:
1. Скриншот страницы
2. Ошибки из консоли браузера (F12 → Console)
3. Какой шаг выполнял когда сломалось

### 9.2 Отправь мне:
- Скриншот
- Текст ошибки
- Номер шага

---

## ОЦЕНКА ВРЕМЕНИ

- Шаг 1-2: 15 минут (замена структуры)
- Шаг 3: 5 минут (удаление таба)
- Шаг 4: 5 минут (добавление state)
- Шаг 5: 10 минут (проверка мобилки)
- Шаг 6-8: 20 минут (тестирование)

**ИТОГО: ~1 час работы**

---

## ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **НЕ МЕНЯЙ** другие файлы - только `app/product/[id]/page.tsx`
2. **НЕ УДАЛЯЙ** существующую логику (API запросы, обработчики)
3. **МЕНЯЙ ТОЛЬКО** структуру layout и расположение элементов
4. **ПРОВЕРЯЙ** после каждого шага
5. **НЕ СПЕШИ** - лучше медленно но правильно

---

## КОНТРОЛЬНЫЕ ТОЧКИ

После выполнения ВСЕХ шагов у тебя должно быть:

✅ Три колонки на десктопе (картинка | инфо | цена)
✅ Одна колонка на мобилке (все вертикально)
✅ Маленькие PDF иконки (не таб)
✅ Только 2 таба (Характеристики, Предложения)
✅ Футер не прыгает
✅ Нет ошибок в консоли
✅ Все работает на всех устройствах

---

## ФИНАЛЬНАЯ ПРОВЕРКА

Открой страницу и сравни со скриншотом из v0 preview:
- Должно выглядеть ТОЧНО ТАК ЖЕ
- Если есть отличия - значит что-то пропустил

**УДАЧИ! СЛЕДУЙ ИНСТРУКЦИЯМ ТОЧНО И ВСЕ ПОЛУЧИТСЯ!**
