# Catalog Search Improvements - 6 ноября 2025

## Задача

Улучшить UX поиска в каталоге на основе обратной связи пользователя:

1. ✅ Убрать бесполезный hint "использовать категорию в фильтрах"
2. ✅ Исправить autocomplete: не редирект на `/product/mpn`, а заполнение поиска + показ результатов
3. ✅ Добавить пагинацию: показывать 20 товаров, кнопка "Показать ещё"
4. ❌ ~~Фильтр только по текущей категории~~ (технически невозможно с текущей архитектурой)

---

## Реализация

### 1. Hint о scope поиска

**Было:**
```html
<p>💡 Совет: используйте категорию "${category.name}" в фильтрах результатов</p>
```

**Стало:**
```html
<p>🔍 Поиск ведётся <span class="font-medium">по всем поставщикам</span> (DigiKey, Mouser, TME, Farnell). Для навигации по категориям используйте дерево слева.</p>
```

**Причина:** Live search — глобальный поиск по всем провайдерам. Категории DigiKey не применяются к Mouser/TME/Farnell.

---

### 2. Autocomplete → Fill + Search

**Было:**
```javascript
el.addEventListener('click', () => {
  const item = currentResults[idx];
  if (item) {
    window.location.href = `/product/${encodeURIComponent(item.mpn)}`;
  }
});
```

**Стало:**
```javascript
el.addEventListener('click', () => {
  const item = currentResults[idx];
  if (item) {
    input.value = item.mpn; // Заполнить поле
    autocompleteEl.classList.add('hidden'); // Закрыть dropdown
    startCatalogSearch(item.mpn, category); // Запустить поиск
  }
});
```

**Результат:** Поведение как на главной странице. Hover preview сохранён.

---

### 3. Пагинация (20 + Load More)

**Паттерн из Context7** (patterns.dev):
- Store all results → render incrementally
- No API overload (one SSE request)
- Instant "load more" (data in memory)

**Код:**
```javascript
// Переменные
let searchResults = []; // Все результаты
let displayedCount = 20; // Сколько показываем

// SSE event handler
searchEventSource.addEventListener('result', (event) => {
  const data = JSON.parse(event.data);
  searchResults = data.rows || []; // Сохранить все
  updateSearchResults(); // Отрисовать только displayedCount
});

// Render только displayedCount товаров
function updateSearchResults() {
  const itemsToShow = searchResults.slice(0, displayedCount);
  tbody.innerHTML = itemsToShow.map(item => renderTableRow(item)).join('');
  
  // Показать/скрыть кнопку
  if (displayedCount < searchResults.length) {
    loadMoreBtn.style.display = 'block';
    loadMoreBtn.querySelector('.load-more-count').textContent = 
      Math.min(20, searchResults.length - displayedCount);
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

// Load More handler
window.loadMoreResults = function() {
  displayedCount += 20;
  updateSearchResults(); // Re-render
};
```

**HTML:**
```html
<div id="load-more-btn" class="hidden text-center py-6">
  <button onclick="window.loadMoreResults()">
    Показать ещё <span class="load-more-count">20</span>
  </button>
</div>
```

---

### 4. SSE Endpoint Correction

**Проблема:** Использовался несуществующий `/api/search-stream`

**Исправление:**
- Найден правильный endpoint: `/api/live/search` (server.js line 600)
- Обновлён URL: `/api/live/search?q=...&limit=999`
- Исправлен event listener: `'item'` → `'result'`
- Все результаты приходят одним событием в `data.rows`

---

### 5. Категорийный фильтр — НЕВОЗМОЖЕН

**Исследование:**

**Проверка 1: Структура результатов**
```bash
curl -s "http://localhost:9201/api/search?q=STM32&limit=1" | jq '.rows[0] | keys'
```
**Результат:** Нет поля `category`

**Проверка 2: База данных**
```bash
sqlite3 ./var/db/deepagg.sqlite "PRAGMA table_info(product_cache)"
```
**Результат:** Поле `product` (JSON), но категории внутри нет

**Проверка 3: Кэш**
```bash
sqlite3 ./var/db/deepagg.sqlite "SELECT COUNT(*) as total, src FROM product_cache GROUP BY src"
```
**Результат:** 125 товаров (src='merged'), все без категорий

**Вывод:**
- Провайдеры (DigiKey, Mouser, TME, Farnell) не отдают категорию в результатах поиска
- DigiKey категории есть только в справочнике `catalog_categories` (1193 категории)
- Нет связи MPN → категория в БД
- Live search — глобальный поиск, фильтровать по DigiKey категориям технически невозможно

**Альтернатива:**
Если требуется фильтр, нужно обогащать результаты категорией:
1. После получения результатов от провайдеров
2. Для DigiKey MPN искать категорию в каталоге
3. Фильтровать только DigiKey результаты, остальные показывать всегда

