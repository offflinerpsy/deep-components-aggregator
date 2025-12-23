# План реализации каталога TME-стиля

**Дата**: 23 декабря 2025  
**Основа**: Context7 Research + TME Analysis  
**Документ**: [CATALOG-REDESIGN-SPEC.md](./CATALOG-REDESIGN-SPEC.md)

---

## 📋 Чек-лист для утверждения

Перед началом реализации нужно ответить на вопросы:

- [ ] **Источник данных категорий**: TME API или Playwright scraping?
- [ ] **Приоритет фаз**: Начать с Tree Navigation (Фаза 1)?
- [ ] **Описания категорий**: Парсить с TME или писать вручную?
- [ ] **Временные рамки**: 39 часов (~5 дней) — OK?
- [ ] **Мобильная навигация**: Sheet (shadcn/ui) — подходит?

---

## 🚀 Фаза 1: Tree Navigation (8 часов)

### Что создаём

```
ui/
├─ TreeNavigation.tsx          // Главный компонент дерева
├─ TreeCategory.tsx            // Элемент категории (details/summary)
└─ MobileTreeSheet.tsx         // Мобильная версия (Sheet)

api/
└─ catalog.mjs                 // Добавить GET /api/catalog/tree

app/catalog/
└─ layout.tsx                  // СОЗДАТЬ — sidebar с деревом
```

### Backend API

```javascript
// GET /api/catalog/tree
{
  "tree": [
    {
      "id": 1,
      "name": "Semiconductors",
      "slug": "semiconductors",
      "parent_id": null,
      "icon": "https://cdn.tme.eu/...",
      "product_count": 179746,
      "children": [
        {
          "id": 2,
          "name": "Diodes",
          "slug": "semiconductors-diodes",
          "parent_id": 1,
          "product_count": 47551,
          "children": [...]
        }
      ]
    }
  ]
}
```

### Frontend Component

```tsx
// ui/TreeNavigation.tsx
export async function TreeNavigation({ className }: TreeNavProps) {
  const { tree } = await fetch('http://localhost:9201/api/catalog/tree', {
    next: { revalidate: 3600 } // ISR — кэш на 1 час
  }).then(r => r.json());
  
  return (
    <nav className={cn(
      "sticky top-16 h-[calc(100vh-4rem)]",
      "overflow-y-auto border-r border-gray-200",
      "bg-white p-4",
      className
    )}>
      {tree.map(cat => <TreeCategory key={cat.id} category={cat} />)}
    </nav>
  );
}
```

### Артефакты проверки

```bash
docs/_artifacts/2025-12-23/phase-1/
├─ tree-navigation-desktop.png     # Desktop sidebar
├─ tree-navigation-mobile.png      # Mobile Sheet
├─ tree-api-response.json          # Пример API ответа
├─ lighthouse-score.json           # Performance (target: >90)
└─ curl-tree-api.txt               # curl команда для проверки
```

---

## 🎨 Фаза 2: Product Cards (6 часов)

### Что обновляем

```
ui/
├─ ProductCard.tsx             // ОБНОВИТЬ — TME стиль
└─ ProductGrid.tsx             // Responsive grid

types/
└─ product.ts                  // Добавить поля (images, specs, stock)
```

### Новый стиль карточки

**Ключевые изменения**:
- ✅ Aspect-square для изображений
- ✅ Hover effects (scale + shadow + border color)
- ✅ Specs badges (первые 3 параметра)
- ✅ Price + Stock info
- ✅ Add to cart button

**CSS** (Tailwind v3 — актуальные классы из Context7):
```tsx
<div className="
  group relative
  rounded-lg border border-gray-200
  bg-white shadow-sm
  hover:shadow-lg hover:border-green-500
  transition-all duration-300
  overflow-hidden
">
  <div className="aspect-square bg-gray-50 p-4">
    <img className="
      w-full h-full object-contain
      group-hover:scale-105
      transition-transform
    " />
  </div>
  {/* ... */}
</div>
```

### Артефакты проверки

```bash
docs/_artifacts/2025-12-23/phase-2/
├─ product-cards-block-view.png    # Скриншот карточек
├─ product-cards-hover.mp4         # Видео hover эффектов
├─ comparison-tme-vs-ours.pdf      # Сравнение с TME
└─ card-transitions.txt            # Описание анимаций
```

---

## 🔍 Фаза 3: Filters Panel (11 часов)

### Что создаём

```
ui/
├─ FiltersPanel.tsx            // Главная панель
├─ FilterCheckbox.tsx          // Чекбокс фильтр
├─ FilterRange.tsx             // Price range slider
└─ FilterToggle.tsx            // Stock / New products

api/
└─ catalog.mjs                 // GET /api/catalog/:slug/filters
```

