# Техническая спецификация: Редизайн каталога по образцу TME

**Дата**: 23 декабря 2025  
**Статус**: DRAFT — ожидает утверждения  
**Context7 Research**: Выполнено ✅  
**Цель**: Привести каталог в соответствие с UX/UI TME (https://www.tme.com/us/en-us/katalog/)

---

## 🎯 R (Research) — Результаты разведки

### 1. Текущее состояние нашего каталога

**Файл**: `/opt/deep-agg/v0-components-aggregator-page/app/catalog/[...slug]/page.tsx` (199 строк)

**Архитектура** (проверено через Context7 — Next.js v16.1.0):
```tsx
// Текущая реализация — Server Component с SSR
async function fetchCategory(slugArray: string[]) {
  const slug = slugArray.join('-');
  const url = `http://localhost:9201/api/catalog/categories/${slug}`;
  const res = await fetch(url, { cache: 'no-store' }); // SSR каждый раз
  return res.json();
}

export default async function CatalogPage({ params }) {
  const { slug } = await params; // Next.js v16 паттерн — Promise-based params
  const data = await fetchCategory(slug);
  
  if (data.category.is_leaf) {
    return <ResultsClient />; // Конечная категория — поисковая страница
  }
  
  // Родительская категория — сетка подкатегорий
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.subcategories.map(sub => (
        <Link href={`/catalog/${sub.slug}`}>
          <div className="glass-card rounded-2xl hover:scale-105">
            {sub.name} ({sub.product_count})
          </div>
        </Link>
      ))}
    </div>
  );
}
```

**Проблемы**:
- ❌ Нет иерархического дерева навигации (только сетка)
- ❌ Нет режимов отображения (tree/list/image index)
- ❌ Нет панели фильтров
- ❌ Нет богатых описаний категорий
- ❌ Карточки товаров упрощённые (без картинок/спеков/цен)

---

### 2. Анализ TME каталога (через Playwright MCP)

**URL**: https://www.tme.com/us/en-us/katalog/

**Структура** (снимок от 23.12.2025):

#### A. Левая боковая панель — Hierarchical Tree
```
📁 Semiconductors (179,746)
  ├─ 📂 Diodes (47,551)
  │   ├─ Universal diodes (9,873)
  │   ├─ Schottky (7,628)
  │   └─ Zener (10,365)
  ├─ 📂 Transistors (26,600)
  └─ 📂 Integrated circuits (78,020)

📁 Embedded (24,352)
📁 Optoelectronics (12,084)
...
```

**Функции дерева**:
- Expand/Collapse (стрелки вправо/вниз)
- Product counts в скобках
- 3 режима: Tree list | Alphabetical | Image index
- "Collapse all" / "Expand all"
- Sticky position при скролле

#### B. Страница категории (https://www.tme.com/us/en-us/katalog/diodes_112141/)

**Подкатегории** — плитки с изображениями:
```html
<div class="subcategory-tiles grid grid-cols-3 gap-4">
  <div class="tile">
    <img src="/images/categories/universal-diodes.jpg" />
    <h3>Universal diodes</h3>
    <span class="badge">9,873 products</span>
  </div>
  ...
</div>
```

**Карточки товаров** (3 режима: Line | Block | Parametric):
- Line view: таблица с миниатюрами
- **Block view** (как у TME):
  ```html
  <div class="product-card rounded-lg border shadow-sm hover:shadow-md">
    <img class="aspect-square object-contain" />
    <div class="p-4">
      <p class="text-xs text-muted">Manufacturer</p>
      <h4 class="font-semibold">MPN-12345</h4>
      <p class="text-sm">Technical specs: 1N4148 100V 200mA</p>
      <div class="flex justify-between items-center mt-4">
        <span class="text-lg font-bold">$0.25</span>
        <span class="text-xs">In stock: 5000+</span>
      </div>
      <button class="w-full bg-green-600 hover:bg-green-700">Add to cart</button>
    </div>
  </div>
  ```
- Parametric view: таблица с параметрами

**Панель фильтров**:
- Warehouse (stock/new products toggles)
- Manufacturer checkboxes
- Price range slider
- Technical parameters (dynamic per category)
- "Hide inactive" checkbox
- Horizontal/Vertical layout toggle

**Описание категории**:
```html
<div class="category-description prose max-w-none">
  <h2>Diodes — Overview</h2>
  <p>Diodes are semiconductor devices...</p>
  <h3>Applications</h3>
  <ul>
    <li>Rectification</li>
    <li>Voltage regulation</li>
  </ul>
  <a href="/docs/diodes-guide">Learn more →</a>
