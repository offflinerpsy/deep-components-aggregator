# ПРОМПТ ДЛЯ ИСПОЛНИТЕЛЯ: Анализ текущего состояния проекта для v0

**Цель:** Собрать полную информацию о текущем состоянии фронтенда с дизайном v0, чтобы v0 AI мог проанализировать и дать правки.

---

## Шаг 1: Запусти проект локально

```bash
# Проверь что процессы запущены
pm2 status

# Должно быть:
# - deep-agg (backend) на порту 9201
# - deep-v0 (frontend) на порту 3000

# Если не запущены:
cd /opt/deep-agg
pm2 start server.js --name deep-agg -- --port 9201

cd /opt/deep-agg/v0-components-aggregator-page
pm2 start npm --name deep-v0 -- run start

# Проверь что работает:
curl -s http://127.0.0.1:9201/api/health | jq .status  # "ok"
curl -s http://127.0.0.1:3000/ | head -20  # HTML должен вернуться
```

---

## Шаг 2: Создай Playwright скрипт для скриншотов

Создай файл `/opt/deep-agg/scripts/analyze-project.mjs`:

```javascript
/* analyze-project.mjs - Анализ проекта для v0 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function analyzeProject() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  // Создай папку для артефактов
  const artifactsDir = '/opt/deep-agg/v0-analysis-artifacts';
  await mkdir(artifactsDir, { recursive: true });
  await mkdir(join(artifactsDir, 'screenshots'), { recursive: true });

  console.log('Анализирую проект...');

  // 1. ГЛАВНАЯ СТРАНИЦА
  console.log('1. Скриншот главной страницы...');
  await page.goto('http://127.0.0.1:3000');
  await page.waitForTimeout(2000); // Жди загрузки анимаций
  await page.screenshot({ 
    path: join(artifactsDir, 'screenshots', '1-main-page.png'),
    fullPage: true 
  });

  // Собери информацию о главной
  const mainPageInfo = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      hasSearchInput: !!document.querySelector('input[name="q"], input[type="text"]'),
      hasLogo: !!document.querySelector('.logo, svg[class*="logo"]'),
      backgroundAnimation: getComputedStyle(document.body).animation || 'none',
      bodyClasses: document.body.className,
      mainElements: Array.from(document.querySelectorAll('main > *')).map(el => ({
        tag: el.tagName,
        classes: el.className,
        id: el.id
      }))
    };
  });

  // 2. СТРАНИЦА ПОИСКА
  console.log('2. Скриншот страницы поиска...');
  
  // Введи тестовый запрос
  const searchInput = page.locator('input[name="q"], input[type="text"]').first();
  await searchInput.fill('LM317T');
  await searchInput.press('Enter');
  
  // Жди навигации и загрузки
  await page.waitForURL(/.*results.*/, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(3000); // Жди SSE результатов
  
  await page.screenshot({ 
    path: join(artifactsDir, 'screenshots', '2-search-page.png'),
    fullPage: true 
  });

  // Собери информацию о поиске
  const searchPageInfo = await page.evaluate(() => {
    const results = document.querySelectorAll('table tbody tr, [data-testid="product-row"], [class*="result-item"]');
    return {
      url: window.location.href,
      resultsCount: results.length,
      hasTable: !!document.querySelector('table'),
      hasPriceColumn: !!document.querySelector('table th:has-text("Цена"), [class*="price"]'),
      hasRegionColumn: !!document.querySelector('table th:has-text("Регион"), [class*="region"]'),
      tableColumns: Array.from(document.querySelectorAll('table th')).map(th => th.textContent.trim()),
      hasSSEIndicator: !!document.querySelector('[class*="live"], [class*="sse"]'),
      hasRuEnBadge: !!document.querySelector('[class*="ru-en"], [class*="badge"]'),
      glassEffect: Array.from(document.querySelectorAll('[class*="glass"]')).length
    };
  });

  // 3. КАРТОЧКА ТОВАРА
  console.log('3. Скриншот карточки товара...');
  
  // Кликни на первый результат или перейди напрямую
  const firstLink = page.locator('table tbody tr:first-child a, [data-testid="product-row"]:first-child a').first();
  if (await firstLink.count() > 0) {
    await firstLink.click();
  } else {
    await page.goto('http://127.0.0.1:3000/product/LM317T');
  }
  
  await page.waitForTimeout(3000);
  
  await page.screenshot({ 
    path: join(artifactsDir, 'screenshots', '3-product-page.png'),
    fullPage: true 
  });

  // Собери информацию о карточке
  const productPageInfo = await page.evaluate(() => {
    return {
      url: window.location.href,
      hasProductImage: !!document.querySelector('img[alt], img[src*="api/image"]'),
      hasTabs: !!document.querySelector('[role="tablist"], button[class*="tab"]'),
      tabsCount: document.querySelectorAll('[role="tab"], button[class*="tab"]').length,
      hasCharacteristicsTable: !!document.querySelector('table'),
      hasOrderButton: !!document.querySelector('button:has-text("Добавить"), button:has-text("Заказ")'),
      hasPriceBlock: !!document.querySelector('[class*="price"]'),
      hasDatasheetLink: !!document.querySelector('a[href*="pdf"], a:has-text("Datasheet")'),
      glassEffect: Array.from(document.querySelectorAll('[class*="glass"]')).length,
      mainSections: Array.from(document.querySelectorAll('main > div')).map(div => ({
        classes: div.className,
        hasTable: !!div.querySelector('table'),
        hasButton: !!div.querySelector('button')
      }))
    };
  });

  // Сохрани всю информацию
  await writeFile(
    join(artifactsDir, 'main-page-info.json'),
    JSON.stringify(mainPageInfo, null, 2)
  );
  
  await writeFile(
    join(artifactsDir, 'search-page-info.json'),
    JSON.stringify(searchPageInfo, null, 2)
  );

  await writeFile(
    join(artifactsDir, 'product-page-info.json'),
    JSON.stringify(productPageInfo, null, 2)
  );

  await browser.close();
  console.log('✅ Скриншоты сохранены в:', artifactsDir);
}

analyzeProject().catch(console.error);
```

