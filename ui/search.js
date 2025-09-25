// ui/search.js - Логика поиска с data-testid и без try/catch
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Форматирование цены в рублях
const fmtRub = (price) => {
  if (!price || price <= 0) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2
  }).format(price);
};

// Нормализация значений (без try/catch)
const nz = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).trim();
};

// Создание бейджей для регионов
const createBadges = (regions) => {
  if (!Array.isArray(regions) || regions.length === 0) return '—';
  return regions.map(region => `<span class="badge">${region}</span>`).join('');
};

// Создание строки таблицы результатов
const createResultRow = (item) => {
  const stock = (item.stock_total && item.stock_total > 0) 
    ? item.stock_total 
    : (item.lead_days ? `${item.lead_days}d` : '—');
  
  const minRub = fmtRub(item.price_min_rub);
  const image = item.image || '/ui/placeholder.svg';
  
  return `
    <tr data-testid="result-row">
      <td data-testid="cell-image">
        <img src="${image}" loading="lazy" decoding="async" 
             onerror="this.onerror=null;this.src='/ui/placeholder.svg';">
      </td>
      <td data-testid="cell-mpn">
        <a href="/product?mpn=${encodeURIComponent(item.mpn)}">${item.mpn}</a>
        <div class="title">${nz(item.title)}</div>
      </td>
      <td data-testid="cell-manufacturer">${nz(item.manufacturer)}</td>
      <td data-testid="cell-description">${nz(item.description)}</td>
      <td data-testid="cell-package">${nz(item.package)}</td>
      <td data-testid="cell-packaging">${nz(item.packaging)}</td>
      <td data-testid="cell-regions">${createBadges(item.regions)}</td>
      <td data-testid="cell-stock">${stock}</td>
      <td data-testid="cell-minrub">${minRub}</td>
      <td data-testid="cell-open">
        <a href="/product?mpn=${encodeURIComponent(item.mpn)}">Open</a>
      </td>
    </tr>
  `;
};

// Рендеринг результатов поиска
const renderResults = (results) => {
  const tbody = $('#results-tbody');
  const summary = $('#results-summary');
  
  if (!results || results.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:#6b7280;">Результатов не найдено</td></tr>';
    summary.textContent = 'Результатов не найдено';
    return;
  }
  
  tbody.innerHTML = results.map(createResultRow).join('');
  summary.textContent = `Найдено: ${results.length} результатов`;
};

// Выполнение поиска
const performSearch = async (query) => {
  if (!query || query.trim() === '') {
    renderResults([]);
    return;
  }
  
  const summary = $('#results-summary');
  summary.textContent = 'Поиск...';
  
  const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
  
  if (!response.ok) {
    summary.textContent = `Ошибка поиска: ${response.status}`;
    renderResults([]);
    return;
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    summary.textContent = 'Ошибка: неверный формат ответа';
    renderResults([]);
    return;
  }
  
  const data = await response.json();
  
  if (!data.ok) {
    summary.textContent = `Ошибка API: ${data.error || 'неизвестная ошибка'}`;
    renderResults([]);
    return;
  }
  
  renderResults(data.items || []);
};

// Инициализация
const initSearch = () => {
  const form = $('#search-form');
  const input = $('#search-input');
  
  if (!form || !input) return;
  
  // Обработка отправки формы
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (query) {
      // Обновляем URL без перезагрузки
      const url = new URL(window.location);
      url.searchParams.set('q', query);
      window.history.pushState({}, '', url);
      
      performSearch(query);
    }
  });
  
  // Загрузка поиска из URL при инициализации
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q');
  
  if (initialQuery) {
    input.value = initialQuery;
    performSearch(initialQuery);
  }
};

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSearch);
} else {
  initSearch();
}
