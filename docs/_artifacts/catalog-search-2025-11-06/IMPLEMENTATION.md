# Catalog In-Page Search Implementation

**Date**: 6 ноября 2025, 13:00 UTC  
**Feature**: Поиск с результатами на той же странице категории  
**Status**: ✅ IMPLEMENTED

---

## Requirements

**User Request**:
> "в конечном пункте, где уже идет страница типа товаров, где нужно вводить наименование товара, где поиск. Там после поиска должно выводить результаты поиска. в которых будет список товаров с фильтрацией. так можно сделать? вот как у нас сейчас выводится результат поиска, только уже на странице в конкретной категории."

**Translation**:
- В конечной категории (leaf) где есть форма поиска
- После submit показывать результаты **на той же странице** (не редирект)
- Использовать тот же формат таблицы/карточек как на `/results`
- Фильтрация по текущей категории
- Хлебные крошки должны оставаться видимыми

---

## Implementation Details

### 1. UI Changes (`catalog.ejs`)

**Added Containers**:
```html
<!-- Search Results (hidden by default) -->
<div id="search-results-container" class="hidden">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h2>Результаты поиска: <span id="search-query-display"></span></h2>
      <p><span id="results-count">0</span> компонентов найдено</p>
      <span id="category-filter-badge"></span>
    </div>
    <button id="back-to-catalog">← Назад к каталогу</button>
  </div>

  <!-- Desktop: Table -->
  <div id="results-table-wrapper">
    <table>
      <thead>...</thead>
      <tbody id="results-tbody"></tbody>
    </table>
  </div>

  <!-- Mobile: Cards -->
  <div id="results-cards"></div>

  <!-- Empty State -->
  <div id="results-empty" class="hidden">...</div>

  <!-- Loading -->
  <div id="search-loading">...</div>
</div>
```

**Key Features**:
- Desktop: таблица с колонками (Фото, Производитель, MPN, Описание, Регион, Цена, Действие)
- Mobile: карточки с компактным layout
- Empty state: когда результатов нет
- Loading indicator: spinner + статус текст
- Back button: возврат к навигации категорий

### 2. JavaScript Changes

**Before** (redirect):
```javascript
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = (input?.value || '').trim();
  if (query) {
    window.location.href = `/results?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category.name)}`;
  }
});
```

**After** (in-page search):
```javascript
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = (input?.value || '').trim();
  if (query) {
    window.currentCategoryContext = category;
    startCatalogSearch(query, category);
  }
});
```

**New Functions Added**:

1. **`startCatalogSearch(query, category)`**:
   - Hide catalog content (`contentEl.style.display = 'none'`)
   - Show results container
   - Update UI (query display, category badge, reset counters)
   - Start SSE connection to `/api/search-stream?q=...`
   - Listen for `item` and `done` events

2. **`updateSearchResults()`**:
   - Update results count
   - Render table rows (desktop) via `renderTableRow()`
   - Render cards (mobile) via `renderCard()`
   - Attach click handlers for navigation to `/product/[mpn]`

3. **`renderTableRow(item)`**:
   - Extract: image, manufacturer, MPN, description, regions, price
   - Format price with currency
   - Render table row HTML with all columns
   - Return string for insertion into `tbody`

4. **`renderCard(item)`**:
   - Similar to `renderTableRow` but card layout
   - Optimized for mobile screens
   - Flex layout with image on left, details on right

5. **Back to Catalog Handler**:
   ```javascript
   document.getElementById('back-to-catalog')?.addEventListener('click', () => {
     document.getElementById('search-results-container').classList.add('hidden');
     contentEl.style.display = 'block';
     
     if (searchEventSource) {
       searchEventSource.close();
       searchEventSource = null;
     }
   });
   ```

### 3. Server-Sent Events (SSE) Integration

**SSE Flow**:
```
Client                           Server (/api/search-stream)
  │                                      │
  ├─ GET /api/search-stream?q=STM32 ──→ │
  │                                      ├─ Search cache
  │                                      ├─ Search DigiKey
  │ ←──────────── event: item ────────── │
  │ data: {"mpn":"STM32F103C8T6",...}   │
  │                                      │
  │ ←──────────── event: item ────────── │
  │ data: {"mpn":"STM32F103RBT6",...}   │
  │                                      │
  │ ←──────────── event: done ────────── │
  │                                      │
  └─ Close connection                    │
```

**Event Handlers**:
```javascript
searchEventSource.addEventListener('item', (event) => {
  const item = JSON.parse(event.data);
  searchResults.push(item);
  updateSearchResults(); // Re-render incrementally
});

searchEventSource.addEventListener('done', () => {
  searchCompleted = true;
  searchEventSource.close();
  document.getElementById('search-loading').style.display = 'none';
  
  if (searchResults.length === 0) {
    document.getElementById('results-empty').classList.remove('hidden');
  }
});
```

### 4. Category Context

**Category Badge**:
```javascript
document.getElementById('category-filter-badge').innerHTML = `
  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30">
    📁 ${escapeHtml(category.name)}
  </span>
`;
```

**Context Storage**:
```javascript
window.currentCategoryContext = category;
```

**Note**: В текущей реализации фильтрация по категории визуальная (показываем бейдж), но бэкенд `/api/search-stream` пока не поддерживает параметр `category`. Это будет добавлено в следующих итерациях.

---

## Breadcrumb Behavior

**Before Search**:
```
Главная > Integrated Circuits (ICs) > Microcontrollers
[Category Grid]
```

**During Search**:
```
Главная > Integrated Circuits (ICs) > Microcontrollers  ← Остаётся видимым
[Search Results: STM32]
```

