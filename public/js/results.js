/**
 * Результаты поиска и работа с карточками товаров
 */

// Глобальные переменные
let searchResults = []; // Все результаты поиска
let currentPage = 1; // Текущая страница
const resultsPerPage = 10; // Количество результатов на странице
let currentProduct = null; // Текущий выбранный продукт

// DOM-элементы
const searchInput = document.getElementById('q');
const searchButton = document.getElementById('search-btn');
const resultsBody = document.getElementById('results-body');
const resultsCount = document.getElementById('results-count').querySelector('span');
const paginationEl = document.getElementById('pagination');
const noResultsEl = document.getElementById('no-results');
const loadingEl = document.getElementById('loading');
const sortByEl = document.getElementById('sort-by');
const filterRegionEl = document.getElementById('filter-region');
const filterPkgTypeEl = document.getElementById('filter-pkg-type');

// Модальное окно с карточкой товара
const productModal = document.getElementById('product-modal');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const modalMainImage = document.getElementById('modal-main-image');
const modalThumbnails = document.getElementById('modal-thumbnails');
const modalMpn = document.getElementById('modal-mpn');
const modalBrand = document.getElementById('modal-brand');
const modalPkg = document.getElementById('modal-pkg');
const modalDescription = document.getElementById('modal-description');
const modalSpecs = document.getElementById('modal-specs');
const modalDocs = document.getElementById('modal-docs');
const modalPrice = document.getElementById('modal-price');
const modalStock = document.getElementById('modal-stock');
const modalQuantity = document.getElementById('modal-quantity');
const modalOrderBtn = document.getElementById('modal-order-btn');

// Модальное окно оформления заказа
const orderModal = document.getElementById('order-modal');
const orderModalClose = document.getElementById('order-modal-close');
const orderForm = document.getElementById('order-form');

/**
 * Инициализация при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', () => {
  // Получаем параметры из URL
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q');
  
  // Если есть запрос в URL, выполняем поиск
  if (query) {
    searchInput.value = query;
    performSearch(query);
  }
  
  // Обработчики событий
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      performSearch(query);
      // Обновляем URL
      const url = new URL(window.location);
      url.searchParams.set('q', query);
      window.history.pushState({}, '', url);
    }
  });
  
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        performSearch(query);
        // Обновляем URL
        const url = new URL(window.location);
        url.searchParams.set('q', query);
        window.history.pushState({}, '', url);
      }
    }
  });
  
  // Обработчики фильтрации и сортировки
  sortByEl.addEventListener('change', updateResults);
  filterRegionEl.addEventListener('input', updateResults);
  filterPkgTypeEl.addEventListener('change', updateResults);
  
  // Обработчики модальных окон
  modalClose.addEventListener('click', () => {
    productModal.classList.add('hidden');
  });
  
  orderModalClose.addEventListener('click', () => {
    orderModal.classList.add('hidden');
  });
  
  modalOrderBtn.addEventListener('click', () => {
    orderModal.classList.remove('hidden');
  });
  
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitOrder();
  });
  
  // Закрытие модальных окон при клике вне их содержимого
  window.addEventListener('click', (e) => {
    if (e.target === productModal) {
      productModal.classList.add('hidden');
    }
    if (e.target === orderModal) {
      orderModal.classList.add('hidden');
    }
  });
});

/**
 * Выполняет поиск по запросу
 * @param {string} query Поисковый запрос
 */
async function performSearch(query) {
  // Показываем индикатор загрузки
  loadingEl.classList.remove('hidden');
  noResultsEl.classList.add('hidden');
  resultsBody.innerHTML = '';
  
  try {
    // Выполняем запрос к API
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    // Сохраняем результаты
    searchResults = data.items || [];
    
    // Обновляем интерфейс
    updateResults();
  } catch (error) {
    console.error('Error performing search:', error);
    noResultsEl.classList.remove('hidden');
  } finally {
    // Скрываем индикатор загрузки
    loadingEl.classList.add('hidden');
  }
}

/**
 * Обновляет отображение результатов с учетом фильтров и сортировки
 */