Запусти скрипт:

```bash
cd /opt/deep-agg
node scripts/analyze-project.mjs
```

---

## Шаг 3: Собери структуру проекта

```bash
cd /opt/deep-agg

# Создай файл со структурой фронтенда
tree -L 4 -I 'node_modules|.git|dist|build|.next|cache' v0-components-aggregator-page > v0-analysis-artifacts/project-structure.txt

# Если нет tree, используй find:
find v0-components-aggregator-page -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.mjs" \) \
  | grep -v node_modules | grep -v .next | sort > v0-analysis-artifacts/project-structure.txt

# Добавь список endpoints бэкенда
echo -e "\n=== BACKEND ENDPOINTS ===" >> v0-analysis-artifacts/project-structure.txt
grep -r "app\.(get|post|put|delete)" server.js api/*.mjs | grep -v node_modules >> v0-analysis-artifacts/project-structure.txt
```

---

## Шаг 4: Скопируй ключевые файлы

```bash
cd /opt/deep-agg/v0-analysis-artifacts
mkdir -p code-files/app code-files/components code-files/lib

# Скопируй файлы 3 страниц
cp ../v0-components-aggregator-page/app/page.tsx code-files/app/main-page.tsx
cp ../v0-components-aggregator-page/app/results/page.tsx code-files/app/search-page.tsx
cp ../v0-components-aggregator-page/app/product/\[mpn\]/page.tsx code-files/app/product-page.tsx

# Скопируй компоненты
cp ../v0-components-aggregator-page/components/ResultsClient.tsx code-files/components/ 2>/dev/null || echo "ResultsClient not found"
cp ../v0-components-aggregator-page/components/DiagChip.tsx code-files/components/ 2>/dev/null || echo "DiagChip not found"
cp ../v0-components-aggregator-page/components/Footer.tsx code-files/components/ 2>/dev/null || echo "Footer not found"

# Скопируй стили
cp ../v0-components-aggregator-page/app/globals.css code-files/globals.css

# Скопируй конфиг
cp ../v0-components-aggregator-page/next.config.js code-files/next.config.js 2>/dev/null || echo "next.config not found"
cp ../v0-components-aggregator-page/tailwind.config.ts code-files/tailwind.config.ts 2>/dev/null || echo "tailwind.config not found"

# Скопируй package.json
cp ../v0-components-aggregator-page/package.json code-files/package.json
```

