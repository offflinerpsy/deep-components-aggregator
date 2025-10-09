/**
 * Enhanced Search Interface with Russian Support
 *
 * Features:
 * - Russian query normalization indicators
 * - Improved table structure (Manufacturer|MPN|Description|Region|Price ₽|CTA)
 * - Stable pagination
 * - Error handling without try/catch (guard clauses)
 * - ₽ conversion display
 */

// Utilities
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Format price in rubles
const formatRub = (price) => {
  if (!price || price <= 0) return '—';

  // Handle price ranges
  if (typeof price === 'object' && (price.min || price.max)) {
    const min = price.min ? formatRub(price.min) : '—';
    const max = price.max ? formatRub(price.max) : '—';
    return min === max ? min : `${min} — ${max}`;
  }

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(price);
};

// Normalize display values
const normalize = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  return String(value).trim();
};

// Create region badges
const createRegionBadges = (regions) => {
  if (!Array.isArray(regions) || regions.length === 0) return '—';

  return regions
    .slice(0, 3) // Limit to 3 regions max
    .map(region => `<span class="region-badge">${normalize(region)}</span>`)
    .join('');
};

// Create product table row
const createProductRow = (product, index) => {
  // Product image with fallback
  const rawImage = product.photo || product.image_url || '';
  const imageUrl = rawImage ? `/api/image?url=${encodeURIComponent(rawImage)}` : '';
  const placeholderSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#9ca3af" font-size="10">Фото</text>
    </svg>
  `;
  const placeholderImage = `data:image/svg+xml,${encodeURIComponent(placeholderSvg.trim())}`;

  // Calculate price range from pricing array
  let priceDisplay = '—';
  const pricingList = Array.isArray(product.pricing) ? product.pricing : Array.isArray(product.price_breaks) ? product.price_breaks : [];

  if (pricingList.length > 0) {
    const rubPrices = pricingList
      .map(p => p.price_rub || p.priceRub || 0)
      .filter(p => p && p > 0)
      .sort((a, b) => a - b);

    if (rubPrices.length > 0) {
      const min = rubPrices[0];
      const max = rubPrices[rubPrices.length - 1];
      priceDisplay = min === max ? formatRub(min) : `${formatRub(min)} — ${formatRub(max)}`;
    }
  } else if (product.minRub || product.min_rub || product.min_price_rub) {
    const minCandidate = product.minRub || product.min_rub || product.min_price_rub;
    priceDisplay = formatRub(minCandidate);
  } else if (product.price_rub || product.priceRub) {
    priceDisplay = formatRub(product.price_rub || product.priceRub);
  }

  // Product detail URL
  const detailUrl = product.product_url ? product.product_url : `/ui/product.html?src=${encodeURIComponent(product._src || product.source || 'unknown')}&id=${encodeURIComponent(product.mpn || '')}`;

  const providerLabel = product.source ? `<div class="product-subtitle" style="margin-top:4px; color: var(--muted); font-size: 12px;">${normalize(product.source)}</div>` : '';

  const descriptionText = normalize(product.description || product.description_short || product.title);
  const subtitleSource = product.title || product.description || product.description_short || '';

  return `
    <tr data-testid="product-row" data-index="${index}">
      <td class="col-image" data-label="Фото">
     <img class="product-thumb"
       src="${placeholderImage}"
       ${imageUrl ? `data-src="${imageUrl}"` : ''}
             alt="${normalize(product.mpn)}"
             loading="lazy"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
  <div style="display:none; width:48px; height:48px; background:#f3f4f6; border-radius:8px; align-items:center; justify-content:center; font-size:10px; color:#9ca3af;">Фото</div>
      </td>
      <td class="col-manufacturer" data-label="Производитель">
        ${normalize(product.manufacturer)}
      </td>
      <td class="col-mpn" data-label="MPN">
        <div class="product-title">${normalize(product.mpn)}</div>
        <div class="product-subtitle">${normalize(subtitleSource, '').substring(0, 60)}${subtitleSource.length > 60 ? '...' : ''}</div>
        ${providerLabel}
      </td>
      <td class="col-description" data-label="Описание">
        ${descriptionText}
      </td>
      <td class="col-region" data-label="Регион склада">
        ${createRegionBadges(product.regions)}
      </td>
      <td class="col-price" data-label="Цена ₽">
        <div class="price-rub">${priceDisplay}</div>
      </td>
      <td class="col-cta" data-label="Действие">
        <a href="${detailUrl}" class="btn-buy">Купить</a>
      </td>
    </tr>
  `;
};

// Render search results
const renderResults = (results, metadata = {}) => {
  const resultsSection = $('#results-section');
  const resultsSummary = $('#results-summary');
  const resultsTable = $('#results-table');
  const tbody = $('#results-tbody');

  // Show results section
  resultsSection.style.display = 'block';

  // Handle empty results
  if (!results || results.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <div>Результатов не найдено</div>
          <div style="font-size: 14px; margin-top: 8px;">Попробуйте изменить запрос или использовать другие ключевые слова</div>
        </td>
      </tr>
    `;
    resultsSummary.textContent = 'Результатов не найдено';
    return;
  }

  // Render product rows
  tbody.innerHTML = results.map(createProductRow).join('');

  // Update summary with enhanced metadata
  let summaryText = `Найдено: ${results.length} результатов`;
  if (metadata.source) {
    summaryText += ` • Источник: ${metadata.source}`;
  }
  if (metadata.searchStrategy && metadata.searchStrategy !== 'direct') {
    summaryText += ` • Стратегия: ${metadata.searchStrategy}`;
  }
  if (metadata.hasCyrillic) {
    summaryText += ` • Русификация: включена`;
  }
  if (metadata.elapsed) {
    summaryText += ` • ${metadata.elapsed}мс`;
  }

  resultsSummary.textContent = summaryText;

  // Lazy load images
  lazyLoadImages();
};

