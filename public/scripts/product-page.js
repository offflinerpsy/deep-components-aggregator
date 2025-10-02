// ДИПОНИКА Product Page Script

console.log('[PRODUCT PAGE] Script loaded');

// Get query parameter
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  const value = params.get(name);
  console.log(`[PRODUCT PAGE] Param "${name}":`, value);
  return value;
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
  
  // Handle form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (query) {
      window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
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

// Render product data
function renderProduct(data) {
  console.log('[PRODUCT PAGE] renderProduct called with data:', data);
  
  const { product } = data;
  
  if (!product) {
    console.error('[PRODUCT PAGE] No product in data');
    showError();
    return;
  }
  
  console.log('[PRODUCT PAGE] Product object:', product);
  console.log('[PRODUCT PAGE] Images:', product.images);
  console.log('[PRODUCT PAGE] Datasheets:', product.datasheets);
  console.log('[PRODUCT PAGE] Technical specs:', product.technical_specs);
  
  // Hide loading, show content
  const loadingState = document.getElementById('loadingState');
  const productContent = document.getElementById('productContent');
  if (loadingState) loadingState.style.display = 'none';
  if (productContent) productContent.style.display = 'grid';
  
  // Update title and breadcrumb
  const mpn = product.mpn || 'Unknown';
  document.title = `${mpn} — ДИПОНИКА`;
  document.getElementById('productTitle').textContent = mpn;
  document.getElementById('productSubtitle').textContent = product.description || 'Electronic Component';
  document.getElementById('breadcrumbMpn').textContent = mpn;
  
  // Update breadcrumb search link
  const searchQ = getQueryParam('q') || mpn;
  document.getElementById('breadcrumbSearch').href = `/search.html?q=${encodeURIComponent(searchQ)}`;
  
  // Manufacturer
  document.getElementById('manufacturer').textContent = product.manufacturer || '—';
  
  // Price
  const priceEl = document.getElementById('price');
  if (product.pricing && product.pricing.length > 0) {
    const minPrice = product.pricing[0];
    if (minPrice.price_rub) {
      priceEl.textContent = `от ${minPrice.price_rub.toFixed(2)} ₽`;
    } else {
      priceEl.textContent = `от ${minPrice.price} ${minPrice.currency || 'USD'}`;
    }
  } else {
    priceEl.textContent = '—';
  }
  
  // Stock
  const stockEl = document.getElementById('stock');
  const inStock = product.availability?.inStock || product.stock || 0;
  if (inStock > 0) {
    stockEl.textContent = `В наличии: ${inStock.toLocaleString()}`;
    stockEl.classList.remove('out-of-stock');
  } else {
    stockEl.textContent = 'Уточняйте наличие';
    stockEl.classList.add('out-of-stock');
  }
  
  // Package info
  const packageInfo = document.getElementById('packageInfo');
  if (product.package || product.packaging) {
    packageInfo.innerHTML = `
      ${product.package ? `
        <div class="package-item">
          <div class="label">Package</div>
          <div class="value">${product.package}</div>
        </div>
      ` : ''}
      ${product.packaging ? `
        <div class="package-item">
          <div class="label">Packaging</div>
          <div class="value">${product.packaging}</div>
        </div>
      ` : ''}
    `;
  }
  
  // Images
  console.log('[PRODUCT PAGE] Calling renderImages with:', product.images);
  renderImages(product.images || []);
  
  // Pricing table
  if (product.pricing && product.pricing.length > 0) {
    console.log('[PRODUCT PAGE] Calling renderPricing with:', product.pricing);
    renderPricing(product.pricing);
  }
  
  // Datasheets
  if (product.datasheets && product.datasheets.length > 0) {
    console.log('[PRODUCT PAGE] Calling renderDatasheets with:', product.datasheets);
    renderDatasheets(product.datasheets);
  }
  
  // Technical specs
  if (product.technical_specs && Object.keys(product.technical_specs).length > 0) {
    console.log('[PRODUCT PAGE] Calling renderSpecs with:', product.technical_specs);
    renderSpecs(product.technical_specs);
  }
}