function updateResults() {
  // Применяем фильтры
  let filteredResults = [...searchResults];
  
  // Фильтр по региону
  const regionFilter = filterRegionEl.value.trim().toLowerCase();
  if (regionFilter) {
    filteredResults = filteredResults.filter(item => {
      return (item.regions || []).some(region => 
        region.toLowerCase().includes(regionFilter)
      );
    });
  }
  
  // Фильтр по типу корпуса
  const pkgTypeFilter = filterPkgTypeEl.value;
  if (pkgTypeFilter) {
    filteredResults = filteredResults.filter(item => 
      item.pkg_type === pkgTypeFilter
    );
  }
  
  // Применяем сортировку
  const sortBy = sortByEl.value;
  switch (sortBy) {
    case 'price-asc':
      filteredResults.sort((a, b) => {
        const priceA = a.price_rub || Number.MAX_SAFE_INTEGER;
        const priceB = b.price_rub || Number.MAX_SAFE_INTEGER;
        return priceA - priceB;
      });
      break;
    case 'price-desc':
      filteredResults.sort((a, b) => {
        const priceA = a.price_rub || 0;
        const priceB = b.price_rub || 0;
        return priceB - priceA;
      });
      break;
    case 'brand':
      filteredResults.sort((a, b) => {
        const brandA = (a.brand || '').toLowerCase();
        const brandB = (b.brand || '').toLowerCase();
        return brandA.localeCompare(brandB);
      });
      break;
    // По умолчанию - сортировка по релевантности (как вернул API)
  }
  
  // Обновляем счетчик результатов
  resultsCount.textContent = filteredResults.length;
  
  // Если результатов нет, показываем сообщение
  if (filteredResults.length === 0) {
    noResultsEl.classList.remove('hidden');
    paginationEl.innerHTML = '';
    resultsBody.innerHTML = '';
    return;
  }
  
  // Скрываем сообщение об отсутствии результатов
  noResultsEl.classList.add('hidden');
  
  // Вычисляем общее количество страниц
  const totalPages = Math.ceil(filteredResults.length / resultsPerPage);
  
  // Если текущая страница больше общего количества страниц, устанавливаем последнюю страницу
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  
  // Получаем результаты для текущей страницы
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const pageResults = filteredResults.slice(startIndex, endIndex);
  
  // Отображаем результаты
  renderResults(pageResults);
  
  // Обновляем пагинацию
  renderPagination(totalPages);
}

/**
 * Отображает результаты поиска в таблице
 * @param {Array} results Результаты для отображения
 */
function renderResults(results) {
  // Очищаем таблицу
  resultsBody.innerHTML = '';
  
  // Добавляем строки с результатами
  results.forEach(item => {
    const row = document.createElement('tr');
    
    // Изображение
    const imageCell = document.createElement('td');
    const image = document.createElement('img');
    image.className = 'thumb';
    image.src = item.image || '/img/no-image.png';
    image.alt = item.title || item.mpn || '';
    imageCell.appendChild(image);
    
    // MPN и название
    const mpnCell = document.createElement('td');
    const mpnEl = document.createElement('div');
    mpnEl.className = 'mpn';
    mpnEl.textContent = item.mpn || '';
    const titleEl = document.createElement('div');
    titleEl.className = 'title';
    titleEl.textContent = item.title || '';
    mpnCell.appendChild(mpnEl);
    mpnCell.appendChild(titleEl);
    
    // Производитель
    const brandCell = document.createElement('td');
    brandCell.textContent = item.brand || '';
    
    // Описание
    const descCell = document.createElement('td');
    descCell.textContent = item.desc || '';
    
    // Корпус
    const pkgCell = document.createElement('td');
    if (item.pkg) {
      pkgCell.textContent = item.pkg;
      if (item.pkg_type) {
        const pkgTypeEl = document.createElement('div');
        pkgTypeEl.className = 'badge';
        pkgTypeEl.textContent = item.pkg_type;
        pkgCell.appendChild(pkgTypeEl);
      }
    }
    
    // Регионы
    const regionsCell = document.createElement('td');
    if (item.regions && item.regions.length > 0) {
      item.regions.slice(0, 3).forEach(region => {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = region;
        regionsCell.appendChild(badge);
      });
      
      if (item.regions.length > 3) {
        const more = document.createElement('span');
        more.className = 'badge';
        more.textContent = `+${item.regions.length - 3}`;
        regionsCell.appendChild(more);
      }
    }
    
    // Наличие
    const stockCell = document.createElement('td');
    if (item.stock_total !== null && item.stock_total !== undefined) {
      stockCell.textContent = item.stock_total;
    } else {
      stockCell.textContent = 'По запросу';
    }
    
    // Цена
    const priceCell = document.createElement('td');
    if (item.price_rub) {
      priceCell.textContent = `${item.price_rub.toLocaleString('ru-RU')} ₽`;
    } else {
      priceCell.textContent = 'По запросу';
    }
    
    // Кнопка "Открыть"
    const actionCell = document.createElement('td');
    const openButton = document.createElement('button');
    openButton.className = 'btn btn-primary';
    openButton.textContent = 'Открыть';
    openButton.addEventListener('click', () => {
      openProductModal(item.mpn);
    });
    actionCell.appendChild(openButton);
    
    // Добавляем ячейки в строку
    row.appendChild(imageCell);
    row.appendChild(mpnCell);
    row.appendChild(brandCell);
    row.appendChild(descCell);
    row.appendChild(pkgCell);
    row.appendChild(regionsCell);
    row.appendChild(stockCell);
    row.appendChild(priceCell);
    row.appendChild(actionCell);
    
    // Добавляем строку в таблицу
    resultsBody.appendChild(row);
  });
}

