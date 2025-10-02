/**
 * Клиентский JavaScript для Deep Components Aggregator
 */

document.addEventListener('DOMContentLoaded', () => {
  // Инициализация поиска
  initSearch();
});

/**
 * Инициализация формы поиска и обработка URL-параметров
 */
function initSearch() {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');

  if (searchForm && searchInput) {
    // Получаем параметр q из URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    // Если есть запрос в URL, выполняем поиск
    if (query) {
      searchInput.value = query;
      performSearch(query);
    }

    // Обработчик отправки формы
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = searchInput.value.trim();

      if (query) {
        // Обновляем URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('q', query);
        window.history.pushState({}, '', newUrl);

        // Выполняем поиск
        performSearch(query);
      }
    });
  }
}

/**
 * Выполнение поиска
 * @param {string} query - Поисковый запрос
 */
function performSearch(query) {
  const searchResults = document.getElementById('searchResults');

  if (!searchResults) return;

  // Показываем сообщение о загрузке
  searchResults.innerHTML = '<div class="loading-message">Загрузка результатов...</div>';

  // Закрываем карточку товара, если она открыта
  closeProductCard();

  // Выполняем живой поиск с SSE
  liveSearch(query);
}

/**
 * Выполнение живого поиска с использованием SSE
 * @param {string} query - Поисковый запрос
 */
function liveSearch(query) {
  const searchResults = document.getElementById('searchResults');

  if (!searchResults) return;

  // Создаем таблицу результатов
  const tableTemplate = document.getElementById('resultsTableTemplate');
  searchResults.innerHTML = tableTemplate.innerHTML;

  const tbody = searchResults.querySelector('tbody');

  // Добавляем скелетоны загрузки
  const skeletonTemplate = document.getElementById('skeletonRowTemplate');
  for (let i = 0; i < 5; i++) {
    tbody.innerHTML += skeletonTemplate.innerHTML;
  }

  // Создаем EventSource для SSE
  const eventSource = new EventSource(`/api/live/search?q=${encodeURIComponent(query)}`);

  // Массив для хранения результатов
  const results = [];

  // Обработчик события start
  eventSource.addEventListener('start', (event) => {
    const data = JSON.parse(event.data);
    console.log('Поиск начат:', data);
  });

  // Обработчик события item
  eventSource.addEventListener('item', (event) => {
    const data = JSON.parse(event.data);

    if (data.item) {
      // Добавляем результат в массив
      results.push(data.item);

      // Обновляем таблицу
      updateResultsTable(results);
    }
  });

  // Обработчик события note
  eventSource.addEventListener('note', (event) => {
    const data = JSON.parse(event.data);
    console.log('Примечание:', data.message);
  });

  // Обработчик события done
  eventSource.addEventListener('done', (event) => {
    const data = JSON.parse(event.data);
    console.log('Поиск завершен:', data);

    // Закрываем соединение
    eventSource.close();

    // Удаляем скелетоны
    const skeletonRows = tbody.querySelectorAll('.skeleton-row');
    skeletonRows.forEach(row => row.remove());

    // Если нет результатов, показываем сообщение
    if (results.length === 0) {
      const emptyTemplate = document.getElementById('emptyResultsTemplate');
      searchResults.innerHTML = emptyTemplate.innerHTML;
    }
  });

  // Обработчик события error
  eventSource.addEventListener('error', (event) => {
    console.error('Ошибка SSE:', event);

    // Закрываем соединение
    eventSource.close();

    // Если нет результатов, показываем сообщение об ошибке
    if (results.length === 0) {
      const errorTemplate = document.getElementById('errorTemplate');
      searchResults.innerHTML = errorTemplate.innerHTML;
    }
  });
}

/**
 * Обновление таблицы результатов
 * @param {Array} results - Массив результатов
 */
function updateResultsTable(results) {
  const searchResults = document.getElementById('searchResults');
  const tbody = searchResults.querySelector('tbody');

  if (!tbody) return;

  // Удаляем все строки, кроме скелетонов
  const rows = tbody.querySelectorAll('tr:not(.skeleton-row)');
  rows.forEach(row => row.remove());

  // Добавляем строки для результатов
  results.forEach((item, index) => {
    const row = document.createElement('tr');
    row.setAttribute('data-mpn', item.mpn || '');
    row.setAttribute('data-index', index);

    // Изображение
    const imgCell = document.createElement('td');
    if (item.image_url) {
      const img = document.createElement('img');
      img.src = item.image_url;
      img.alt = item.title || 'Изображение товара';
      img.style.width = '50px';
      img.style.height = '50px';
      img.style.objectFit = 'contain';
      imgCell.appendChild(img);
    }
    row.appendChild(imgCell);

    // MPN / Название
    const titleCell = document.createElement('td');
    const mpnSpan = document.createElement('div');
    mpnSpan.textContent = item.mpn || '';
    mpnSpan.style.fontWeight = 'bold';
    titleCell.appendChild(mpnSpan);

    const titleSpan = document.createElement('div');
    titleSpan.textContent = item.title || '';
    titleCell.appendChild(titleSpan);
    row.appendChild(titleCell);

    // Производитель
    const brandCell = document.createElement('td');
    brandCell.textContent = item.brand || '';
    row.appendChild(brandCell);

    // Описание
    const descCell = document.createElement('td');
    descCell.textContent = item.description ? item.description.substring(0, 100) + (item.description.length > 100 ? '...' : '') : '';
    row.appendChild(descCell);

    // Корпус
    const packageCell = document.createElement('td');
    packageCell.textContent = item.package || '';
    row.appendChild(packageCell);

    // Упаковка
    const packagingCell = document.createElement('td');
    packagingCell.textContent = item.packaging || '';
    row.appendChild(packagingCell);

    // Регионы
    const regionsCell = document.createElement('td');
    if (item.regions && item.regions.length > 0) {
      regionsCell.textContent = item.regions.join(', ');
    }
    row.appendChild(regionsCell);

    // Наличие
    const stockCell = document.createElement('td');
    stockCell.textContent = item.total_stock || '0';
    row.appendChild(stockCell);

    // Цена от
    const priceCell = document.createElement('td');
    if (item.min_price_rub) {
      priceCell.textContent = `${item.min_price_rub} ₽`;
    }
    row.appendChild(priceCell);

    // Кнопка "Открыть"
    const actionCell = document.createElement('td');
    const openButton = document.createElement('button');
    openButton.textContent = 'Открыть';
    openButton.className = 'open-button';
    openButton.addEventListener('click', () => {
      openProductCard(item);
    });
    actionCell.appendChild(openButton);
    row.appendChild(actionCell);

    // Добавляем строку в таблицу
    tbody.appendChild(row);
  });
}