// Proxy image URL to bypass hotlinking protection
function proxyImageUrl(url) {
  if (!url) return '';
  // Only proxy external images (Mouser, Farnell, etc.)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// Render images
function renderImages(images) {
  console.log('[PRODUCT PAGE] renderImages called with:', images);
  
  const mainContainer = document.getElementById('mainImageContainer');
  const thumbnailList = document.getElementById('thumbnailList');
  
  console.log('[PRODUCT PAGE] mainImageContainer:', mainContainer);
  console.log('[PRODUCT PAGE] thumbnailList:', thumbnailList);
  
  if (!images || images.length === 0) {
    console.log('[PRODUCT PAGE] No images to render');
    return;
  }
  
  const firstImage = proxyImageUrl(images[0]);
  console.log('[PRODUCT PAGE] Setting main image:', firstImage);
  
  mainContainer.innerHTML = `<img src="${firstImage}" alt="Product image" onerror="this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg></div>'">`;
  
  console.log('[PRODUCT PAGE] Main image set, HTML:', mainContainer.innerHTML.substring(0, 100));
  
  if (images.length > 1) {
    thumbnailList.innerHTML = images.map((img, index) => {
      const proxiedImg = proxyImageUrl(img);
      return `
        <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage('${proxiedImg}', this)">
          <img src="${proxiedImg}" alt="Thumbnail ${index + 1}">
        </div>
      `;
    }).join('');
    console.log('[PRODUCT PAGE] Thumbnails rendered:', images.length);
  }
}

// Change main image
window.changeMainImage = function(src, thumbnail) {
  const mainContainer = document.getElementById('mainImageContainer');
  mainContainer.innerHTML = `<img src="${src}" alt="Product image">`;
  
  // Update active thumbnail
  document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
  if (thumbnail) thumbnail.classList.add('active');
};

// Render pricing table
function renderPricing(pricing) {
  console.log('[PRODUCT PAGE] renderPricing called');
  
  const panel = document.getElementById('pricingPanel');
  const tbody = document.querySelector('#pricingTable tbody');
  
  console.log('[PRODUCT PAGE] pricingPanel:', panel);
  console.log('[PRODUCT PAGE] pricingTable tbody:', tbody);
  
  if (!panel || !tbody) {
    console.error('[PRODUCT PAGE] Missing pricing elements');
    return;
  }
  
  tbody.innerHTML = pricing.map(p => `
    <tr>
      <td>${p.qty || 1}+</td>
      <td>${p.price} ${p.currency}</td>
      <td><strong>${p.price_rub ? p.price_rub.toFixed(2) + ' ₽' : '—'}</strong></td>
    </tr>
  `).join('');
  
  console.log('[PRODUCT PAGE] Pricing table HTML set, showing panel');
  panel.style.display = 'block';
  console.log('[PRODUCT PAGE] Panel display:', panel.style.display);
}

// Render datasheets
function renderDatasheets(datasheets) {
  console.log('[PRODUCT PAGE] renderDatasheets called');
  
  const panel = document.getElementById('datasheetsPanel');
  const list = document.getElementById('datasheetsList');
  
  console.log('[PRODUCT PAGE] datasheetsPanel:', panel);
  console.log('[PRODUCT PAGE] datasheetsList:', list);
  
  if (!panel || !list) {
    console.error('[PRODUCT PAGE] Missing datasheets elements');
    return;
  }
  
  list.innerHTML = datasheets.map((url, index) => `
    <a href="/api/pdf?url=${encodeURIComponent(url)}" target="_blank" class="datasheet-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      Datasheet ${index + 1}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
      </svg>
    </a>
  `).join('');
  
  console.log('[PRODUCT PAGE] Datasheets HTML set, showing panel');
  panel.style.display = 'block';
  console.log('[PRODUCT PAGE] Panel display:', panel.style.display);
}

// Render technical specs
function renderSpecs(specs) {
  console.log('[PRODUCT PAGE] renderSpecs called');
  
  const panel = document.getElementById('specsPanel');
  const grid = document.getElementById('specsList');
  
  console.log('[PRODUCT PAGE] specsPanel:', panel);
  console.log('[PRODUCT PAGE] specsList:', grid);
  
  if (!panel || !grid) {
    console.error('[PRODUCT PAGE] Missing specs elements');
    return;
  }
  
  const entries = Object.entries(specs); // NO LIMIT - show ALL specs!
  
  console.log(`[PRODUCT PAGE] Rendering ${entries.length} specs`);
  
  grid.innerHTML = entries.map(([key, value]) => `
    <div class="spec-item">
      <div class="label">${key}</div>
      <div class="value">${value}</div>
    </div>
  `).join('');
  
  console.log('[PRODUCT PAGE] Specs HTML set, showing panel');
  panel.style.display = 'block';
  console.log('[PRODUCT PAGE] Panel display:', panel.style.display);
}

// Show error state
function showError() {
  const loadingState = document.getElementById('loadingState');
  const productContent = document.getElementById('productContent');
  const errorState = document.getElementById('errorState');
  
  if (loadingState) loadingState.style.display = 'none';
  if (productContent) productContent.style.display = 'none';
  if (errorState) errorState.style.display = 'block';
}

// Fetch product data
async function fetchProduct(mpn, src = 'mouser') {
  console.log(`[PRODUCT PAGE] Fetching: mpn="${mpn}"`);
  
  try {
    const url = `/api/product?mpn=${encodeURIComponent(mpn)}`;
    console.log(`[PRODUCT PAGE] Request URL:`, url);
    
    const response = await fetch(url);
    
    console.log(`[PRODUCT PAGE] Response status:`, response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`[PRODUCT PAGE] Response data:`, data);
    
    if (data.ok && data.product) {
      renderProduct(data);
    } else {
      console.error('[PRODUCT PAGE] Invalid response data');
      showError();
    }
    
  } catch (error) {
    console.error('[PRODUCT PAGE] Fetch error:', error);
    showError();
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  console.log('[PRODUCT PAGE] DOM loaded, initializing...');
  
  initTheme();
  initSearch();
  
  const mpn = getQueryParam('mpn');
  const src = getQueryParam('src') || 'mouser';
  
  console.log(`[PRODUCT PAGE] Starting with mpn="${mpn}", src="${src}"`);
  
  if (mpn) {
    fetchProduct(mpn, src);
  } else {
    console.error('[PRODUCT PAGE] No MPN parameter found');
    showError();
    document.getElementById('errorState').querySelector('h2').textContent = 'Не указан компонент';
    document.getElementById('errorState').querySelector('p').textContent = 'Не указан MPN компонента в URL';
  }
});