/**
 * Отображает пагинацию
 * @param {number} totalPages Общее количество страниц
 */
function renderPagination(totalPages) {
  // Очищаем пагинацию
  paginationEl.innerHTML = '';
  
  // Если страница только одна, не отображаем пагинацию
  if (totalPages <= 1) {
    return;
  }
  
  // Кнопка "Предыдущая"
  if (currentPage > 1) {
    const prevButton = document.createElement('button');
    prevButton.textContent = '←';
    prevButton.addEventListener('click', () => {
      currentPage--;
      updateResults();
      window.scrollTo(0, 0);
    });
    paginationEl.appendChild(prevButton);
  }
  
  // Номера страниц
  const maxButtons = 5; // Максимальное количество кнопок с номерами страниц
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('button');
    pageButton.textContent = i;
    if (i === currentPage) {
      pageButton.className = 'active';
    }
    pageButton.addEventListener('click', () => {
      currentPage = i;
      updateResults();
      window.scrollTo(0, 0);
    });
    paginationEl.appendChild(pageButton);
  }
  
  // Кнопка "Следующая"
  if (currentPage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.textContent = '→';
    nextButton.addEventListener('click', () => {
      currentPage++;
      updateResults();
      window.scrollTo(0, 0);
    });
    paginationEl.appendChild(nextButton);
  }
}

/**
 * Открывает модальное окно с карточкой товара
 * @param {string} mpn MPN товара
 */