**Решение:** Убрать фильтр, признать что live search = глобальный поиск.

---

## Тестирование

### Backend (SSE Endpoint)

```bash
curl -sN "http://localhost:9201/api/live/search?q=STM32&limit=5" | head -50
```

**Результат:**
```
event: search:start
data: {"query":"STM32","timestamp":1762426887321}

event: provider:partial
data: {"provider":"mouser","count":50,"elapsed":1061}

event: provider:partial
data: {"provider":"digikey","count":10,"elapsed":2091}

event: provider:partial
data: {"provider":"tme","count":10,"elapsed":307}

event: provider:partial
data: {"provider":"farnell","count":25,"elapsed":1041}

event: result
data: {"rows":[...5 товаров...],"meta":{"total":5,"total_before_limit":60,"limit":5,...}}

event: done
data: {"completed":true,"timestamp":1762426889672}
```

✅ **SSE работает корректно:**
- События: `search:start`, `provider:partial`, `result`, `done`
- Все 4 провайдера вернули результаты (60 товаров)
- Лимит применён (показано 5 из 60)
- Формат SSE правильный (двойной \n между событиями)

---

### Frontend (Manual Testing Required)

**Не протестировано** (требуется браузер):

1. **Autocomplete Behavior:**
   - Перейти на `/catalog-test/integrated-circuits-ics-embedded-microcontrollers`
   - Ввести "STM" в поиск
   - Кликнуть на autocomplete элемент
   - **Ожидается:** Заполнение поля + запуск поиска (НЕ редирект)

2. **Pagination:**
   - Выполнить поиск, получить >20 результатов
   - **Ожидается:** Показано 20 товаров, кнопка "Показать ещё X"
   - Кликнуть кнопку
   - **Ожидается:** Показано 40 товаров (без перезагрузки страницы)

3. **Hint Text:**
   - Проверить текст под формой поиска
   - **Ожидается:** "Поиск ведётся по всем поставщикам..."

---

## Коммиты

### Commit 1: dd34988 (Frontend)
```
feat(catalog): improve search UX - autocomplete, pagination, hint

Frontend (catalog.ejs):
- Changed autocomplete: fill input + trigger search (not redirect)
- Added pagination: 20 results + Load More button (+20 increments)
- Updated hint: "Search across all providers" instead of "Use category filter"
- Fixed SSE endpoint: /api/search-stream → /api/live/search
- Fixed event listener: 'item' → 'result' (data.rows instead of single items)
- Preserved hover preview feature

Context7 research: patterns.dev pagination patterns
Pattern: Store all data, render incrementally (no API overload)

Related: User feedback on catalog search issues
Status: Frontend complete, backend category filter removed
```

### Commit 2: <CURRENT>
```
refactor(catalog): remove category filter from live search

Backend (server.js):
- Removed category parameter from /api/live/search
- Removed Database import (not needed for global search)
- Removed getCategoryNameBySlug() helper (unused)
- Removed category filter logic (providers don't return category field)

Reason:
- Live search = global search (DigiKey, Mouser, TME, Farnell)
- Providers don't return 'category' field in results
- DigiKey categories exist only in catalog_categories table (no MPN→category mapping)
- Filtering by DigiKey category is architecturally impossible without data enrichment

Frontend (catalog.ejs):
- Removed category parameter from SSE URL
- Updated hint to clarify global search scope

Status: Simplified, works as designed (global search)
```

---

## Итоги

### Выполнено ✅

1. ✅ Hint изменён на правдивый (глобальный поиск, не scope категории)
2. ✅ Autocomplete исправлен (fill + search, не редирект)
3. ✅ Пагинация реализована (20 + Load More, без перезагрузки)
4. ✅ SSE endpoint исправлен (`/api/live/search`)
5. ✅ Код упрощён (убрана невозможная фильтрация)

### Не выполнено ❌

- ❌ Фильтр по категории (технически невозможно без обогащения данных)

### Производительность

- ✅ Один SSE запрос (limit=999 для получения всех результатов)
- ✅ Мгновенная пагинация (данные в памяти браузера)
- ✅ Нет дополнительных API вызовов
- ✅ Vanilla JS (без перезагрузки страницы)

### Следующие шаги

**Если требуется фильтр по категории:**
1. Создать таблицу `mpn_to_category` (MPN → DigiKey category ID)
2. Наполнить через DigiKey Search API
3. Обогащать результаты категорией после получения от провайдеров
4. Фильтровать на backend перед отправкой SSE event

**Если текущее решение OK:**
- Протестировать на реальных пользователях
- Собрать метрики использования пагинации
- Оптимизировать limit (999 может быть избыточно)

---

**Дата:** 6 ноября 2025  
**Автор:** GitHub Copilot  
**Статус:** Реализовано, требует frontend тестирования
