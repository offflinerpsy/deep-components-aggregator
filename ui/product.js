// ui/product.js - Логика карточки продукта с data-testid и без try/catch
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Получение параметров URL
const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    mpn: params.get('mpn')?.trim() || ''
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
  const mainImage = $('#main-image');
  const thumbsContainer = $('#image-thumbs');
  
  if (!Array.isArray(images) || images.length === 0) {
    if (mainImage) {
      mainImage.src = '/ui/placeholder.svg';
      mainImage.alt = 'Изображение не найдено';
    }
    if (thumbsContainer) thumbsContainer.innerHTML = '';
    return;
  }
  
  // Основное изображение
  if (mainImage) {
    mainImage.src = images[0];
    mainImage.alt = 'Изображение товара';
    mainImage.onerror = () => {
      mainImage.onerror = null;
      mainImage.src = '/ui/placeholder.svg';
    };
  }
  
  // Миниатюры (если больше одного изображения)
  if (thumbsContainer && images.length > 1) {
    const thumbsHTML = images.slice(1).map(src => 
      `<img src="${src}" loading="lazy" onclick="document.getElementById('main-image').src='${src}'">`
    ).join('');
    thumbsContainer.innerHTML = thumbsHTML;
  }
};

// Загрузка документации
const loadDocumentation = (datasheets) => {
  const docsList = $('#docs-list');
  const galleryDocs = $('#gallery-docs');
  
  if (!Array.isArray(datasheets) || datasheets.length === 0) {
    if (docsList) docsList.innerHTML = '<p style="color:#6b7280;">Документация не найдена</p>';
    if (galleryDocs) galleryDocs.innerHTML = '';
    hideSection('[data-testid="docs"]');
    return;
  }
  
  // Основной список документов
  if (docsList) {
    const docsHTML = datasheets.map((url, index) => 
      `<a href="${url}" target="_blank" rel="noopener">📄 Datasheet ${index + 1}</a>`
    ).join('');
    docsList.innerHTML = docsHTML;
  }
  
  // Краткий список в галерее (первые 3)
  if (galleryDocs) {
    const shortDocsHTML = datasheets.slice(0, 3).map((url, index) => 
      `<a href="${url}" target="_blank" rel="noopener">PDF ${index + 1}</a>`
    ).join('');
    galleryDocs.innerHTML = shortDocsHTML;
  }
  
  showSection('[data-testid="docs"]');
};

// Загрузка технических параметров
const loadTechnicalSpecs = (specs) => {
  const specsTBody = $('#specs-tbody');
  
  if (!specs || typeof specs !== 'object' || Object.keys(specs).length === 0) {
    if (specsTBody) {
      specsTBody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:24px;color:#6b7280;">Технические параметры не найдены</td></tr>';
    }
    hideSection('[data-testid="specs"]');
    return;
  }
  
  if (specsTBody) {
    const specsHTML = Object.entries(specs).map(([key, value]) => 
      `<tr><td>${key}</td><td>${nz(value)}</td></tr>`
    ).join('');
    specsTBody.innerHTML = specsHTML;
  }
  
  showSection('[data-testid="specs"]');
};

// Загрузка данных продукта
const loadProductData = async (mpn) => {
  if (!mpn) {
    setText('#product-title', 'MPN не указан');
    return;
  }
  
  setText('#product-title', `${mpn} — загрузка...`);
  
  const response = await fetch(`/api/product?mpn=${encodeURIComponent(mpn)}`);
  
  if (!response.ok) {
    setText('#product-title', `${mpn} — ошибка загрузки (${response.status})`);
    return;
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    setText('#product-title', `${mpn} — неверный формат ответа`);
    return;
  }
  
  const data = await response.json();
  
  if (!data.ok || !data.product) {
    setText('#product-title', `${mpn} — данные не найдены`);
    return;
  }
  
  const product = data.product;
  
  // Заголовок
  const title = product.title ? `${product.mpn} — ${product.title}` : product.mpn;
  setText('#product-title', title);
  
  // Метаинформация
  setText('#meta-mpn-value', product.mpn);
  setText('#meta-manufacturer-value', product.manufacturer);
  setText('#meta-package-value', product.package);
  setText('#meta-packaging-value', product.packaging);
  
  // Блок заказа
  const stock = (product.availability && product.availability.inStock) 
    ? product.availability.inStock 
    : 0;
  setText('#order-stock-value', stock > 0 ? stock : 'Нет в наличии');
  
  const minPrice = (Array.isArray(product.pricing) && product.pricing.length > 0) 
    ? product.pricing[0].price_rub 
    : 0;
  setText('#order-price-value', fmtRub(minPrice));
  
  const regionsHTML = createRegionBadges(product.regions);
  setHTML('#order-regions', regionsHTML);
  
  // Описание
  if (product.description && product.description.trim()) {
    setHTML('#desc-content', `<p>${product.description}</p>`);
    showSection('[data-testid="desc"]');
  } else {
    setHTML('#desc-content', '<p style="color:#6b7280;">Описание не найдено</p>');
    hideSection('[data-testid="desc"]');
  }
  
  // Изображения
  loadImages(product.images);
  
  // Документация
  loadDocumentation(product.datasheets);
  
  // Технические параметры
  loadTechnicalSpecs(product.technical_specs);
};

// Инициализация страницы
const initProductPage = () => {
  const params = getUrlParams();
  
  if (!params.mpn) {
    setText('#product-title', 'MPN не указан в URL');
    return;
  }
  
  loadProductData(params.mpn);
  
  // Обработка кнопки заказа
  const orderButton = $('[data-testid="order-button"]');
  if (orderButton) {
    orderButton.addEventListener('click', () => {
      const quantity = $('#quantity-input')?.value || 1;
      alert(`Заказ: ${params.mpn}, количество: ${quantity}\n\nФункция заказа будет реализована позже.`);
    });
  }
};

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProductPage);
} else {
  initProductPage();
}