**Breadcrumbs never hide** — они всегда показывают текущую навигационную позицию в дереве категорий.

---

## Responsive Design

**Desktop (≥768px)**:
- Table layout with 7 columns
- Hover effects on rows
- Price tooltips (если есть price_breaks)
- Full image thumbnails

**Mobile (<768px)**:
- Card layout (stacked)
- Image + details horizontal
- Compact price/action button
- Touch-optimized click areas

**CSS Classes**:
```html
<!-- Desktop only -->
<div class="hidden md:block" id="results-table-wrapper">

<!-- Mobile only -->
<div class="md:hidden space-y-4" id="results-cards">
```

---

## User Flow Example

### Scenario: Search for STM32 in Microcontrollers Category

**Step 1**: Navigate to leaf category
```
User: Clicks Integrated Circuits (ICs) → Microcontrollers
URL: /catalog-test?category=integrated-circuits-ics--microcontrollers
State: Search form visible
```

**Step 2**: Submit search query
```
User: Types "STM32" → clicks "Искать компоненты"
Action: form submit → startCatalogSearch('STM32', category)
State: 
  - contentEl hidden
  - search-results-container visible
  - search-loading visible
  - SSE connection opened
```

**Step 3**: Results arrive incrementally
```
SSE: event: item → STM32F103C8T6
     event: item → STM32F103RBT6
     event: item → STM32F407VGT6
     event: done
State:
  - results-tbody updated (3 rows)
  - results-cards updated (3 cards)
  - results-count = "3"
  - search-loading hidden
```

**Step 4**: Click product
```
User: Clicks row/card for STM32F103C8T6
Action: Navigate to /product/STM32F103C8T6
```

**Step 5**: Return to catalog
```
User: Clicks "← Назад к каталогу"
Action: 
  - search-results-container hidden
  - contentEl visible (search form shown again)
  - SSE connection closed
```

---

## Testing Checklist

- [x] Search form renders in leaf categories
- [x] Submit triggers in-page search (no redirect)
- [x] SSE connection established
- [x] Results appear incrementally
- [x] Desktop table renders correctly
- [x] Mobile cards render correctly
- [x] Empty state shows when no results
- [x] Category badge displays
- [x] Breadcrumbs remain visible
- [x] Back button returns to catalog
- [x] Product links work
- [x] SSE connection closes on back
- [ ] Category filtering in backend API (**TODO**: add `?category=` param support)

---

## Known Limitations

1. **No server-side category filtering yet**:
   - Badge shows category context
   - But `/api/search-stream` doesn't filter by category param
   - **Solution**: Add `?category=${slug}` to SSE URL and handle in `api/order.stream.mjs`

2. **No sorting/filtering UI**:
   - Results appear in order received from SSE
   - **Future**: Add sort dropdown (price, manufacturer, stock)

3. **No pagination**:
   - All results render at once
   - **Future**: If >100 results, add "Show more" button

4. **Autocomplete still active**:
   - Input field shows autocomplete dropdown
   - **Behavior**: User can select from autocomplete OR submit form
   - Both flows work correctly

---

## Files Modified

**1. `/opt/deep-agg/views/pages/catalog.ejs`**
- **Lines 28-92**: Added `search-results-container` HTML
- **Lines 582-650**: Added search functions (startCatalogSearch, updateSearchResults, renderTableRow, renderCard)
- **Lines 574-579**: Changed form submit handler

**Changes Summary**:
- +267 lines (HTML + JS)
- −1 line (old redirect logic)

---

## Deployment

**Commit**: `8e0f203`

**Deployment Steps**:
```bash
# 1. Verify file on server
cat /opt/deep-agg/views/pages/catalog.ejs | grep "search-results-container"

# 2. No rebuild needed (EJS template rendered on request)

# 3. Test
curl -s https://prosnab.tech/catalog-test | grep "search-results-container"
```

**Status**: ✅ LIVE on https://prosnab.tech/catalog-test

---

## Public Testing

**Test URL**: https://prosnab.tech/catalog-test

**Steps to Test**:
1. Navigate to any leaf category (e.g., Connectors → Barrel Connectors)
2. See search form with autocomplete
3. Type query (e.g., "STM32" or "резистор")
4. Submit form
5. **Expected**: Results appear on same page (table on desktop, cards on mobile)
6. **Expected**: Category badge shows "📁 [Category Name]"
7. **Expected**: Breadcrumbs still visible above results
8. Click "← Назад к каталогу"
9. **Expected**: Return to search form

---

## Next Steps

### High Priority
- [ ] Add `?category=${slug}` param to `/api/search-stream`
- [ ] Filter results by category in backend
- [ ] Test category filtering works correctly

### Medium Priority
- [ ] Add sort controls (price ↑↓, manufacturer A-Z)
- [ ] Add filter by region
- [ ] Add "Show more" pagination if >50 results

### Low Priority
- [ ] Persist search state in URL (?q=...&category=...)
- [ ] Add search history (localStorage)
- [ ] Add "Clear filters" button

---

## Success Metrics

**Before** (redirect flow):
- User navigates to category → types query → **redirected to /results**
- Loses category context
- Must use browser back to return
- Breadcrumbs disappear

**After** (in-page search):
- User navigates to category → types query → **results appear below**
- Category context preserved (badge + breadcrumbs)
- "Back" button returns to category browser
- Seamless UX

**Improvement**: ✅ No page reload, faster UX, better context retention

---

**Commit**: 8e0f203  
**Status**: ✅ IMPLEMENTED  
**Public URL**: https://prosnab.tech/catalog-test  
**Last Updated**: 6 ноября 2025, 13:05 UTC
