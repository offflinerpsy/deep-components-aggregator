# ПОЛНЫЙ СПИСОК ЗАДАЧ ДЛЯ ИСПОЛНИТЕЛЯ

**Дата:** 2025-01-11  
**Проект:** Diponika Components Aggregator  
**Статус:** Первые 5 правок применены ✅ Теперь делаем остальное

---

## ЧТО УЖЕ СДЕЛАНО ✅

1. Градиентный анимированный фон
2. Glassmorphism на таблице
3. Поисковая строка в glassmorphism
4. Sticky блок заказа
5. Зеленые цены

---

## ЧТО НУЖНО СДЕЛАТЬ СЕЙЧАС

### ЗАДАЧА 1: Кликабельные плитки компонентов на главной

**Проблема:** На главной странице нет плиток с популярными компонентами

**Что делать:**

Открой файл `app/page.tsx`

Найди место после поисковой строки (примерно строка 80-100) и добавь:

\`\`\`tsx
<div className="mb-16">
  <h2 className="text-2xl font-bold text-white mb-6">Популярные компоненты</h2>
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {[
      { mpn: 'LM317T', category: 'Power Circuits' },
      { mpn: 'M83513/19-E01NW', category: 'Connectors' },
      { mpn: '500C122T250BA2B', category: 'Capacitors' },
      { mpn: 'FT232RL-REEL', category: 'Microcontrollers' },
      { mpn: 'BSS138', category: 'Transistors' },
      { mpn: 'CRCW06030000Z0EA', category: 'Resistors' },
      { mpn: '1N4148', category: 'Diodes' },
      { mpn: 'ULN2803A', category: 'Drivers' },
      { mpn: 'MAX4236EUT+T', category: 'Amplifiers' },
      { mpn: '96BB2-006-F', category: 'Switches' },
    ].map((item) => (
      <button
        key={item.mpn}
        onClick={() => {
          // Показываем лоадер
          setIsSearching(true);
          // Плавный переход на страницу поиска
          router.push(`/results?q=${encodeURIComponent(item.mpn)}`);
        }}
        className="glass rounded-xl p-4 hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer group"
      >
        <div className="text-sm text-gray-400 mb-2">{item.category}</div>
        <div className="text-white font-semibold group-hover:text-[#667eea] transition-colors">
          {item.mpn}
        </div>
      </button>
    ))}
  </div>
</div>
\`\`\`

**Добавь состояние для лоадера в начале компонента:**

\`\`\`tsx
const [isSearching, setIsSearching] = useState(false);
const router = useRouter();
\`\`\`

**Добавь импорты:**

\`\`\`tsx
import { useRouter } from 'next/navigation';
import { useState } from 'react';
\`\`\`

---

### ЗАДАЧА 2: Глобальный лоадер при переходах

**Проблема:** Нет индикации загрузки при переходах между страницами

**Что делать:**

Создай файл `components/GlobalLoader.tsx`:

\`\`\`tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function GlobalLoader() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  // Слушаем события навигации
  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    window.addEventListener('beforeunload', handleStart);
    
    return () => {
      window.removeEventListener('beforeunload', handleStart);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
        {/* Крутой спиннер */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-[#667eea]/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-[#667eea] rounded-full animate-spin"></div>
        </div>
        <div className="text-white font-medium">Загрузка результатов...</div>
        <div className="text-gray-400 text-sm">Агрегируем данные с провайдеров</div>
      </div>
    </div>
  );
}
\`\`\`

**Добавь в `app/layout.tsx`:**

\`\`\`tsx
import GlobalLoader from '@/components/GlobalLoader';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <GlobalLoader />
        {children}
      </body>
    </html>
  );
}
\`\`\`

---

### ЗАДАЧА 3: Кнопка "Купить" в таблице результатов

**Проблема:** В таблице результатов нет кнопки для перехода на карточку товара

**Что делать:**

Открой файл `components/ResultsClient.tsx`

Найди строку с `<td>` где выводится цена (примерно строка 150-180)

После колонки с регионом добавь новую колонку:

\`\`\`tsx
<td className="px-4 py-3">
  <button
    onClick={() => {
      // Показываем лоадер и переходим
      router.push(`/product/${encodeURIComponent(result.mpn)}`);
    }}
    className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-lg text-white font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
  >
    Купить
  </button>
</td>
\`\`\`

**Не забудь добавить заголовок колонки в `<thead>`:**

\`\`\`tsx
<th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Действия</th>
\`\`\`

**Добавь импорт:**

\`\`\`tsx
import { useRouter } from 'next/navigation';

// В компоненте:
const router = useRouter();
\`\`\`

---

### ЗАДАЧА 4: Фильтрация результатов поиска

**Проблема:** Нет возможности фильтровать результаты

**Что делать:**

Открой файл `components/ResultsClient.tsx`

Добавь состояния для фильтров в начале компонента:

\`\`\`tsx
const [filters, setFilters] = useState({
  manufacturer: '',
  minPrice: '',
  maxPrice: '',
  inStock: false,
});

const [manufacturers, setManufacturers] = useState<string[]>([]);
\`\`\`

**Добавь useEffect для сбора уникальных производителей:**

\`\`\`tsx
useEffect(() => {
  const unique = Array.from(new Set(results.map(r => r.manufacturer).filter(Boolean)));
  setManufacturers(unique.sort());
}, [results]);
\`\`\`

**Добавь функцию фильтрации:**

\`\`\`tsx
const filteredResults = results.filter(result => {
  // Фильтр по производителю
  if (filters.manufacturer && result.manufacturer !== filters.manufacturer) {
    return false;
  }
  
  // Фильтр по минимальной цене
  if (filters.minPrice && result.minPrice < parseFloat(filters.minPrice)) {
    return false;
  }
  
  // Фильтр по максимальной цене
  if (filters.maxPrice && result.minPrice > parseFloat(filters.maxPrice)) {
    return false;
  }
  
  // Фильтр по наличию
  if (filters.inStock && result.stock === 0) {
    return false;
  }
  
  return true;
});
\`\`\`

**Добавь UI фильтров ПЕРЕД таблицей:**

\`\`\`tsx
<div className="glass rounded-2xl p-6 mb-6">
  <h3 className="text-lg font-semibold text-white mb-4">Фильтры</h3>
  
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {/* Фильтр по производителю */}
    <div>
      <label className="block text-sm text-gray-300 mb-2">Производитель</label>
      <select
        value={filters.manufacturer}
        onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value })}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#667eea]"
      >
        <option value="">Все</option>
        {manufacturers.map(m => (
          <option key={m} value={m} className="bg-gray-800">{m}</option>
        ))}
      </select>
    </div>

    {/* Фильтр по минимальной цене */}
    <div>
      <label className="block text-sm text-gray-300 mb-2">Цена от (₽)</label>
      <input
        type="number"
        value={filters.minPrice}
        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        placeholder="0"
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#667eea]"
      />
    </div>

    {/* Фильтр по максимальной цене */}
    <div>
      <label className="block text-sm text-gray-300 mb-2">Цена до (₽)</label>
      <input
        type="number"
        value={filters.maxPrice}
        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
        placeholder="∞"
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#667eea]"
      />
    </div>

    {/* Фильтр по наличию */}
    <div className="flex items-end">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.inStock}
          onChange={(e) => setFilters({ ...filters, inStock: e.target.checked })}
          className="w-5 h-5 rounded border-white/20 bg-white/10 text-[#667eea] focus:ring-[#667eea]"
        />
        <span className="text-white">Только в наличии</span>
      </label>
    </div>
  </div>

  {/* Счетчик результатов */}
  <div className="mt-4 text-sm text-gray-400">
    Показано: {filteredResults.length} из {results.length}
  </div>
</div>
\`\`\`

**Замени `results.map` на `filteredResults.map` в таблице!**

---

### ЗАДАЧА 5: Крутая галерея на карточке товара

**Проблема:** Огромная картинка товара, нет галереи

**Что делать:**

Открой файл `app/product/[mpn]/page.tsx`

Найди блок с изображением (примерно строки 100-150)

Замени на:

\`\`\`tsx
<div className="glass rounded-2xl p-6">
  {/* Главное изображение */}
  <div className="relative aspect-square mb-4 rounded-xl overflow-hidden bg-white/5">
    <Image
      src={product.images?.[selectedImageIndex] || '/placeholder.svg'}
      alt={product.mpn}
      fill
      className="object-contain p-4"
    />
  </div>

  {/* Миниатюры */}
  {product.images && product.images.length > 1 && (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {product.images.map((img, idx) => (
        <button
          key={idx}
          onClick={() => setSelectedImageIndex(idx)}
          className={`
            relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-300
            ${selectedImageIndex === idx 
              ? 'border-[#667eea] scale-110 shadow-lg' 
              : 'border-white/20 hover:border-white/40'
            }
          `}
        >
          <Image
            src={img || "/placeholder.svg"}
            alt={`${product.mpn} - ${idx + 1}`}
            fill
            className="object-contain p-1"
          />
        </button>
      ))}
    </div>
  )}
</div>
\`\`\`

**Добавь состояние в начале компонента:**

\`\`\`tsx
const [selectedImageIndex, setSelectedImageIndex] = useState(0);
\`\`\`

---

### ЗАДАЧА 6: Красивые табы (Характеристики/Предложения/Документы)

**Проблема:** Табы не выделены, непонятно что на них можно нажать

**Что делать:**

Открой файл `app/product/[mpn]/page.tsx`

Найди блок с табами (примерно строки 200-250)

Замени на:

\`\`\`tsx
<div className="glass rounded-2xl p-2 mb-6">
  <div className="flex gap-2">
    {['specs', 'offers', 'docs'].map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`
          flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 cursor-pointer
          ${activeTab === tab
            ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-lg scale-105'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
          }
        `}
      >
        {tab === 'specs' && 'Характеристики'}
        {tab === 'offers' && 'Предложения'}
        {tab === 'docs' && 'Документы'}
      </button>
    ))}
  </div>
</div>
\`\`\`

---

### ЗАДАЧА 7: Эргономичное техническое описание

**Проблема:** Характеристики просто текст, нет структуры

**Что делать:**

Открой файл `app/product/[mpn]/page.tsx`

Найди блок с характеристиками (примерно строки 300-350)

Замени на:

\`\`\`tsx
{activeTab === 'specs' && (
  <div className="glass rounded-2xl overflow-hidden">
    <table className="w-full">
      <tbody>
        {Object.entries(product.specs || {}).map(([key, value], idx) => (
          <tr
            key={key}
            className={`
              border-b border-white/10 last:border-0
              hover:bg-white/5 transition-colors
              ${idx % 2 === 0 ? 'bg-white/[0.02]' : ''}
            `}
          >
            <td className="px-6 py-4 text-gray-400 font-medium w-1/3">
              {key}
            </td>
            <td className="px-6 py-4 text-white">
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
\`\`\`

---

### ЗАДАЧА 8: Кнопка "Читать больше" для длинных блоков

**Проблема:** Длинные описания растягивают страницу

**Что делать:**

Добавь компонент `components/ExpandableText.tsx`:

\`\`\`tsx
'use client';

import { useState } from 'react';

export default function ExpandableText({ 
  text, 
  maxLength = 300 
}: { 
  text: string; 
  maxLength?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  
  if (text.length <= maxLength) {
    return <div className="text-gray-300">{text}</div>;
  }

  return (
    <div className="relative">
      <div className={`text-gray-300 ${!expanded ? 'line-clamp-4' : ''}`}>
        {text}
      </div>
      
      {!expanded && (
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900 to-transparent"></div>
      )}
      
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 text-[#667eea] hover:text-[#764ba2] font-medium transition-colors flex items-center gap-2"
      >
        {expanded ? 'Свернуть' : 'Читать больше'}
        <svg 
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
\`\`\`

**Используй в карточке товара:**

\`\`\`tsx
import ExpandableText from '@/components/ExpandableText';

// В описании:
<ExpandableText text={product.description} maxLength={300} />
\`\`\`

---

### ЗАДАЧА 9: Зафиксировать футер

**Проблема:** Футер прыгает при переключении табов

**Что делать:**

Открой файл `app/layout.tsx`

Измени структуру:

\`\`\`tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="flex flex-col min-h-screen">
        <GlobalLoader />
        
        {/* Контент растягивается */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* Футер всегда внизу */}
        <Footer />
      </body>
    </html>
  );
}
\`\`\`

**Добавь в `globals.css`:**

\`\`\`css
/* Фиксация футера */
html, body {
  height: 100%;
}

body {
  display: flex;
  flex-direction: column;
}

main {
  flex: 1 0 auto;
}

footer {
  flex-shrink: 0;
}
\`\`\`

---

### ЗАДАЧА 10: Выбор количества товара в карточке

**Проблема:** Нельзя выбрать количество товара

**Что делать:**

Открой файл `app/product/[mpn]/page.tsx`

Найди блок "Добавить в заказ" (правая колонка)

Добавь перед кнопкой:

\`\`\`tsx
<div className="mb-4">
  <label className="block text-sm text-gray-300 mb-2">Количество</label>
  <div className="flex items-center gap-3">
    <button
      onClick={() => setQuantity(Math.max(1, quantity - 1))}
      className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white font-bold"
    >
      −
    </button>
    
    <input
      type="number"
      value={quantity}
      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
      className="w-20 text-center bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#667eea]"
      min="1"
    />
    
    <button
      onClick={() => setQuantity(quantity + 1)}
      className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white font-bold"
    >
      +
    </button>
  </div>
</div>
\`\`\`

**Добавь состояние:**

\`\`\`tsx
const [quantity, setQuantity] = useState(1);
\`\`\`

---

### ЗАДАЧА 11: Более контрастный дизайн

**Проблема:** Белые плашки на бледном фоне - не премиум

**Что делать:**

Открой файл `globals.css`

Измени класс `.glass`:

\`\`\`css
.glass {
  /* Более контрастный и премиум дизайн */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.08) 100%
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.glass:hover {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.1) 100%
  );
  border-color: rgba(102, 126, 234, 0.4);
  box-shadow: 
    0 12px 48px rgba(102, 126, 234, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
\`\`\`

**Усиль контраст фона:**

\`\`\`css
body {
  background: linear-gradient(135deg, #1a1f35 0%, #2d1b4e 50%, #1e2a4a 100%);
}

body::before {
  /* Сделай градиенты ярче */
  background: 
    radial-gradient(circle at 20% 30%, rgba(102, 126, 234, 0.5) 0%, transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(118, 75, 162, 0.4) 0%, transparent 40%),
    radial-gradient(circle at 40% 80%, rgba(244, 147, 251, 0.35) 0%, transparent 35%);
}
\`\`\`

---

### ЗАДАЧА 12: Единая стилистика везде

**Проблема:** Разные отступы, размеры шрифтов

**Что делать:**

Добавь в `globals.css` единые переменные:

\`\`\`css
:root {
  /* Единая дизайн-система */
  --spacing-xs: 0.5rem;   /* 8px */
  --spacing-sm: 0.75rem;  /* 12px */
  --spacing-md: 1rem;     /* 16px */
  --spacing-lg: 1.5rem;   /* 24px */
  --spacing-xl: 2rem;     /* 32px */
  --spacing-2xl: 3rem;    /* 48px */
  
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  
  --radius-sm: 0.5rem;    /* 8px */
  --radius-md: 0.75rem;   /* 12px */
  --radius-lg: 1rem;      /* 16px */
  --radius-xl: 1.5rem;    /* 24px */
}
\`\`\`

**Используй эти переменные везде:**

\`\`\`tsx
// Вместо: className="p-6 rounded-2xl text-lg"
// Пиши: className="p-[var(--spacing-lg)] rounded-[var(--radius-xl)] text-[var(--text-lg)]"
\`\`\`

---

## ЧЕКЛИСТ ПОСЛЕ ВСЕХ ПРАВОК

Проверь что все работает:

- [ ] Плитки на главной кликабельны → поиск → плавный переход
- [ ] Лоадер показывается при переходах
- [ ] Кнопка "Купить" в таблице → переход на карточку
- [ ] Фильтры работают (производитель, цена, наличие)
- [ ] Галерея на карточке товара с миниатюрами
- [ ] Табы красиво выделены с градиентом
- [ ] Характеристики в таблице с чередующимся фоном
- [ ] Кнопка "Читать больше" для длинных текстов
- [ ] Футер зафиксирован внизу
- [ ] Выбор количества товара работает
- [ ] Дизайн контрастный и премиум
- [ ] Единая стилистика везде

---

## ТЕСТИРОВАНИЕ

\`\`\`bash
# Запусти проект
npm run dev

# Проверь:
1. Главная → клик на плитку → лоадер → результаты
2. Результаты → фильтры → кнопка "Купить" → лоадер → карточка
3. Карточка → галерея → табы → количество → футер не прыгает
\`\`\`

---

## ВАЖНО ДЛЯ ИСПОЛНИТЕЛЯ

**Лоадер критичен!** У нас агрегатор, страницы грузятся медленно. Пользователь должен видеть что идет загрузка.

**Фон должен быть контрастным!** Должно быть видно что градиенты движутся, а не просто другой цвет.

**Премиум дизайн!** Это не шарага. Все должно быть стильно, эргономично, аккуратно.

---

Все задачи расписаны пошагово. Делай по порядку, тестируй каждую, коммить и пуш в Git после каждой задачи.

Удачи! 🚀