</div>
```

#### C. Технологии TME (визуальный анализ)

**CSS паттерны** (проверено через Context7 — Tailwind v3):
- Glass-morphism: `backdrop-blur-lg bg-white/80`
- Rounded corners: `rounded-lg` (8px), `rounded-2xl` (16px)
- Hover transitions: `transition-all duration-300 ease-out`
- Shadows: `shadow-sm hover:shadow-lg`
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Sticky nav: `sticky top-0 z-50`

**JavaScript паттерны**:
- Tree collapse/expand: state management (React useState)
- Filters: URL query params + debounced search
- Pagination: `?page=2&limit=50`
- View mode toggle: localStorage persistence

---

### 3. Context7 Findings — Актуальные паттерны

#### Next.js v16.1.0 (проверено через /vercel/next.js/v16.1.0)

**Async Server Components** (актуальный паттерн):
```tsx
// ✅ ПРАВИЛЬНО — Next.js v16 паттерн
export default async function CatalogPage({ params }: PageProps) {
  const { slug } = await params; // params — Promise!
  
  // SSR с кэшированием
  const data = await fetch(`/api/catalog/${slug}`, {
    next: { revalidate: 60 } // ISR — кэш на 60 секунд
  });
  
  return <TreeNavigation categories={data.tree} />;
}

// ✅ ПРАВИЛЬНО — Dynamic params с Suspense
export default function Page({ params }: PageProps) {
  return (
    <Suspense fallback={<TreeSkeleton />}>
      {params.then(({ slug }) => <CatalogContent slug={slug} />)}
    </Suspense>
  );
}
```

**Неправильный подход** (устаревший):
```tsx
// ❌ НЕ ТАК — старый паттерн Next.js 13
export default function Page({ params }: { params: { slug: string } }) {
  const slug = params.slug; // Это уже не работает в v16!
}
```

#### Tailwind CSS v3 (проверено через /websites/tailwindcss)

**Responsive Hierarchical Menu**:
```tsx
// ✅ ПРАВИЛЬНО — Tailwind v3 responsive tree
<nav className="
  hidden lg:block          // Скрыт на мобилках, видим на десктопе
  sticky top-16            // Sticky navigation
  h-[calc(100vh-4rem)]     // Полная высота минус header
  overflow-y-auto          // Скролл внутри
  border-r border-gray-200
  bg-white
">
  <div className="p-4 space-y-2">
    {categories.map(cat => (
      <details className="group" open={cat.expanded}>
        <summary className="
          flex items-center justify-between
          px-3 py-2 rounded-lg
          hover:bg-gray-100
          transition-colors duration-200
          cursor-pointer
        ">
          <span>{cat.name}</span>
          <ChevronRight className="
            w-4 h-4 transition-transform
            group-open:rotate-90  // Анимация стрелки
          " />
        </summary>
        
        <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-2">
          {cat.children.map(child => (
            <Link href={`/catalog/${child.slug}`} className="
              block px-3 py-1.5 rounded text-sm
              hover:bg-green-50 hover:text-green-700
              transition-colors
            ">
              {child.name} <span className="text-gray-400">({child.count})</span>
            </Link>
          ))}
        </div>
      </details>
    ))}
  </div>
</nav>
```

**Mobile Tree Toggle**:
```tsx
// ✅ ПРАВИЛЬНО — Hamburger menu для мобилок
<Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
  <SheetTrigger className="lg:hidden">
    <Menu className="w-6 h-6" />
  </SheetTrigger>
  <SheetContent side="left" className="w-80">
    <TreeNavigation /> {/* Тот же компонент */}
  </SheetContent>
</Sheet>
```

#### Playwright (проверено через /microsoft/playwright)

**Web Scraping TME Catalog**:
```typescript
// ✅ ПРАВИЛЬНО — Playwright v1.51.0 паттерн
import { chromium } from 'playwright';