### Backend API

```javascript
// GET /api/catalog/semiconductors-diodes/filters
{
  "manufacturers": [
    { "name": "Diodes Inc", "count": 5234 },
    { "name": "ON Semiconductor", "count": 3891 }
  ],
  "priceRange": { "min": 0.05, "max": 125.50 },
  "specs": {
    "Voltage": ["100V", "200V", "400V"],
    "Current": ["1A", "3A", "5A"]
  },
  "stock": { "inStock": 42000, "all": 47551 }
}
```

### URL Query Params

```
/catalog/semiconductors-diodes?manufacturer=Diodes+Inc&priceMax=10&stock=true
```

**Обработка**:
```tsx
export default async function CatalogPage({ params, searchParams }) {
  const { slug } = await params;
  const filters = await searchParams; // Next.js v16 паттерн
  
  const products = await searchProducts(slug, {
    manufacturer: filters.manufacturer,
    priceMax: parseFloat(filters.priceMax || '9999'),
    stock: filters.stock === 'true'
  });
  
  return <ProductGrid products={products} />;
}
```

### Артефакты проверки

```bash
docs/_artifacts/2025-12-23/phase-3/
├─ filters-panel-desktop.png       # Desktop panel
├─ filters-panel-mobile.png        # Mobile Sheet
├─ filters-url-examples.txt        # Примеры URL
├─ filters-api-performance.json    # Время ответа API
└─ debounce-behavior.mp4           # Видео debounced updates
```

---

## 🎭 Фаза 4: View Modes + Descriptions (4 часа)

### Что создаём

```
ui/
├─ ViewModeToggle.tsx          // Line | Block | Parametric
└─ CategoryDescription.tsx     // Rich HTML описание

lib/
└─ sanitize.ts                 // DOMPurify wrapper
```

### View Modes

**3 режима**:
1. **Line** — таблица с миниатюрами (как на Amazon)
2. **Block** — карточки (как у TME) ← default
3. **Parametric** — таблица с параметрами (для сравнения)

**Сохранение состояния**:
```tsx
// localStorage persistence
const [viewMode, setViewMode] = useLocalStorage('catalog-view-mode', 'block');
```

### Category Description

**HTML санитизация**:
```tsx
import DOMPurify from 'isomorphic-dompurify';

export function CategoryDescription({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h2', 'h3', 'p', 'ul', 'li', 'a', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
  
  return (
    <div className="prose prose-sm max-w-none" 
         dangerouslySetInnerHTML={{ __html: clean }} />
  );
}
```

### Артефакты проверки

```bash
docs/_artifacts/2025-12-23/phase-4/
├─ view-mode-line.png              # Line view
├─ view-mode-block.png             # Block view
├─ view-mode-parametric.png        # Parametric view
├─ category-description.html       # Пример HTML
├─ xss-test-results.txt            # XSS protection tests
└─ localstorage-persistence.mp4    # Видео сохранения режима
```

---

## 📦 Интеграция: TME Data Sync (4 часа)

### Что создаём

```
scripts/
├─ sync-tme-categories.mjs     // Синхронизация категорий
├─ sync-tme-images.mjs         // Загрузка картинок
└─ verify-tme-data.mjs         // Проверка целостности данных

cron/
└─ daily-sync.sh               // Cron job для синхронизации
```

### TME API Integration

```javascript
// scripts/sync-tme-categories.mjs
import fetch from 'node-fetch';

async function syncCategories() {
  const token = process.env.TME_TOKEN;
  const secret = process.env.TME_SECRET;
  
  const res = await fetch('https://api.tme.eu/categories', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Secret-Key': secret,
      'Country': 'US',
      'Language': 'EN'
    }
  });
  
  const { Data: categories } = await res.json();
  
  console.log(`Syncing ${categories.length} categories...`);
  
  for (const cat of categories) {
    await db('categories').insert({
      tme_id: cat.Id,
      name: cat.Name,
      slug: slugify(cat.Name),
      parent_id: cat.ParentId,
      icon: cat.PictureUrl,
      description: cat.Description,
      product_count: cat.ProductsCount,
      updated_at: new Date()
    }).onConflict('tme_id').merge();
  }
  
  console.log('✅ Sync complete');
}
```

### Cron Job

```bash
# cron/daily-sync.sh
#!/bin/bash
cd /opt/deep-agg
node scripts/sync-tme-categories.mjs
node scripts/sync-tme-images.mjs
node scripts/verify-tme-data.mjs
```

**Crontab**:
```
# Каждый день в 03:00
0 3 * * * /opt/deep-agg/cron/daily-sync.sh >> /var/log/tme-sync.log 2>&1
```

