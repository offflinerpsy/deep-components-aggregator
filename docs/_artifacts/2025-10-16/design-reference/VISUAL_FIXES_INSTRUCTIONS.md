# ИНСТРУКЦИИ ПО ВИЗУАЛЬНЫМ ПРАВКАМ ДЛЯ ИСПОЛНИТЕЛЯ

## ВАЖНО: ЭТО ТОЛЬКО ВИЗУАЛЬНЫЕ ПРАВКИ
- НЕ трогать API вызовы
- НЕ трогать логику работы с данными
- НЕ трогать обработчики событий (только если не указано)
- Менять ТОЛЬКО стили (className, CSS)

---

## 1. ГЛАВНАЯ СТРАНИЦА (app/page.tsx)

### Проблема 1: Градиентный фон
**ЧТО ИСКАТЬ:** В файле `app/globals.css` строки 130-180
\`\`\`css
body {
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 50%, #dce4f0 100%);
}

body::before {
  background: radial-gradient(circle at 20% 30%, rgba(102, 126, 234, 0.25) 0%, transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(118, 75, 162, 0.2) 0%, transparent 40%),
    ...
}
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`css
body {
  background: #ffffff;
}

body::before {
  display: none;
}

body::after {
  display: none;
}

.dark body {
  background: #0f0c29;
}
\`\`\`

**ПОЧЕМУ:** Убираем все градиенты, делаем чистый белый фон для светлой темы

---

### Проблема 2: Заголовок "ЧТО ИЩУТ ЛЮДИ"
**ЧТО ИСКАТЬ:** В файле `app/page.tsx` примерно строка 180-185
\`\`\`tsx
<h2 className="text-2xl font-light text-center mb-8 text-foreground">ЧТО ИЩУТ ЛЮДИ</h2>
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
<h2 className="text-3xl font-semibold text-center mb-8 text-gray-900 dark:text-white">ЧТО ИЩУТ ЛЮДИ</h2>
\`\`\`

**ПОЧЕМУ:** Увеличиваем размер, делаем жирнее, темнее для лучшей читаемости

---

### Проблема 3: Карточки компонентов
**ЧТО ИСКАТЬ:** В файле `app/globals.css` строки 400-450
\`\`\`css
.component-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4);
}
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`css
.component-card {
  background: #ffffff;
  backdrop-filter: none;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.component-card:hover {
  background: #ffffff;
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
  border-color: #3b82f6;
}

.dark .component-card {
  background: #1f2937;
  border: 1px solid #374151;
}

.dark .component-card:hover {
  background: #1f2937;
  border-color: #3b82f6;
}
\`\`\`

**ПОЧЕМУ:** Убираем прозрачность и blur, делаем четкие белые карточки с легкой тенью

---

### Проблема 4: Хедер
**ЧТО ИСКАТЬ:** В файле `app/page.tsx` примерно строка 50-60
\`\`\`tsx
<div className="container mx-auto px-6 py-4 flex items-center justify-between">
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
<div className="container mx-auto px-6 py-6 flex items-center justify-between">
\`\`\`

**ПОЧЕМУ:** Увеличиваем padding с py-4 на py-6 для большего визуального веса

---

## 2. СТРАНИЦА ПОИСКА (app/search/page.tsx)

### Проблема 5: Фон страницы поиска
**ЧТО ИСКАТЬ:** Уже исправлено в globals.css (см. Проблему 1)

---

### Проблема 6: Таблица результатов - фон строк
**ЧТО ИСКАТЬ:** В файле `app/search/page.tsx` примерно строка 150-160
\`\`\`tsx
<thead className="bg-white/30 dark:bg-black/30">
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
<thead className="bg-gray-50 dark:bg-gray-800">
\`\`\`

**ПОЧЕМУ:** Убираем прозрачность, делаем четкий серый фон для заголовков таблицы

---

### Проблема 7: Hover эффект строк таблицы
**ЧТО ИСКАТЬ:** В файле `app/search/page.tsx` примерно строка 180
\`\`\`tsx
className="cursor-pointer hover:bg-white/20 dark:hover:bg-white/5 transition-all"
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
\`\`\`

**ПОЧЕМУ:** Убираем прозрачность, делаем четкий серый hover

---

### Проблема 8: Обертка таблицы
**ЧТО ИСКАТЬ:** В файле `app/search/page.tsx` примерно строка 140
\`\`\`tsx
<div className="glass-card rounded-xl overflow-hidden">
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
<div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
\`\`\`

**ПОЧЕМУ:** Убираем glass-card, делаем четкий белый фон с границей

---

### Проблема 9: Ячейки с фото
**ЧТО ИСКАТЬ:** В файле `app/search/page.tsx` примерно строка 190
\`\`\`tsx
<div className="w-16 h-16 rounded-lg bg-white/50 dark:bg-black/30 flex items-center justify-center border border-white/30">
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
<div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
\`\`\`

**ПОЧЕМУ:** Убираем прозрачность, делаем четкий серый фон

---

### Проблема 10: Бейджи регионов
**ЧТО ИСКАТЬ:** В файле `app/search/page.tsx` примерно строка 220
\`\`\`tsx
className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
\`\`\`

**ПОЧЕМУ:** Убираем прозрачность, делаем четкие цвета

---

### Проблема 11: Кнопка "Купить"
**ЧТО ИСКАТЬ:** В файле `app/search/page.tsx` примерно строка 260
\`\`\`tsx
className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500 text-blue-600 hover:text-white border border-blue-500/50 rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg font-medium transition-all duration-300 hover:shadow-lg"
\`\`\`

**ПОЧЕМУ:** Делаем кнопку сразу синей с белым текстом, убираем прозрачность

---

## 3. СТРАНИЦА ТОВАРА (app/product/[id]/page.tsx)

### Проблема 12: Карточка товара
**ЧТО ИСКАТЬ:** В файле `app/globals.css` строки 250-280
\`\`\`css
.glass-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4);
}
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`css
.glass-card {
  background: #ffffff;
  backdrop-filter: none;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.glass-card:hover {
  background: #ffffff;
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
}

.dark .glass-card {
  background: #1f2937;
  border: 1px solid #374151;
}

.dark .glass-card:hover {
  background: #1f2937;
}
\`\`\`

**ПОЧЕМУ:** Убираем прозрачность и blur, делаем четкие белые карточки

---

### Проблема 13: Заголовок товара
**ЧТО ИСКАТЬ:** В файле `app/product/[id]/page.tsx` примерно строка 180
\`\`\`tsx
<h1 className="text-3xl font-semibold mb-2">{product.mpn}</h1>
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
<h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">{product.mpn}</h1>
\`\`\`

**ПОЧЕМУ:** Увеличиваем размер, делаем жирнее, добавляем четкий цвет

---

### Проблема 14: Цена товара
**ЧТО ИСКАТЬ:** В файле `app/product/[id]/page.tsx` примерно строка 220
\`\`\`tsx
<div className="text-2xl font-bold text-green-600 dark:text-green-400">₽{bestPrice.toFixed(2)}</div>
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
<div className="text-4xl font-bold text-green-600 dark:text-green-400">₽{bestPrice.toFixed(2)}</div>
\`\`\`

**ПОЧЕМУ:** Увеличиваем размер цены с text-2xl на text-4xl

---

### Проблема 15: Таблица характеристик
**ЧТО ИСКАТЬ:** В файле `app/product/[id]/page.tsx` примерно строка 250-280
\`\`\`tsx
<div className="flex py-3 border-b border-border/50">
  <div className="w-1/2 text-sm text-muted-foreground">{key}</div>
  <div className="w-1/2 text-sm font-medium">{value}</div>
</div>
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
<div className="flex py-4 border-b border-gray-200 dark:border-gray-700 odd:bg-gray-50 dark:odd:bg-gray-800">
  <div className="w-1/2 text-sm text-gray-600 dark:text-gray-400 px-4">{key}</div>
  <div className="w-1/2 text-sm font-medium text-gray-900 dark:text-white px-4">{value}</div>
</div>
\`\`\`

**ПОЧЕМУ:** Добавляем чередующиеся строки (odd:bg-gray-50), четкие границы, padding, четкие цвета

---

### Проблема 16: Кнопка "Заказать"
**ЧТО ИСКАТЬ:** В файле `app/product/[id]/page.tsx` примерно строка 230
\`\`\`tsx
className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 transform hover:-translate-y-1"
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`tsx
className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
\`\`\`

**ПОЧЕМУ:** Убираем градиент, делаем простую синюю кнопку

---

### Проблема 17: Модальное окно заказа
**ЧТО ИСКАТЬ:** В файле `app/globals.css` строки 900-920
\`\`\`css
.modal-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`css
.modal-content {
  background: #ffffff;
  backdrop-filter: none;
  border: 1px solid #e5e7eb;
}

.dark .modal-content {
  background: #1f2937;
  border: 1px solid #374151;
}
\`\`\`

**ПОЧЕМУ:** Убираем прозрачность и blur, делаем четкий белый фон

---

### Проблема 18: Изображение товара
**ЧТО ИСКАТЬ:** В файле `app/product/[id]/page.tsx` примерно строка 150
\`\`\`tsx
<div className="image-slider mb-4">
  <div className="w-full h-full flex items-center justify-center">
\`\`\`

**ЧТО МЕНЯТЬ:**
Добавить стили для увеличения размера:
\`\`\`tsx
<div className="image-slider mb-4" style={{ minHeight: '400px' }}>
  <div className="w-full h-full flex items-center justify-center p-8">
\`\`\`

**ПОЧЕМУ:** Увеличиваем минимальную высоту изображения и добавляем padding

---

## 4. ОБЩИЕ ПРАВКИ (app/globals.css)

### Проблема 19: Glass эффект в хедере
**ЧТО ИСКАТЬ:** В файле `app/globals.css` строки 200-220
\`\`\`css
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`css
.glass {
  background: #ffffff;
  backdrop-filter: none;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.dark .glass {
  background: #1f2937;
  border-bottom: 1px solid #374151;
}
\`\`\`

**ПОЧЕМУ:** Убираем прозрачность и blur, делаем четкий белый хедер

---

### Проблема 20: Поисковая строка
**ЧТО ИСКАТЬ:** В файле `app/globals.css` строки 300-320
\`\`\`css
.search-box {
  border: solid 0.3em rgba(102, 126, 234, 0.5);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
}
\`\`\`

**ЧТО МЕНЯТЬ:**
\`\`\`css
.search-box {
  border: solid 0.3em #3b82f6;
  background: #ffffff;
  backdrop-filter: none;
}

.dark .search-box {
  background: #1f2937;
  border-color: #3b82f6;
}
\`\`\`

**ПОЧЕМУ:** Убираем прозрачность, делаем четкую синюю границу и белый фон

---

## ИТОГО: ЧТО НУЖНО ИЗМЕНИТЬ

1. **app/globals.css** - основные стили (фон, карточки, glass эффекты)
2. **app/page.tsx** - главная страница (заголовки, padding хедера)
3. **app/search/page.tsx** - страница поиска (таблица, кнопки, бейджи)
4. **app/product/[id]/page.tsx** - страница товара (заголовки, цена, таблица, изображение)

## ПРОВЕРКА ПОСЛЕ ПРАВОК

После внесения изменений проверь:
- ✅ Нет градиентов на фоне
- ✅ Все карточки белые с четкими границами
- ✅ Таблицы с четкими границами и чередующимися строками
- ✅ Текст хорошо читается (темный на светлом)
- ✅ Кнопки четкие, не прозрачные
- ✅ Нет blur эффектов
- ✅ Все работает в темной теме

## ВАЖНО

- Делай изменения ПОСТЕПЕННО, по одному файлу
- После каждого изменения проверяй что ничего не сломалось
- Если что-то не работает - откати изменения и спроси
