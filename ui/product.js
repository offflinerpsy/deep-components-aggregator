// ui/product.js - Логика карточки продукта с data-testid и без try/catch
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Получение параметров URL
const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    src: params.get('src')?.trim() || 'mouser',
    id: params.get('id')?.trim() || '',
    // Legacy support
    mpn: params.get('mpn')?.trim() || params.get('id')?.trim() || ''
  };
};

// Нормализация значений
const nz = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).trim();
};

// Форматирование цены
const fmtRub = (price) => {
  if (!price || price <= 0) return '— ₽';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2
  }).format(price);
};

// Скрытие/показ секций
const hideSection = (selector) => {
  const element = $(selector);
  if (element) element.classList.add('hidden');
};

const showSection = (selector) => {
  const element = $(selector);
  if (element) element.classList.remove('hidden');
};

// Установка текста элемента
const setText = (selector, text) => {
  const element = $(selector);
  if (element) {
    element.textContent = nz(text);
    return true;
  }
  return false;
};

// Установка HTML элемента
const setHTML = (selector, html) => {
  const element = $(selector);
  if (element) {
    element.innerHTML = html || '';
    return true;
  }
  return false;
};

// Создание бейджей для регионов
const createRegionBadges = (regions) => {
  if (!Array.isArray(regions) || regions.length === 0) return '';
  return regions.map(region => `<span class="badge">${region}</span>`).join('');
};

// Загрузка изображений
const loadImages = (images) => {
  const mainImage = $('#product-image');
  
  if (!Array.isArray(images) || images.length === 0) {
    if (mainImage) {
      mainImage.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'640\' height=\'360\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23eef2ff\'/%3E%3C/svg%3E';
      mainImage.alt = 'Изображение не найдено';
    }
    return;
  }
  
  if (mainImage) {
    mainImage.src = images[0];
    mainImage.alt = 'Фото компонента';
    mainImage.onerror = () => {
      mainImage.onerror = null;
      mainImage.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'640\' height=\'360\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23eef2ff\'/%3E%3C/svg%3E';
    };
  }
};

// Загрузка документации
const loadDocumentation = (datasheets) => {
  const docsLinks = $('#datasheets-links');
  
  if (!Array.isArray(datasheets) || datasheets.length === 0) {
    if (docsLinks) docsLinks.innerHTML = '<span style="color:var(--muted);font-size:14px">Документация не найдена</span>';
    return;
  }
  
  if (docsLinks) {
    const docsHTML = datasheets.map((url, index) => 
      `<a href="${url}" target="_blank" rel="noopener" class="btnLink">PDF #${index + 1}</a>`
    ).join('');
    docsLinks.innerHTML = docsHTML;
  }
};

// Загрузка технических параметров
const loadTechnicalSpecs = (specs) => {
  const specsGrid = $('#specs-grid');
  
  if (!specs || typeof specs !== 'object' || Object.keys(specs).length === 0) {
    if (specsGrid) {
      specsGrid.innerHTML = '<div style="grid-column:span 2;color:var(--muted);text-align:center">Спецификации не найдены</div>';
    }
    return;
  }
  
  if (specsGrid) {
    const specsHTML = Object.entries(specs).map(([key, value]) => {
      const translatedKey = (typeof translateSpec === 'function') ? translateSpec(key) : key;
      return `<div><b>${translatedKey}</b> ${nz(value)}</div>`;
    }).join('');
    specsGrid.innerHTML = specsHTML;
  }
};

// Загрузка данных продукта
const loadProductData = async (src, id) => {
  if (!id) {
    setText('#manufacturer', 'ID не указан');
    return;
  }
  
  setText('#manufacturer', `${id} — загрузка...`);
  
  const response = await fetch(`/api/product?src=${encodeURIComponent(src)}&id=${encodeURIComponent(id)}`);
  
  if (!response.ok) {
    setText('#manufacturer', `${id} — ошибка загрузки (${response.status})`);
    return;
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    setText('#manufacturer', `${id} — неверный формат ответа`);
    return;
  }
  
  const data = await response.json();
  
  if (!data.ok || !data.product) {
    setText('#manufacturer', `${id} — данные не найдены`);
    return;
  }
  
  const product = data.product;
  
  // Manufacturer & Price (главная панель)
  setText('#manufacturer', product.manufacturer);
  setText('#mpn', product.mpn);
  
  // Stock
  const stock = (product.availability && product.availability.inStock) 
    ? product.availability.inStock 
    : 0;
  setText('#stock', stock > 0 ? `В наличии: ${stock}` : 'Нет в наличии');
  
  // Price
  const minPrice = (Array.isArray(product.pricing) && product.pricing.length > 0) 
    ? product.pricing[0].price_rub 
    : 0;
  setText('#price', minPrice > 0 ? `от ${fmtRub(minPrice)}` : '—');
  
  // Изображения
  loadImages(product.images);
  
  // Документация
  loadDocumentation(product.datasheets);
  
  // Технические параметры
  loadTechnicalSpecs(product.technical_specs);
  
  // Pricing table
  const pricingList = $('#pricing-list');
  if (pricingList && Array.isArray(product.pricing) && product.pricing.length > 0) {
    const pricingHTML = product.pricing.map(p => 
      `<div style="display:flex;justify-content:space-between;font-size:14px">
        <span>${p.qty}+ шт.</span>
        <span><b>${fmtRub(p.price_rub)}</b></span>
      </div>`
    ).join('');
    pricingList.innerHTML = pricingHTML;
  } else if (pricingList) {
    pricingList.innerHTML = '<div style="color:var(--muted);font-size:14px">Цены не найдены</div>';
  }
};

// Инициализация страницы
const initProductPage = () => {
  const params = getUrlParams();
  
  if (!params.id && !params.mpn) {
    setText('#manufacturer', 'ID не указан в URL');
    return;
  }
  
  loadProductData(params.src, params.id || params.mpn);
};

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProductPage);
} else {
  initProductPage();
}