/**
 * Открытие карточки товара
 * @param {Object} product - Данные о товаре
 */
function openProductCard(product) {
  const productCardContainer = document.getElementById('productCardContainer');
  const productCardTemplate = document.getElementById('productCardTemplate');

  if (!productCardContainer || !productCardTemplate) return;

  // Клонируем шаблон
  const productCard = productCardTemplate.content.cloneNode(true);

  // Заполняем данные
  const productImage = productCard.querySelector('.product-image');
  if (product.image_url) {
    productImage.src = product.image_url;
    productImage.alt = product.title || 'Изображение товара';
  } else {
    productImage.src = '/img/no-image.png';
    productImage.alt = 'Изображение отсутствует';
  }

  // Заголовок и метаданные
  productCard.querySelector('.product-title').textContent = product.title || 'Название отсутствует';
  productCard.querySelector('.product-manufacturer').textContent = product.brand || 'Производитель не указан';
  productCard.querySelector('.product-mpn').textContent = `MPN: ${product.mpn || 'Не указан'}`;

  // Описание
  const descriptionElement = productCard.querySelector('.product-description');
  if (product.description) {
    const descTitle = document.createElement('h3');
    descTitle.textContent = 'Описание';
    descriptionElement.appendChild(descTitle);

    const descText = document.createElement('p');
    descText.textContent = product.description;
    descriptionElement.appendChild(descText);
  } else {
    descriptionElement.style.display = 'none';
  }

  // Технические характеристики
  const specsTable = productCard.querySelector('.specs-table tbody');
  if (product.technical_specs && Object.keys(product.technical_specs).length > 0) {
    for (const [key, value] of Object.entries(product.technical_specs)) {
      const row = document.createElement('tr');

      const th = document.createElement('th');
      th.textContent = key;
      row.appendChild(th);

      const td = document.createElement('td');
      td.textContent = value;
      row.appendChild(td);

      specsTable.appendChild(row);
    }
  } else {
    productCard.querySelector('.product-specs').style.display = 'none';
  }

  // Документация
  const docsLinks = productCard.querySelector('.docs-links');
  if (product.datasheet_urls && product.datasheet_urls.length > 0) {
    product.datasheet_urls.forEach((url, index) => {
      const link = document.createElement('a');
      link.href = url;
      link.className = 'doc-link';
      link.textContent = `Datasheet ${index + 1}`;
      link.target = '_blank';
      docsLinks.appendChild(link);
    });
  } else {
    productCard.querySelector('.product-docs').style.display = 'none';
  }

  // Цена и наличие
  productCard.querySelector('.price-value').textContent = product.min_price_rub || '0';
  productCard.querySelector('.stock-value').textContent = product.total_stock || '0';

  // Регионы
  const regionsList = productCard.querySelector('.regions-list');
  if (product.regions && product.regions.length > 0) {
    product.regions.forEach(region => {
      const regionTag = document.createElement('span');
      regionTag.className = 'region-tag';
      regionTag.textContent = region;
      regionsList.appendChild(regionTag);
    });
  } else {
    productCard.querySelector('.product-regions').style.display = 'none';
  }

  // Кнопка заказа
  productCard.querySelector('.order-button').addEventListener('click', () => {
    alert('Функция заказа в разработке');
  });

  // Очищаем контейнер и добавляем карточку
  productCardContainer.innerHTML = '';
  productCardContainer.appendChild(productCard);

  // Разворачиваем карточку
  setTimeout(() => {
    productCardContainer.classList.add('expanded');
  }, 10);

  // Прокручиваем к карточке
  productCardContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Закрытие карточки товара
 */
function closeProductCard() {
  const productCardContainer = document.getElementById('productCardContainer');

  if (productCardContainer) {
    productCardContainer.classList.remove('expanded');

    // Очищаем контейнер после анимации
    setTimeout(() => {
      productCardContainer.innerHTML = '';
    }, 500);
  }
}
