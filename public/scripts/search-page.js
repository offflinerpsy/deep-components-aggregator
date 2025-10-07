// ДИПОНИКА Search Results Page Script

// Get query parameter
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Initialize theme
function initTheme() {
  const html = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  
  if (!toggle) return;
  
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  if (savedTheme === 'dark') {
    html.classList.add('dark');
  }
  
  toggle.addEventListener('click', () => {
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// Initialize search form
function initSearch() {
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  const resetBtn = document.getElementById('resetBtn');
  
  if (!form || !input) return;
  
  // Set input value from query param
  const query = getQueryParam('q');
  if (query) {
    input.value = query;
  }
  
  // Handle form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newQuery = input.value.trim();
    if (newQuery && newQuery !== query) {
      window.location.href = `/search.html?q=${encodeURIComponent(newQuery)}`;
    }
  });
  
  // Handle reset button
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      input.value = '';
      input.focus();
    });
  }
}

// Render results
function renderResults(data) {
  const tbody = document.getElementById('resultsBody');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const tableWrap = document.querySelector('.tableWrap');
  const searchInfo = document.getElementById('searchInfo');
  const searchMeta = document.getElementById('searchMeta');
  
  if (!tbody) return;
  
  // Hide loading
  if (loadingState) loadingState.style.display = 'none';
  
  // Check if we have results
  if (!data || !data.rows || data.rows.length === 0) {
    if (tableWrap) tableWrap.style.display = 'none';
    if (searchInfo) searchInfo.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  
  // Show table and info
  if (tableWrap) tableWrap.style.display = 'block';
  if (searchInfo) searchInfo.style.display = 'block';
  if (emptyState) emptyState.style.display = 'none';
  
  // Update meta info
  if (searchMeta) {
    const count = data.rows.length;
    const query = getQueryParam('q');
    let metaText = `Найдено ${count} ${count === 1 ? 'компонент' : count < 5 ? 'компонента' : 'компонентов'} по запросу "${query}"`;
    
    // Add currency info if available
    if (data.meta && data.meta.currency) {
      const currencyDate = data.meta.currency.date || '';
      const usdRate = data.meta.currency.rates?.USD || '';
      if (currencyDate && usdRate) {
        metaText += ` • Курс ЦБ РФ от ${currencyDate}: 1$ = ${usdRate}₽`;
      }
    }
    
    searchMeta.textContent = metaText;
  }
  
  // Render rows
  tbody.innerHTML = data.rows.map((row, index) => {
    const {
      imageUrl,
      mpn,
      manufacturer,
      description,
      packageType,
      packaging,
      regions,
      stock,
      minPrice,
      min_price_rub,
      currency = '₽',
      _src
    } = row;
    
    // Provider badge mapping
    const providerBadges = {
      'mouser': { label: 'MO', color: '#0066B2', title: 'Mouser Electronics' },
      'digikey': { label: 'DK', color: '#CC0000', title: 'Digi-Key Electronics' },
      'tme': { label: 'TME', color: '#E30613', title: 'TME (Transfer Multisort Elektronik)' },
      'farnell': { label: 'FN', color: '#FF6600', title: 'Farnell / element14' }
    };
    
    const provider = _src || 'unknown';
    const badge = providerBadges[provider] || { label: '?', color: '#666', title: provider };
    const providerBadgeHtml = `<span class="provider-badge" style="background: ${badge.color};" title="${badge.title}">${badge.label}</span>`;
    
    // Image handling - fallback if broken
    const imageHtml = imageUrl && imageUrl !== 'N/A' && imageUrl !== '' 
      ? `<img src="${imageUrl}" class="product-thumb" alt="${mpn}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
         <div class="product-thumb-placeholder" style="display:none">${mpn.charAt(0)}</div>`
      : `<div class="product-thumb-placeholder">${mpn.charAt(0)}</div>`;
    
    // Stock handling - show from available source
    const stockDisplay = stock && stock > 0 ? stock.toLocaleString() : 'Уточняйте';
    
    // Packaging handling
    const packagingDisplay = packaging && packaging !== 'N/A' && packaging !== '' ? packaging : '—';
    
    // Package type
    const packageDisplay = packageType && packageType !== 'N/A' && packageType !== '' ? packageType : '—';
    
    // Regions
    const regionsDisplay = regions && regions.length > 0 ? regions.join(' • ') : '—';
    
    // Price - use RUB conversion if available, otherwise original price
    const priceDisplay = min_price_rub !== undefined && min_price_rub !== null
      ? `<strong>${min_price_rub}₽</strong>` 
      : (minPrice && minPrice > 0 
        ? `<strong>${minPrice.toFixed(2)} ${currency}</strong>` 
        : '—');
    
    return `
      <tr style="animation: slideInUp 0.6s ease-out forwards; animation-delay: ${0.3 + index * 0.05}s; opacity: 0;">
        <td>
          ${imageHtml}
        </td>
        <td class="titleCell">
          <div>
            <div class="product-mpn">
              ${providerBadgeHtml}
              ${mpn}
            </div>
            <div class="product-title">${description || 'Electronic Component'}</div>
          </div>
        </td>
        <td>${manufacturer || '—'}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${description || '—'}</td>
        <td>${packageDisplay}</td>
        <td>${packagingDisplay}</td>
        <td>${regionsDisplay}</td>
        <td>${stockDisplay}</td>
        <td>${priceDisplay}</td>
        <td>
          <a href="/product.html?mpn=${encodeURIComponent(mpn)}" class="btn-open">
            Открыть
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

// Fetch search results
async function fetchResults(query) {
  const loadingState = document.getElementById('loadingState');
  const tableWrap = document.querySelector('.tableWrap');
  const searchInfo = document.getElementById('searchInfo');
  
  if (!query) return;
  
  try {
    // Show loading
    if (loadingState) loadingState.style.display = 'block';
    if (tableWrap) tableWrap.style.display = 'none';
    if (searchInfo) searchInfo.style.display = 'none';
    
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle both response formats
    if (data.ok && data.rows) {
      renderResults(data);
    } else if (Array.isArray(data)) {
      renderResults({ rows: data });
    } else {
      renderResults({ rows: [] });
    }
    
  } catch (error) {
    console.error('Search error:', error);
    
    // Hide loading and show empty state
    if (loadingState) loadingState.style.display = 'none';
    if (tableWrap) tableWrap.style.display = 'none';
    if (searchInfo) searchInfo.style.display = 'none';
    
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.querySelector('h2').textContent = 'Ошибка поиска';
      emptyState.querySelector('p').textContent = 'Не удалось выполнить поиск. Попробуйте позже.';
    }
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  
  const query = getQueryParam('q');
  if (query) {
    fetchResults(query);
  } else {
    // No query - show empty state
    const loadingState = document.getElementById('loadingState');
    const tableWrap = document.querySelector('.tableWrap');
    const searchInfo = document.getElementById('searchInfo');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingState) loadingState.style.display = 'none';
    if (tableWrap) tableWrap.style.display = 'none';
    if (searchInfo) searchInfo.style.display = 'none';
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.querySelector('h2').textContent = 'Введите запрос';
      emptyState.querySelector('p').textContent = 'Используйте поиск выше или выберите популярный компонент';
    }
  }
});