async function openProductModal(mpn) {
  // Показываем модальное окно с индикатором загрузки
  productModal.classList.remove('hidden');
  modalTitle.textContent = 'Загрузка...';
  modalMainImage.src = '';
  modalThumbnails.innerHTML = '';
  modalMpn.textContent = 'MPN: ';
  modalBrand.textContent = 'Производитель: ';
  modalPkg.textContent = 'Корпус: ';
  modalDescription.textContent = '';
  modalSpecs.innerHTML = '';
  modalDocs.innerHTML = '';
  modalPrice.textContent = '0 ₽';
  modalStock.innerHTML = '';
  
  try {
    // Загружаем данные о товаре
    const response = await fetch(`/api/product?mpn=${encodeURIComponent(mpn)}`);
    if (!response.ok) {
      throw new Error(`Error loading product: ${response.status}`);
    }
    
    const product = await response.json();
    currentProduct = product;
    
    // Заполняем модальное окно данными о товаре
    modalTitle.textContent = product.title || product.mpn || '';
    modalMpn.textContent = `MPN: ${product.mpn || ''}`;
    modalBrand.textContent = `Производитель: ${product.brand || ''}`;
    modalPkg.textContent = `Корпус: ${product.pkg || ''}${product.pkg_type ? ` (${product.pkg_type})` : ''}`;
    modalDescription.textContent = product.desc_short || '';
    
    // Изображения
    if (product.image) {
      modalMainImage.src = product.image;
    } else {
      modalMainImage.src = '/img/no-image.png';
    }
    
    // Миниатюры
    if (product.images && product.images.length > 0) {
      product.images.forEach((imgUrl, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail';
        if (index === 0) {
          thumbnail.classList.add('active');
        }
        
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = '';
        
        thumbnail.appendChild(img);
        thumbnail.addEventListener('click', () => {
          // Обновляем главное изображение
          modalMainImage.src = imgUrl;
          
          // Обновляем активную миниатюру
          document.querySelectorAll('.thumbnail').forEach(el => {
            el.classList.remove('active');
          });
          thumbnail.classList.add('active');
        });
        
        modalThumbnails.appendChild(thumbnail);
      });
    }
    
    // Технические характеристики
    if (product.specs && Object.keys(product.specs).length > 0) {
      for (const [key, value] of Object.entries(product.specs)) {
        const row = document.createElement('tr');
        
        const keyCell = document.createElement('td');
        keyCell.textContent = key;
        
        const valueCell = document.createElement('td');
        valueCell.textContent = value;
        
        row.appendChild(keyCell);
        row.appendChild(valueCell);
        
        modalSpecs.appendChild(row);
      }
    } else {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 2;
      cell.textContent = 'Нет данных';
      row.appendChild(cell);
      modalSpecs.appendChild(row);
    }
    
    // Документы
    if (product.docs && product.docs.length > 0) {
      product.docs.forEach(doc => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = doc.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = doc.title || 'PDF';
        li.appendChild(a);
        modalDocs.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'Нет документов';
      modalDocs.appendChild(li);
    }
    
    // Цена
    if (product.price_min_rub) {
      modalPrice.textContent = `${product.price_min_rub.toLocaleString('ru-RU')} ₽`;
    } else {
      modalPrice.textContent = 'По запросу';
    }
    
    // Наличие
    if (product.offers && product.offers.length > 0) {
      product.offers.forEach(offer => {
        const row = document.createElement('tr');
        
        const regionCell = document.createElement('td');
        regionCell.textContent = offer.region || '';
        
        const stockCell = document.createElement('td');
        if (offer.stock !== null && offer.stock !== undefined) {
          stockCell.textContent = offer.stock;
        } else {
          stockCell.textContent = 'По запросу';
        }
        
        row.appendChild(regionCell);
        row.appendChild(stockCell);
        
        modalStock.appendChild(row);
      });
    } else {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 2;
      cell.textContent = 'Нет данных о наличии';
      row.appendChild(cell);
      modalStock.appendChild(row);
    }
  } catch (error) {
    console.error('Error loading product:', error);
    modalTitle.textContent = 'Ошибка загрузки';
    modalDescription.textContent = 'Не удалось загрузить информацию о товаре. Пожалуйста, попробуйте позже.';
  }
}

/**
 * Отправляет заказ
 */
async function submitOrder() {
  try {
    // Получаем данные формы
    const name = document.getElementById('order-name').value;
    const email = document.getElementById('order-email').value;
    const phone = document.getElementById('order-phone').value;
    const comment = document.getElementById('order-comment').value;
    const quantity = parseInt(modalQuantity.value, 10) || 1;
    
    // Проверяем наличие товара
    if (!currentProduct || !currentProduct.mpn) {
      alert('Ошибка: товар не выбран');
      return;
    }
    
    // Отправляем заказ
    const response = await fetch('/api/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mpn: currentProduct.mpn,
        qty: quantity,
        fio: name,
        email,
        phone,
        comment
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      alert('Заказ успешно отправлен!');
      orderModal.classList.add('hidden');
      productModal.classList.add('hidden');
      document.getElementById('order-form').reset();
    } else {
      alert('Ошибка при отправке заказа. Пожалуйста, попробуйте позже.');
    }
  } catch (error) {
    console.error('Error submitting order:', error);
    alert('Ошибка при отправке заказа. Пожалуйста, попробуйте позже.');
  }
}