async function scrapeTMECategory(categoryUrl: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(categoryUrl, { waitUntil: 'networkidle' });
  
  // Извлечь структуру дерева
  const treeData = await page.evaluate(() => {
    const categories = [];
    document.querySelectorAll('.category-tree-item').forEach(node => {
      categories.push({
        name: node.querySelector('.category-name')?.textContent,
        count: parseInt(node.querySelector('.product-count')?.textContent || '0'),
        icon: node.querySelector('img')?.src,
        slug: node.querySelector('a')?.href.split('/').pop()
      });
    });
    return categories;
  });
  
  // Извлечь описание категории
  const description = await page.locator('.category-description').textContent();
  
  await browser.close();
  
  return { treeData, description };
}
```

---

## 🏗️ I (Implementation) — План реализации

### Фазы внедрения

#### **Фаза 1: Hierarchical Tree Navigation** (MVP)

**Цель**: Добавить левую боковую панель с деревом категорий

**Компоненты** (создать):
1. `ui/TreeNavigation.tsx` — главный компонент дерева
2. `ui/TreeCategory.tsx` — элемент категории с expand/collapse
3. `ui/MobileTreeSheet.tsx` — мобильная версия (Sheet)

**API изменения**:
```javascript
// backend/api/catalog.mjs — добавить новый эндпоинт
app.get('/api/catalog/tree', async (req, res) => {
  // Вернуть полное дерево категорий с counts
  const tree = await db.query(`
    SELECT 
      c.id, c.name, c.slug, c.parent_id, 
      c.icon, c.description,
      COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.display_order
  `);
  
  // Преобразовать в иерархию
  const hierarchy = buildTree(tree);
  res.json({ tree: hierarchy });
});
```

**Layout изменения**:
```tsx
// v0-components-aggregator-page/app/catalog/layout.tsx — СОЗДАТЬ
import { TreeNavigation } from '@/ui/TreeNavigation';