---

## Шаг 5: Создай отчет

Создай файл `/opt/deep-agg/v0-analysis-artifacts/REPORT.md`:

```bash
cat > /opt/deep-agg/v0-analysis-artifacts/REPORT.md << 'EOF'
# Отчет по текущему состоянию проекта Diponika

**Дата:** 2025-10-11
**Проект:** Deep Components Aggregator (Diponika)

---

## Структура проекта

**Фронтенд:**
- Фреймворк: Next.js 14.2.16 (App Router)
- Язык: TypeScript
- Стили: Tailwind CSS + globals.css (glassmorphism, animations)
- Путь: `/opt/deep-agg/v0-components-aggregator-page`
- Порт: `3000`
- PM2 процесс: `deep-v0`

**Бэкенд:**
- Фреймворк: Express.js
- Путь: `/opt/deep-agg`
- Порт: `9201`
- PM2 процесс: `deep-agg`
- API: `/api/health`, `/api/search`, `/api/live/search` (SSE), `/api/product`, `/api/vitrine/list`, `/api/image`, `/api/pdf`

**Rewrites:**
- Фронт (3000) → Бэк (9201) через Next.js rewrites в `next.config.js`
- `/api/*` → `http://127.0.0.1:9201/api/*`
- `/auth/*` → `http://127.0.0.1:9201/auth/*`

---

## Файлы страниц

### 1. Главная страница (`/`)
- **Файл:** `v0-components-aggregator-page/app/page.tsx`
- **Компоненты:** SearchForm (inline), Logo (SVG gradient), animated background
- **Работает:** 
  - Форма поиска с input name="q"
  - Submit → redirect на `/results?q=...`
  - Logo с gradient animation
  - Glassmorphism header/footer
- **Проблемы:**
  - [ПРОВЕРИТЬ] Анимация фона (должна быть как в v0 дизайне)
  - [ПРОВЕРИТЬ] Подсказки провайдеров (DigiKey, Mouser, TME, Farnell)

### 2. Страница поиска (`/results`)
- **Файл:** `v0-components-aggregator-page/app/results/page.tsx`
- **Компоненты:** `ResultsShell`, `ResultsClient`
- **SSE:** Да, подключен через `EventSource` на `/api/live/search`
- **Работает:**
  - SSR cache через `/api/vitrine/list` (FTS5)
  - Live SSE добавление результатов
  - Таблица с колонками: MPN, Manufacturer, Title, Price (₽), Stock, Region
  - RU→EN badge (условный, показывается если `queryNorm.hasCyrillic`)
  - Переносы длинных названий
- **Проблемы:**
  - [ПРОВЕРИТЬ] Glassmorphism таблицы (прозрачность, blur)
  - [ПРОВЕРИТЬ] Анимация добавления новых строк (fade-in)
  - [ПРОВЕРИТЬ] Индикатор Live SSE (пульсирующая точка)

### 3. Карточка товара (`/product/[mpn]`)
- **Файл:** `v0-components-aggregator-page/app/product/[mpn]/page.tsx`
- **API:** Да, подключен через `/api/product?mpn=...`
- **Работает:**
  - Hero image через `/api/image?url=...` (proxy)
  - Tabs: Specs, Offers, Docs
  - "Цена от X₽" label
  - Pagination для Offers (25/page)
  - Datasheets через `/api/pdf?url=...&dl=1` (download)
  - Placeholder SVG для отсутствующих изображений
  - DiagChip в header
- **Проблемы:**
  - [ПРОВЕРИТЬ] Glassmorphism карточек (секции должны быть с backdrop-blur)
  - [ПРОВЕРИТЬ] Табы (активная должна подсвечиваться градиентом)
  - [ПРОВЕРИТЬ] Кнопка "Добавить в заказ" (gradient background как в дизайне)

---

## Проблемы с дизайном v0

### Общие проблемы:
1. **Фон:** Проверить соответствие animated gradient background из v0 дизайна
2. **Glassmorphism:** Все карточки должны иметь `backdrop-filter: blur(10px)` + `background: rgba(255,255,255,0.05)`
3. **Шрифты:** Убедиться что используется Roboto (300, 400, 500, 700)
4. **Цвета:** Gradient должен быть `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

### Главная страница:
- [ ] Фон: анимированные градиентные пятна (blobs)
- [ ] Logo: SVG с gradient stroke
- [ ] Search input: glassmorphism, placeholder "Поиск компонентов..."
- [ ] Провайдеры: карточки с иконками (DigiKey, Mouser, TME, Farnell)

### Страница поиска:
- [ ] Таблица: glassmorphism, fixed header при скролле
- [ ] Live indicator: пульсирующая точка рядом с "Результаты"
- [ ] RU→EN badge: только при кириллице, синий фон
- [ ] Hover на строке: подсветка градиентом

### Карточка товара:
- [ ] Hero секция: glassmorphism, image слева, info справа
- [ ] Tabs: gradient underline для активной
- [ ] Offers table: glassmorphism, pagination внизу
- [ ] Кнопки: gradient background `from-blue-500 to-purple-600`

---

## Скриншоты

- `screenshots/1-main-page.png` - главная страница (desktop 1920×1080)
- `screenshots/2-search-page.png` - результаты поиска для "LM317T"
- `screenshots/3-product-page.png` - карточка товара LM317T

---

## Код файлы

- `code-files/app/main-page.tsx` - код главной
- `code-files/app/search-page.tsx` - код поиска
- `code-files/app/product-page.tsx` - код карточки
- `code-files/components/ResultsClient.tsx` - Live SSE компонент
- `code-files/components/DiagChip.tsx` - индикатор статуса провайдеров
- `code-files/globals.css` - глобальные стили
- `code-files/tailwind.config.ts` - Tailwind конфигурация
- `code-files/package.json` - зависимости

---

## Технические детали

**SSE (Server-Sent Events):**
- Endpoint: `/api/live/search?q=...`
- Headers: `Content-Type: text/event-stream`, `X-Accel-Buffering: no`
- События: `search:start`, `provider:partial`, `provider:error`, `result`, `done`
- Разделители: двойной `\n\n`
- Heartbeat: `: ping` каждые 30 секунд

**Proxy endpoints:**
- `/api/image?url=<ENCODED>` - проксирует изображения компонентов
- `/api/pdf?url=<ENCODED>&dl=1` - проксирует PDF datasheets с Content-Disposition: attachment

**Валюта:**
- ЦБ РФ курсы: USD → ₽, EUR → ₽
- Обновление: ежедневно
- Fallback: Last Known Good (LKG)

**Провайдеры:**
- DigiKey: OAuth (configured)
- Mouser: API key (configured)
- TME: Token/secret (configured)
- Farnell: API key (configured)

---

## Следующие шаги

1. **Проверка дизайна:** Сравнить скриншоты с оригинальным дизайном v0
2. **Правки:** Получить от v0 AI список конкретных изменений
3. **Реализация:** Применить правки без изменения сетки (только токены/утилити-классы)
4. **Верификация:** Новые скриншоты после правок

EOF
```

---

## Шаг 6: Залей все в GitHub

```bash
cd /opt/deep-agg/v0-analysis-artifacts

# Инициализируй git
git init

# Создай .gitignore
cat > .gitignore << 'EOF'
node_modules/
.DS_Store
*.log
EOF

# Добавь все файлы (включая PNG скриншоты)
git add .

# Создай коммит
git commit -m "Current project state for v0 analysis

- Screenshots of all 3 pages (desktop 1920x1080)
- Project structure and file tree
- Code files (TSX, CSS, config)
- JSON analysis data
- Comprehensive REPORT.md

Pages analyzed:
- Main page (/)
- Search results (/results?q=LM317T)
- Product card (/product/LM317T)

Backend: Express on 9201
Frontend: Next.js 14 on 3000
Design: v0 glassmorphism + gradient animations"

# Залей на GitHub
# ЗАМЕНИ [username] на свой GitHub username!
git remote add origin https://github.com/[username]/diponika-current-state.git
git branch -M main
git push -u origin main
```

**Важно:** 
- Git поддерживает PNG/JPG изображения — скриншоты загрузятся нормально
- Если репозиторий не создан, создай его на GitHub: https://github.com/new
- Имя репозитория: `diponika-current-state`
- Visibility: Public (чтобы v0 AI мог посмотреть)

---

## Шаг 7: Выведи результат

Запусти все команды и сохрани вывод:

```bash
cd /opt/deep-agg/v0-analysis-artifacts

echo "=== PROJECT STRUCTURE ==="
cat project-structure.txt

echo -e "\n=== MAIN PAGE INFO ==="
cat main-page-info.json

echo -e "\n=== SEARCH PAGE INFO ==="
cat search-page-info.json

echo -e "\n=== PRODUCT PAGE INFO ==="
cat product-page-info.json

echo -e "\n=== REPORT ==="
cat REPORT.md

echo -e "\n=== MAIN PAGE CODE (first 100 lines) ==="
head -100 code-files/app/main-page.tsx

echo -e "\n=== SEARCH PAGE CODE (first 100 lines) ==="
head -100 code-files/app/search-page.tsx

echo -e "\n=== PRODUCT PAGE CODE (first 100 lines) ==="
head -100 code-files/app/product-page.tsx

echo -e "\n=== GLOBALS CSS (first 100 lines) ==="
head -100 code-files/globals.css

echo -e "\n=== TAILWIND CONFIG ==="
cat code-files/tailwind.config.ts

echo -e "\n=== PACKAGE.JSON ==="
cat code-files/package.json
```

Сохрани весь вывод в файл:

```bash
# Повтори команды выше и направь в файл
cd /opt/deep-agg/v0-analysis-artifacts
{
  echo "=== PROJECT STRUCTURE ==="
  cat project-structure.txt
  echo -e "\n=== MAIN PAGE INFO ==="
  cat main-page-info.json
  echo -e "\n=== SEARCH PAGE INFO ==="
  cat search-page-info.json
  echo -e "\n=== PRODUCT PAGE INFO ==="
  cat product-page-info.json
  echo -e "\n=== REPORT ==="
  cat REPORT.md
  echo -e "\n=== MAIN PAGE CODE (first 100 lines) ==="
  head -100 code-files/app/main-page.tsx
  echo -e "\n=== SEARCH PAGE CODE (first 100 lines) ==="
  head -100 code-files/app/search-page.tsx
  echo -e "\n=== PRODUCT PAGE CODE (first 100 lines) ==="
  head -100 code-files/app/product-page.tsx
  echo -e "\n=== GLOBALS CSS (first 100 lines) ==="
  head -100 code-files/globals.css
  echo -e "\n=== TAILWIND CONFIG ==="
  cat code-files/tailwind.config.ts
  echo -e "\n=== PACKAGE.JSON ==="
  cat code-files/package.json
} > FULL_OUTPUT.txt

# Покажи файл
cat FULL_OUTPUT.txt
```

---

## Шаг 8: Отправь результат

Отправь мне **2 вещи:**

### 1. Ссылка на GitHub репозиторий

```
https://github.com/[username]/diponika-current-state
```

### 2. Содержимое файла FULL_OUTPUT.txt

Скопируй весь текст из файла:

```bash
cat /opt/deep-agg/v0-analysis-artifacts/FULL_OUTPUT.txt
```

---

## Что я смогу сделать с этим:

✅ Посмотреть **скриншоты** на GitHub (как выглядит сейчас)  
✅ Прочитать **код** всех 3 страниц  
✅ Проанализировать **структуру** проекта  
✅ Увидеть **JSON данные** о DOM элементах  
✅ Дать **конкретные правки** в стилях и компонентах  
✅ Сгенерировать **Playwright тесты** для проверки дизайна  

---

## Чеклист для исполнителя

- [ ] Процессы запущены (pm2 status показывает deep-agg и deep-v0 online)
- [ ] Playwright скрипт выполнен (`node scripts/analyze-project.mjs`)
- [ ] 3 скриншота созданы в `v0-analysis-artifacts/screenshots/`
- [ ] JSON файлы созданы (main-page-info, search-page-info, product-page-info)
- [ ] Структура проекта сохранена в `project-structure.txt`
- [ ] Код файлы скопированы в `code-files/`
- [ ] REPORT.md создан с описанием проблем
- [ ] Git репозиторий инициализирован
- [ ] Коммит создан
- [ ] Залито на GitHub (public repo)
- [ ] FULL_OUTPUT.txt сгенерирован
- [ ] Ссылка на GitHub + FULL_OUTPUT.txt отправлены

---

**После получения этих данных я дам точные инструкции по правкам дизайна v0!**
