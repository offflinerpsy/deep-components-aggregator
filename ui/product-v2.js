// ui/product-v2.js - Enhanced product card with gallery zoom, price filters, modal
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// State
let currentProduct = null;
let allPrices = [];
let selectedQuantity = 1;

// Utility functions
const nz = (value) => value ?? '—';
const fmtRub = (price) => {
  if (!price || price <= 0) return '— ₽';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2
  }).format(price);
};

const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    src: params.get('src') || 'mouser',
    id: params.get('id') || params.get('mpn') || ''
  };
};

// Gallery functions
const initGallery = (images) => {
  const mainImage = $('#main-image');
  const thumbsContainer = $('#gallery-thumbs');
  const galleryMain = $('#gallery-main');
  const overlay = $('#gallery-overlay');
  const overlayImage = $('#overlay-image');
  
  if (!Array.isArray(images) || images.length === 0) {
    mainImage.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'400\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23f1f5f9\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%2394a3b8\' font-family=\'sans-serif\' font-size=\'16\'%3ENo Image%3C/text%3E%3C/svg%3E';
    return;
  }
  
  // Set main image
  mainImage.src = images[0];
  mainImage.alt = 'Product image';
  
  // Create thumbnails
  if (images.length > 1 && thumbsContainer) {
    thumbsContainer.innerHTML = images.map((img, i) => `
      <div class="product-gallery__thumb ${i === 0 ? 'product-gallery__thumb--active' : ''}" data-index="${i}">
        <img src="${img}" alt="Thumbnail ${i + 1}">
      </div>
    `).join('');
    
    // Thumbnail click handlers
    $$('.product-gallery__thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const index = parseInt(thumb.dataset.index);
        mainImage.src = images[index];
        $$('.product-gallery__thumb').forEach(t => t.classList.remove('product-gallery__thumb--active'));
        thumb.classList.add('product-gallery__thumb--active');
      });
    });
  }
  
  // Zoom on main image click
  if (galleryMain && overlay && overlayImage) {
    galleryMain.addEventListener('click', () => {
      overlayImage.src = mainImage.src;
      overlay.style.display = 'flex';
    });
    
    overlay.addEventListener('click', () => {
      overlay.style.display = 'none';
    });
  }
};

// Price breaks rendering
const renderPriceBreaks = (prices, limit = 6) => {
  const grid = $('#price-breaks-grid');
  if (!grid || !Array.isArray(prices) || prices.length === 0) return;
  
  const sorted = [...prices].sort((a, b) => a.qty - b.qty);
  const display = limit ? sorted.slice(0, limit) : sorted;
  
  const html = display.map(p => `
    <span class="price-breaks__qty">${p.qty}+</span>
    <span class="price-breaks__supplier">${p.supplier || p.source || 'Unknown'}</span>
    <span class="price-breaks__price">${fmtRub(p.price_rub)}</span>
  `).join('');
  
  grid.innerHTML = html;
};

// Quantity filter
const initQuantityFilter = () => {
  const input = $('#qty-input');
  const chips = $$('.qty-filter__chip');
  
  if (input) {
    input.addEventListener('input', (e) => {
      selectedQuantity = parseInt(e.target.value) || 1;
      highlightRelevantPriceBreak();
      chips.forEach(c => c.classList.remove('qty-filter__chip--active'));
    });
  }
  
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const qty = parseInt(chip.dataset.qty);
      selectedQuantity = qty;
      if (input) input.value = qty;
      chips.forEach(c => c.classList.remove('qty-filter__chip--active'));
      chip.classList.add('qty-filter__chip--active');
      highlightRelevantPriceBreak();
    });
  });
};

const highlightRelevantPriceBreak = () => {
  if (!allPrices.length) return;
  
  // Find the best price for selected quantity
  const sorted = [...allPrices].sort((a, b) => a.qty - b.qty);
  const applicable = sorted.filter(p => p.qty <= selectedQuantity);
  const best = applicable.length > 0 ? applicable[applicable.length - 1] : sorted[0];
  
  // Update price display
  const priceDisplay = $('#product-price');
  if (priceDisplay && best) {
    priceDisplay.textContent = `${fmtRub(best.price_rub)} / шт.`;
  }
};

// Modal for all prices
const applyPriceFilters = (prices) => {
  const minQty = parseInt($('#filter-minqty')?.value || '0') || 0;
  const maxPrice = parseFloat($('#filter-maxprice')?.value || '') || Infinity;
  const supplier = $('#filter-supplier')?.value || '';
  return prices.filter(p => {
    const okQty = p.qty >= minQty;
    const okPrice = (p.price_rub || 0) <= maxPrice;
    const sup = (p.supplier || p.source || '').toLowerCase();
    const okSupplier = supplier ? sup === supplier.toLowerCase() : true;
    return okQty && okPrice && okSupplier;
  });
};