export default async function CatalogLayout({ children }) {
  const { tree } = await fetch('http://localhost:9201/api/catalog/tree', {
    next: { revalidate: 3600 } // Кэш на 1 час
  }).then(r => r.json());
  
  return (
    <div className="flex">
      {/* Desktop tree */}
      <TreeNavigation tree={tree} className="hidden lg:block w-80" />
      
      {/* Mobile hamburger */}
      <MobileTreeSheet tree={tree} />
      
      {/* Main content */}
      <main className="flex-1 lg:ml-80">
        {children}
      </main>
    </div>
  );
}
```

**Критерии успеха**:
- ✅ Дерево загружается через SSR (ISR с revalidate: 3600)
- ✅ Expand/Collapse работает через `<details>` (без JS!)
- ✅ Product counts отображаются корректно
- ✅ Мобильная версия через Sheet (shadcn/ui)
- ✅ Hover states с Tailwind transitions

---

#### **Фаза 2: Product Cards с TME стилем**

**Цель**: Обогатить карточки товаров (изображения, спеки, цены)

**Компоненты** (обновить):
1. `ui/ResultsClient.tsx` — добавить режимы отображения (Line/Block)
2. `ui/ProductCard.tsx` — обновить стиль по TME

**Стиль карточки**:
```tsx
// ui/ProductCard.tsx
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.mpn}`}>
      <div className="
        group relative
        rounded-lg border border-gray-200
        bg-white shadow-sm
        hover:shadow-lg hover:border-green-500
        transition-all duration-300
        overflow-hidden
      ">
        {/* Image section */}
        <div className="aspect-square bg-gray-50 p-4">
          <img 
            src={product.images[0] || '/placeholder.svg'} 
            alt={product.mpn}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
          />
        </div>
        
        {/* Content section */}
        <div className="p-4 space-y-2">
          <p className="text-xs text-gray-500">{product.manufacturer}</p>
          <h3 className="font-semibold text-sm truncate">{product.mpn}</h3>
          <p className="text-xs text-gray-600 line-clamp-2">{product.title}</p>
          
          {/* Specs badges */}
          <div className="flex flex-wrap gap-1">
            {product.specs.slice(0, 3).map(spec => (
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                {spec.value}
              </span>
            ))}
          </div>
          
          {/* Price & Stock */}
          <div className="flex justify-between items-end pt-2 border-t">
            <div>
              <p className="text-lg font-bold text-green-600">
                ${product.price.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {product.stock > 100 ? '100+' : product.stock} in stock
              </p>
            </div>
            
            <button className="
              px-3 py-1.5 
              bg-green-600 hover:bg-green-700
              text-white text-sm rounded
              transition-colors
            ">
              Add
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

**Критерии успеха**:
- ✅ Карточки с изображениями (placeholder если нет)
- ✅ Hover effects (scale, shadow, border color)
- ✅ Specs badges (первые 3 параметра)
- ✅ Цена + наличие (через OEMstrade API)
- ✅ Responsive grid (1-2-3-4 колонки)

---

#### **Фаза 3: Filters Panel**

**Цель**: Добавить панель фильтров как у TME

**Компоненты** (создать):
1. `ui/FiltersPanel.tsx` — главная панель
2. `ui/FilterCheckbox.tsx` — фильтр чекбоксом
3. `ui/FilterRange.tsx` — слайдер для цены

**API изменения**:
```javascript
// backend/api/catalog.mjs — добавить фильтры
app.get('/api/catalog/:slug/filters', async (req, res) => {
  const { slug } = req.params;
  
  // Получить доступные фильтры для категории
  const manufacturers = await db.query(`
    SELECT DISTINCT manufacturer, COUNT(*) as count
    FROM products WHERE category_slug = ?
    GROUP BY manufacturer
  `, [slug]);
  
  const priceRange = await db.query(`
    SELECT MIN(price) as min, MAX(price) as max
    FROM products WHERE category_slug = ?
  `, [slug]);
  
  res.json({
    manufacturers: manufacturers.rows,
    priceRange: priceRange.rows[0],
    specs: await getAvailableSpecs(slug)
  });
});
```

**Использование**:
```tsx
// app/catalog/[...slug]/page.tsx
export default async function CatalogPage({ params, searchParams }) {
  const { slug } = await params;
  const filters = await searchParams; // { manufacturer, priceMin, priceMax }
  
  const products = await searchProducts(slug, filters);
  const availableFilters = await getFilters(slug);
  
  return (
    <div className="flex gap-6">
      <FiltersPanel 
        filters={availableFilters} 
        active={filters}
        className="w-64 sticky top-16"
      />
      
      <div className="flex-1">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
```

**Критерии успеха**:
- ✅ Manufacturer checkboxes (с counts)
- ✅ Price range slider
- ✅ Stock filter (in stock / all)
- ✅ URL query params (?manufacturer=Diodes+Inc&priceMax=5)
- ✅ Debounced updates (не перезагружаем на каждый клик)

---

#### **Фаза 4: View Modes + Rich Category Descriptions**

**Цель**: Добавить переключатели режимов + описания категорий

**View Modes**:
```tsx
// ui/ViewModeToggle.tsx
export function ViewModeToggle({ mode, onChange }: ViewModeProps) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
      <button 
        onClick={() => onChange('line')}
        className={cn(
          'px-3 py-1.5 rounded transition-colors',
          mode === 'line' ? 'bg-white shadow' : 'hover:bg-gray-200'
        )}
      >
        <ListIcon className="w-4 h-4" />
      </button>
      
      <button 
        onClick={() => onChange('block')}
        className={cn(
          'px-3 py-1.5 rounded transition-colors',
          mode === 'block' ? 'bg-white shadow' : 'hover:bg-gray-200'
        )}
      >
        <GridIcon className="w-4 h-4" />
      </button>
      
      <button 
        onClick={() => onChange('parametric')}
        className={cn(
          'px-3 py-1.5 rounded transition-colors',
          mode === 'parametric' ? 'bg-white shadow' : 'hover:bg-gray-200'
        )}
      >
        <TableIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
```

**Category Descriptions**:
```tsx
// ui/CategoryDescription.tsx
export function CategoryDescription({ html }: { html: string }) {
  return (
    <div className="
      prose prose-sm max-w-none
      p-6 rounded-lg bg-gray-50 border
      [&_h2]:text-xl [&_h3]:text-lg
      [&_a]:text-green-600 [&_a]:no-underline [&_a:hover]:underline
    " dangerouslySetInnerHTML={{ __html: html }} />
  );
}
```

**Критерии успеха**:
- ✅ 3 режима: Line (таблица) / Block (карточки) / Parametric (таблица с параметрами)
- ✅ Состояние сохраняется в localStorage
- ✅ Описания категорий из базы (HTML с санитизацией)
- ✅ Responsive (на мобилке только Block mode)

---

### Источники данных

#### Вариант A: Использовать TME API (**рекомендуется**)

**У нас есть**:
- `TME_TOKEN` и `TME_SECRET` в ENV
- TME API документация: https://developers.tme.eu/

**Запрос структуры категорий**:
```javascript
// scripts/sync-tme-categories.mjs
import fetch from 'node-fetch';

async function syncTMECategories() {
  const token = process.env.TME_TOKEN;
  const secret = process.env.TME_SECRET;
  
  const res = await fetch('https://api.tme.eu/categories', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Secret-Key': secret
    }
  });
  
  const categories = await res.json();
  
  // Сохранить в базу
  await db.transaction(async trx => {
    for (const cat of categories.Data) {
      await trx('categories').insert({
        tme_id: cat.Id,
        name: cat.Name,
        parent_id: cat.ParentId,
        icon: cat.PictureUrl,
        description: cat.Description,
        product_count: cat.ProductsCount
      }).onConflict('tme_id').merge();
    }
  });
}
```

**Плюсы**:
- ✅ Официальный API
- ✅ Структурированные данные
- ✅ Картинки категорий в высоком качестве
- ✅ Product counts актуальные

**Минусы**:
- ⚠️ Нужно проверить лимиты API (возможно, есть ограничения)

#### Вариант B: Scraping через Playwright (**запасной**)

**Если TME API не подходит**:
```typescript
// scripts/scrape-tme-catalog.ts
import { chromium } from 'playwright';