### Артефакты проверки

```bash
docs/_artifacts/2025-12-23/integration/
├─ tme-api-limits.json             # Лимиты API
├─ categories-count.txt            # Количество категорий (до/после)
├─ sync-log-sample.txt             # Пример лога синхронизации
├─ images-downloaded.txt           # Список загруженных картинок
└─ verification-report.json        # Отчёт проверки целостности
```

---

## ⏱️ Расписание выполнения

| День | Фаза | Задачи | Часов | Артефакты |
|------|------|--------|-------|-----------|
| **День 1** | Phase 1 | Tree Navigation<br>Backend API<br>Desktop/Mobile UI | 8h | tree-navigation-*.png<br>tree-api-response.json<br>lighthouse-score.json |
| **День 2** | Phase 2 | Product Cards<br>TME стиль<br>Hover effects | 6h | product-cards-*.png<br>comparison-tme-vs-ours.pdf<br>card-transitions.txt |
| **День 3** | Phase 3 (pt.1) | Filters Panel<br>Backend API<br>Manufacturers/Price | 5h | filters-panel-*.png<br>filters-api-response.json |
| **День 4** | Phase 3 (pt.2) | Filters (cont.)<br>URL query params<br>Debounce logic | 6h | filters-url-examples.txt<br>debounce-behavior.mp4 |
| **День 5** | Phase 4 | View Modes<br>Category Descriptions<br>XSS sanitization | 4h | view-mode-*.png<br>xss-test-results.txt |
| **День 5** | Integration | TME Data Sync<br>Cron jobs<br>Verification | 4h | sync-log-sample.txt<br>verification-report.json |
| **День 6** | Polish | Integration tests<br>E2E Playwright<br>Final review | 6h | e2e-test-results.json<br>final-comparison.pdf |

**ИТОГО**: 39 часов (≈6 дней с учётом тестирования)

---

## 🎯 Критерии приёмки (DoD)

### Обязательные критерии

- [ ] **Tree Navigation**: работает без JS (SSR), expand/collapse функционален
- [ ] **Product Cards**: визуально близки к TME, hover effects плавные
- [ ] **Filters Panel**: обновляются через URL params, debounced
- [ ] **View Modes**: 3 режима работают, состояние сохраняется
- [ ] **TME Sync**: категории синхронизируются через API/scraping
- [ ] **Responsive**: всё работает на всех брейкпоинтах (mobile/tablet/desktop)
- [ ] **Performance**: Lighthouse score >90 (Desktop), >80 (Mobile)
- [ ] **Accessibility**: ARIA labels, keyboard navigation
- [ ] **No breaking changes**: v0 сетка не сломана

### Артефакты

Для каждой фазы:
- [ ] Screenshots (desktop + mobile)
- [ ] API response samples (JSON)
- [ ] Performance metrics (Lighthouse)
- [ ] Comparison with TME (PDF/images)
- [ ] Test results (Playwright E2E)

---

## 🔐 Безопасность

### XSS Protection

```typescript
// Category descriptions — DOMPurify санитизация
import DOMPurify from 'isomorphic-dompurify';

const clean = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['h2', 'h3', 'p', 'ul', 'li', 'a'],
  ALLOWED_ATTR: ['href']
});
```

### TME API Credentials

```bash
# Никогда не коммитить в Git!
TME_TOKEN=your_token_here
TME_SECRET=your_secret_here
```

### Rate Limiting

```javascript
// Проверить лимиты TME API перед началом
const rateLimitRes = await fetch('https://api.tme.eu/rate-limit', {
  headers: { 'Authorization': `Bearer ${TME_TOKEN}` }
});

console.log(await rateLimitRes.json());
// Expected: { limit: 1000, remaining: 998, reset: 1640000000 }
```

---

## 📞 Вопросы для старта

Перед началом Phase 1 нужно:

1. **Проверить TME API лимиты**:
   ```bash
   curl -H "Authorization: Bearer $TME_TOKEN" \
        -H "X-Secret-Key: $TME_SECRET" \
        https://api.tme.eu/rate-limit
   ```

2. **Выбрать источник данных**:
   - ✅ **TME API** (если лимиты OK)
   - ⚠️ **Playwright scraping** (если API не подходит)

3. **Утвердить приоритет**:
   - Начинаем с **Phase 1 (Tree Navigation)** ← рекомендуется
   - Или с **Phase 2 (Product Cards)** если нужен быстрый результат

4. **Временные рамки**:
   - 39 часов (≈6 дней) — приемлемо?

---

**Следующий шаг**: Получить ответы на вопросы и начать Phase 1 ✅

**Context7 проверка**: Все паттерны актуальны (проверено через mcp_context72)