const renderModalPrices = (tbody, prices) => {
  const list = prices.length ? prices : [];
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--space-6);">Нет данных</td></tr>';
    return;
  }
  const sorted = [...list].sort((a, b) => a.price_rub - b.price_rub);
  tbody.innerHTML = sorted.map(p => `
    <tr>
      <td>${p.supplier || p.source || '—'}</td>
      <td>${p.qty}+</td>
      <td>${fmtRub(p.price_rub)}</td>
      <td>${p.leadTime || '—'}</td>
      <td>${p.moq || p.qty || '—'}</td>
    </tr>
  `).join('');
};

const initPricesModal = () => {
  const showAllBtn = $('#show-all-prices');
  const modal = $('#prices-modal');
  const closeBtn = $('#prices-modal-close');
  const tbody = $('#prices-modal-tbody');
  
  if (!showAllBtn || !modal) return;
  
  showAllBtn.addEventListener('click', () => {
    renderModalPrices(tbody, applyPriceFilters(allPrices));
    modal.style.display = 'flex';
  });
  
  const closeModal = () => {
    modal.style.display = 'none';
  };
  
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Filters
  $('#filter-apply')?.addEventListener('click', () => {
    renderModalPrices(tbody, applyPriceFilters(allPrices));
  });
};

// Load specifications
const loadSpecs = (specs) => {
  const technical = $('#specs-technical');
  if (!technical || !specs || typeof specs !== 'object') return;
  
  const entries = Object.entries(specs).filter(([k, v]) => v !== null && v !== undefined && v !== '');
  
  if (entries.length === 0) {
    technical.innerHTML = '<dd style="grid-column:span 2;color:var(--color-text-muted);text-align:center;">Нет данных</dd>';
    return;
  }
  
  technical.innerHTML = entries.map(([key, value]) => `
    <dt>${key}</dt>
    <dd>${nz(value)}</dd>
  `).join('');
};

// Load documentation links
const loadDocs = (datasheets) => {
  const docsLinks = $('#docs-links');
  if (!docsLinks) return;
  
  if (!Array.isArray(datasheets) || datasheets.length === 0) {
    docsLinks.innerHTML = '<span style="color:var(--color-text-muted);font-size:var(--font-size-xs);">Документы не найдены</span>';
    return;
  }
  
  docsLinks.innerHTML = datasheets.map((url, i) => `
    <a href="${url}" target="_blank" rel="noopener" class="docs-section__link">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
        <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
      </svg>
      Datasheet ${i + 1}
    </a>
  `).join('');
};

// Main product loader
const loadProduct = async (src, id) => {
  if (!id) {
    $('#product-title').textContent = 'ID не указан';
    return;
  }
  
  const response = await fetch(`/api/product?src=${encodeURIComponent(src)}&id=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  if (!data.ok || !data.product) throw new Error('Product not found');
  
  currentProduct = data.product;
  const p = currentProduct;
  
  // Title & MPN
  $('#product-title').textContent = p.title || p.mpn || 'Без названия';
  $('#product-mpn').textContent = p.mpn || '—';
  
  // Description
  $('#product-description').textContent = p.description || 'Описание отсутствует';
  
  // Main specs
  $('#spec-manufacturer').textContent = p.manufacturer || '—';
  $('#spec-package').textContent = p.package || '—';
  $('#spec-packaging').textContent = p.packaging || '—';
  $('#manufacturer-name').textContent = p.manufacturer || '—';
  
  // Stock
  const stock = p.availability?.inStock || 0;
  $('#product-stock').textContent = stock > 0 ? `В наличии: ${stock}` : 'Уточняйте наличие';
  
  // Prices
  allPrices = Array.isArray(p.pricing) ? p.pricing : [];
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices.map(x => x.price_rub)) : 0;
  $('#product-price').textContent = minPrice > 0 ? fmtRub(minPrice) : '— ₽';
  
  renderPriceBreaks(allPrices);
  
  // Gallery
  initGallery(p.images);
  
  // Specs
  loadSpecs(p.technical_specs);
  
  // Docs
  loadDocs(p.datasheets);
};

// Order button handler
const initOrderButton = () => {
  const btn = $('#order-button');
  if (!btn) return;
  
  btn.addEventListener('click', () => {
    if (!currentProduct) {
      alert('Данные товара не загружены');
      return;
    }
    
    // Check auth
    fetch('/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.ok || !data.user) {
          window.location.href = '/ui/auth.html?redirect=' + encodeURIComponent(window.location.href);
          return;
        }
        
        // Show order form (implement later)
        alert(`Заказ ${currentProduct.mpn}, количество: ${selectedQuantity}\nФункционал в разработке`);
      })
      .catch(err => {
        console.error('Auth check failed:', err);
        window.location.href = '/ui/auth.html';
      });
  });
};

// Initialize page
const init = async () => {
  const params = getUrlParams();
  if (!params.id) {
    $('#product-title').textContent = 'MPN не указан в URL';
    return;
  }
  
  try {
    await loadProduct(params.src, params.id);
    initQuantityFilter();
    initPricesModal();
    initOrderButton();
  } catch (err) {
    console.error('Failed to load product:', err);
    $('#product-title').textContent = 'Ошибка загрузки данных';
  }
};

// Run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