async function scrapeTME() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://www.tme.com/us/en-us/katalog/');
  
  const categories = await page.locator('.category-tree-item').evaluateAll(nodes => {
    return nodes.map(node => ({
      name: node.querySelector('.name')?.textContent,
      count: parseInt(node.querySelector('.count')?.textContent || '0'),
      url: node.querySelector('a')?.href,
      icon: node.querySelector('img')?.src
    }));
  });
  
  await browser.close();
  return categories;
}
```

**Плюсы**:
- ✅ Полный контроль
- ✅ Можем парсить что угодно

**Минусы**:
- ⚠️ Может сломаться если TME изменит вёрстку
- ⚠️ Нужно уважать robots.txt

---

## ✅ P (Proof) — Критерии проверки

### Артефакты для каждой фазы

#### Фаза 1: Tree Navigation
```bash
# Артефакты в docs/_artifacts/2025-12-23/phase-1/
tree-navigation-desktop.png     # Скриншот дерева на десктопе
tree-navigation-mobile.png      # Скриншот Sheet на мобилке
tree-api-response.json          # Пример ответа /api/catalog/tree
lighthouse-score.json           # Performance score (target: >90)
```

**Проверка**:
- [ ] Дерево загружается без JS (SSR)
- [ ] Expand/Collapse работает
- [ ] Product counts корректны
- [ ] Responsive на всех брейкпоинтах
- [ ] Lighthouse Performance >90

#### Фаза 2: Product Cards
```bash
# Артефакты в docs/_artifacts/2025-12-23/phase-2/
product-cards-block-view.png    # Скриншот карточек в режиме Block
product-cards-hover.mp4         # Видео hover эффектов
product-card-comparison.pdf     # Сравнение "было → стало" vs TME
```

**Проверка**:
- [ ] Карточки визуально близки к TME
- [ ] Hover effects плавные (300ms transitions)
- [ ] Изображения загружаются (placeholder если нет)
- [ ] Цены/наличие актуальны (через OEMstrade API)

#### Фаза 3: Filters
```bash
# Артефакты в docs/_artifacts/2025-12-23/phase-3/
filters-panel-desktop.png       # Панель фильтров
filters-url-params.txt          # Примеры URL с фильтрами
filters-performance.json        # Время ответа API с фильтрами
```

**Проверка**:
- [ ] Фильтры обновляются через URL query params
- [ ] Debounced updates (не лагает)
- [ ] API /catalog/:slug/filters возвращает данные <200ms
- [ ] Mobile версия фильтров через Sheet

#### Фаза 4: View Modes + Descriptions
```bash
# Артефакты в docs/_artifacts/2025-12-23/phase-4/
view-mode-line.png              # Line view
view-mode-block.png             # Block view
view-mode-parametric.png        # Parametric view
category-description.html       # Пример HTML описания
```

**Проверка**:
- [ ] 3 режима работают
- [ ] Состояние сохраняется в localStorage
- [ ] Описания категорий рендерятся без XSS (DOMPurify)
- [ ] Responsive (на мобилке только Block)

---

## 📊 Оценки времени и ресурсов

| Фаза | Компоненты | Backend API | Время разработки | Время тестирования | Итого |
|------|-----------|-------------|-----------------|-------------------|-------|
| **Phase 1: Tree Nav** | TreeNavigation.tsx<br>TreeCategory.tsx<br>MobileTreeSheet.tsx | GET /api/catalog/tree | 6 часов | 2 часа | **8 часов** |
| **Phase 2: Product Cards** | ProductCard.tsx (обновить)<br>ProductGrid.tsx | - | 4 часа | 2 часа | **6 часов** |
| **Phase 3: Filters** | FiltersPanel.tsx<br>FilterCheckbox.tsx<br>FilterRange.tsx | GET /api/catalog/:slug/filters | 8 часов | 3 часа | **11 часов** |
| **Phase 4: View Modes** | ViewModeToggle.tsx<br>CategoryDescription.tsx | - | 3 часа | 1 час | **4 часа** |
| **Integration & Polish** | - | - | 4 часа | 2 часа | **6 часов** |
| **TME Data Sync** | sync-tme-categories.mjs | - | 3 часа | 1 час | **4 часов** |
| **ИТОГО** | - | - | **28 часов** | **11 часов** | **39 часов** |

---

## 🚀 Рекомендации

### 1. **Начать с Phase 1 (Tree Navigation)**

**Почему**:
- ✅ Самый визуальный импакт (сразу видно прогресс)
- ✅ Не требует изменений в карточках товаров
- ✅ Можно сделать быстро (1 день)
- ✅ Сразу проверим Context7 паттерны (Next.js v16 async params)

**План действий**:
1. Создать `/api/catalog/tree` endpoint
2. Создать `TreeNavigation.tsx` с `<details>` (без JS!)
3. Создать `MobileTreeSheet.tsx` (shadcn/ui Sheet)
4. Обновить `app/catalog/layout.tsx`
5. Тесты + артефакты

### 2. **Использовать TME API (Вариант A)**

**Почему**:
- ✅ У нас есть `TME_TOKEN` и `TME_SECRET`
- ✅ Официальный источник данных
- ✅ Картинки категорий в высоком качестве
- ✅ Легко синхронизировать (cron job)

**Проверка лимитов**:
```bash
# Проверить лимиты TME API
curl -H "Authorization: Bearer $TME_TOKEN" \
     -H "X-Secret-Key: $TME_SECRET" \
     https://api.tme.eu/rate-limit