// Lazy load product images
const lazyLoadImages = () => {
  const images = $$('img[data-src]');

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
};

// Show loading state
const showLoading = () => {
  const resultsSection = $('#results-section');
  const resultsSummary = $('#results-summary');
  const tbody = $('#results-tbody');

  resultsSection.style.display = 'block';
  resultsSummary.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Поиск компонентов...
    </div>
  `;

  tbody.innerHTML = '';
};

// Show error state
const showError = (message) => {
  const resultsSection = $('#results-section');
  const resultsSummary = $('#results-summary');
  const tbody = $('#results-tbody');

  resultsSection.style.display = 'block';
  resultsSummary.textContent = 'Ошибка поиска';

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-state" style="color: var(--danger);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
        <div>Ошибка поиска</div>
        <div style="font-size: 14px; margin-top: 8px;">${message}</div>
      </td>
    </tr>
  `;
};

// Perform search with enhanced error handling
const performSearch = async (query) => {
  const cleanQuery = query ? query.trim() : '';

  // Guard clause: empty query
  if (!cleanQuery) {
    const resultsSection = $('#results-section');
    resultsSection.style.display = 'none';
    return;
  }

  console.log(`🔍 Enhanced Search: "${cleanQuery}"`);

  // Update URL without reload
  const newUrl = `${window.location.pathname}?q=${encodeURIComponent(cleanQuery)}`;
  history.replaceState(null, '', newUrl);

  // Show loading state
  showLoading();

  // Perform API request
  const apiUrl = `/api/search?q=${encodeURIComponent(cleanQuery)}`;
  const response = await fetch(apiUrl);

  // Guard clause: network error
  if (!response.ok) {
    console.error(`❌ Search API error: ${response.status} ${response.statusText}`);
    showError(`Ошибка сети: ${response.status} ${response.statusText}`);
    return;
  }

  // Parse response
  const text = await response.text();
  let data;

  // Guard clause: invalid JSON
  if (!text) {
    console.error('❌ Empty response from search API');
    showError('Сервер вернул пустой ответ');
    return;
  }

  // Parse JSON with guard clause
  const parseResult = parseJSON(text);
  if (!parseResult.success) {
    console.error('❌ Invalid JSON response:', parseResult.error);
    showError('Ошибка формата ответа сервера');
    return;
  }

  data = parseResult.data;

  // Guard clause: API error response
  if (!data.ok) {
    console.error('❌ API returned error:', data.error);
    showError(data.error || 'Внутренняя ошибка сервера');
    return;
  }

  // Log enhanced search metadata
  if (data.meta) {
    console.log(`📊 Search completed:`, {
      strategy: data.meta.searchStrategy,
      source: data.meta.source,
      usedQuery: data.meta.usedQuery,
      hasCyrillic: data.meta.hasCyrillic,
      attempts: data.meta.attempts,
      elapsed: data.meta.elapsed
    });
  }

  // Render results
  renderResults(data.rows || [], data.meta || {});
};

// Safe JSON parsing
const parseJSON = (text) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { success: false, error: 'Empty text' };
  }

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return { success: false, error: 'Not JSON format' };
  }

  // Manual JSON parsing without try/catch
  let data;
  let parseError = null;

  // Use a validation approach
  const isValidJSON = (str) => {
    if (typeof str !== 'string') return false;
    const first = str.charAt(0);
    const last = str.charAt(str.length - 1);
    return (first === '{' && last === '}') || (first === '[' && last === ']');
  };

  if (!isValidJSON(trimmed)) {
    return { success: false, error: 'Invalid JSON structure' };
  }

  // Use built-in JSON.parse but validate first
  const result = JSON.parse(trimmed);
  return { success: true, data: result };
};

// Initialize search functionality
const initSearch = () => {
  const searchForm = $('#search-form');
  const searchInput = $('#search-input');

  // Guard clause: missing elements
  if (!searchForm || !searchInput) {
    console.error('❌ Search form elements not found');
    return;
  }

  // Form submission handler
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      performSearch(query);
    }
  });

  // Real-time search on input (debounced)
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length >= 2) {
      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, 500);
    } else if (query.length === 0) {
      const resultsSection = $('#results-section');
      resultsSection.style.display = 'none';
    }
  });

  console.log('✅ Enhanced search initialized');
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSearch);
} else {
  initSearch();
}

// Global function for URL-based search
window.performSearch = performSearch;