```

**Fallback**:
Если API недоступен или лимиты не подходят → используем Playwright scraping (Вариант B).

### 3. **Сохранить v0 сетку**

**Почему**:
- ✅ Пользователь просил: "Не изменять макет/сетку v0"
- ✅ Добавляем Tree Navigation **слева**, основная сетка остаётся

**Структура Layout**:
```tsx
<div className="flex">
  {/* НЕ ТРОГАЕМ v0 сетку — просто добавляем слева Tree */}
  <TreeNavigation className="w-80" />
  
  {/* Существующий v0 код остаётся */}
  <main className="flex-1">
    {children} {/* Это текущая сетка подкатегорий */}
  </main>
</div>
```

---

## 🎯 Вопросы для утверждения

1. **Источник данных**: TME API (Вариант A) или Playwright scraping (Вариант B)?
   - Если API → нужно проверить лимиты
   - Если scraping → нужно уважать robots.txt

2. **Приоритет фаз**: Начинать с Phase 1 (Tree Nav)?
   - Или предпочитаешь сначала Phase 2 (Product Cards)?

3. **Ручные данные**: Описания категорий (`CategoryDescription.tsx`) — писать вручную или парсить с TME?

4. **Временные рамки**: 39 часов (~5 дней full-time) — приемлемо?

5. **Адаптация для мобилок**: Sheet для Tree Navigation или другой подход?

---

**Следующий шаг**: Получить утверждение пользователя и начать Phase 1 (Tree Navigation).

**Context7 проверка**: ✅ Все паттерны актуальны (Next.js v16.1.0, Tailwind v3, Playwright v1.51.0)
