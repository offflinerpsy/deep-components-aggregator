/**
 * Обработка стрим-результатов поиска в реальном времени
 */

// Глобальные переменные
let eventSource = null;
let searchResults = [];
let currentPage = 1;
const resultsPerPage = 10;
let currentProduct = null;

// DOM-элементы
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsBody = document.getElementById('results-body');
const resultsCount = document.getElementById('results-count');
const paginationEl = document.getElementById('pagination');
const noResultsEl = document.getElementById('no-results');
const loadingEl = document.getElementById('loading');
const statusEl = document.getElementById('search-status');

// Модальное окно с карточкой товара
const productModal = document.getElementById('product-modal');
const modalClose = document.getElementById('modal-close');
const modalContent = document.getElementById('modal-content');

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
    startLiveSearch(query);
  }

  // Обработчики событий
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      startLiveSearch(query);
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
        startLiveSearch(query);
        // Обновляем URL
        const url = new URL(window.location);
        url.searchParams.set('q', query);
        window.history.pushState({}, '', url);
      }
    }
  });

  // Обработчик закрытия модального окна
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const modal = document.getElementById('product-modal');
      if (modal) modal.classList.add('hidden');
    });
  } else {
    console.error('Кнопка закрытия модального окна не найдена в DOM');
  }

  // Закрытие модального окна при клике вне его содержимого
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('product-modal');
    if (modal && e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

/**
 * Запускает поиск в реальном времени
 * @param {string} query Поисковый запрос
 */
function startLiveSearch(query) {
  // Очищаем предыдущие результаты
  searchResults = [];
  resultsBody.innerHTML = '';
  paginationEl.innerHTML = '';
  resultsCount.textContent = '0';

  // Показываем индикатор загрузки
  loadingEl.classList.remove('hidden');
  noResultsEl.classList.add('hidden');

  // Закрываем предыдущий EventSource, если он существует
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  // Обновляем статус
  updateStatus('Начинаем поиск...');

  // Создаем новый EventSource
  eventSource = new EventSource(`/api/live/search?q=${encodeURIComponent(query)}`);

  // Обработчик события "tick" (начало поиска)
  eventSource.addEventListener('tick', (e) => {
    const data = JSON.parse(e.data);
    updateStatus(`Поиск запущен: ${data.q}`);
  });

  // Обработчик события "item" (найден элемент)
  eventSource.addEventListener('item', (e) => {
    const item = JSON.parse(e.data);

    // Добавляем элемент в результаты
    searchResults.push(item);

    // Обновляем счетчик результатов
    resultsCount.textContent = searchResults.length;

    // Обновляем статус
    updateStatus(`Найдено элементов: ${searchResults.length}`);

    // Обновляем таблицу результатов
    updateResults();
  });

  // Обработчик события "note" (заметка)
  eventSource.addEventListener('note', (e) => {
    const data = JSON.parse(e.data);
    updateStatus(data.message || 'Примечание от сервера');
  });

  // Обработчик события "error" (ошибка)
  eventSource.addEventListener('error', (e) => {
    let errorMessage = 'Ошибка поиска';
    try {
      const data = JSON.parse(e.data);
      errorMessage = data.message || data.error || errorMessage;
    } catch {
      // Игнорируем ошибку парсинга
    }

    updateStatus(`Ошибка: ${errorMessage}`, true);

    // Закрываем EventSource
    eventSource.close();
    eventSource = null;

    // Скрываем индикатор загрузки
    loadingEl.classList.add('hidden');

    // Если нет результатов, показываем сообщение
    if (searchResults.length === 0) {
      noResultsEl.classList.remove('hidden');
    }
  });

  // Обработчик события "end" (завершение поиска)
  eventSource.addEventListener('end', (e) => {
    let message = 'Поиск завершен';
    try {
      const data = JSON.parse(e.data);
      if (data.count !== undefined) {
        message = `Поиск завершен. Найдено элементов: ${data.count}`;
      }
    } catch {
      // Игнорируем ошибку парсинга
    }

    updateStatus(message);

    // Закрываем EventSource
    eventSource.close();
    eventSource = null;

    // Скрываем индикатор загрузки
    loadingEl.classList.add('hidden');

    // Если нет результатов, показываем сообщение
    if (searchResults.length === 0) {
      noResultsEl.classList.remove('hidden');
    }
  });

  // Обработчик ошибки EventSource
  eventSource.onerror = () => {
    updateStatus('Ошибка соединения', true);

    // Закрываем EventSource
    eventSource.close();
    eventSource = null;

    // Скрываем индикатор загрузки
    loadingEl.classList.add('hidden');

    // Если нет результатов, показываем сообщение
    if (searchResults.length === 0) {
      noResultsEl.classList.remove('hidden');
    }
  };
}

/**
 * Обновляет статус поиска
 * @param {string} message Сообщение о статусе
 * @param {boolean} isError Является ли сообщение ошибкой
 */
function updateStatus(message, isError = false) {
  statusEl.textContent = message;

  if (isError) {
    statusEl.classList.add('error');
  } else {
    statusEl.classList.remove('error');
  }
}

/**
 * Обновляет таблицу результатов
 */
function updateResults() {
  // Вычисляем общее количество страниц
  const totalPages = Math.ceil(searchResults.length / resultsPerPage);

  // Если текущая страница больше общего количества страниц, устанавливаем последнюю страницу
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  // Получаем результаты для текущей страницы
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const pageResults = searchResults.slice(startIndex, endIndex);

  // Очищаем таблицу
  resultsBody.innerHTML = '';

  // Добавляем строки с результатами
  for (const item of pageResults) {
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
    descCell.textContent = item.description || item.desc || '';

    // Наличие
    const stockCell = document.createElement('td');
    if (item.stock !== null && item.stock !== undefined) {
      stockCell.textContent = item.stock;
    } else {
      stockCell.textContent = 'По запросу';
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

    // Цена
    const priceCell = document.createElement('td');
    if (item.price_rub) {
      priceCell.textContent = `${Math.round(item.price_rub).toLocaleString('ru-RU')} ₽`;
    } else if (item.price) {
      priceCell.textContent = `${Math.round(item.price).toLocaleString('ru-RU')} ${item.currency || ''}`;
    } else {
      priceCell.textContent = 'По запросу';
    }

    // Кнопка "Открыть"
    const actionCell = document.createElement('td');
    const openButton = document.createElement('button');
    openButton.className = 'btn btn-primary';
    openButton.textContent = 'Открыть';
    openButton.addEventListener('click', () => {
      openProductModal(item);
    });
    actionCell.appendChild(openButton);

    // Добавляем ячейки в строку
    row.appendChild(imageCell);
    row.appendChild(mpnCell);
    row.appendChild(brandCell);
    row.appendChild(descCell);
    row.appendChild(stockCell);
    row.appendChild(regionsCell);
    row.appendChild(priceCell);
    row.appendChild(actionCell);

    // Добавляем строку в таблицу
    resultsBody.appendChild(row);
  }

  // Обновляем пагинацию
  updatePagination(totalPages);

  // Скрываем индикатор загрузки
  loadingEl.classList.add('hidden');
}

/**
 * Обновляет пагинацию
 * @param {number} totalPages Общее количество страниц
 */
function updatePagination(totalPages) {
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
 * @param {object} item Элемент для отображения
 */
function openProductModal(item) {
  // Сохраняем текущий элемент
  currentProduct = item;

  // Проверяем, что модальное окно существует
  const modal = document.getElementById('product-modal');
  if (!modal) {
    console.error('Модальное окно не найдено в DOM');
    return;
  }

  // Показываем модальное окно
  modal.classList.remove('hidden');

  // Формируем содержимое модального окна
  let html = `
    <div class="product-card">
      <div class="product-gallery">
        <div class="main-image">
          <img src="${item.image || '/img/no-image.png'}" alt="${item.title || item.mpn || ''}">
        </div>
      </div>

      <div class="product-info">
        <div class="product-meta">
          <h2>${item.title || item.mpn || ''}</h2>
          <p class="mpn">MPN: ${item.mpn || ''}</p>
          <p class="brand">Производитель: ${item.brand || ''}</p>
        </div>

        <div class="product-description">
          <h3>Описание</h3>
          <p>${item.description || item.desc || ''}</p>
        </div>
  `;

  // Добавляем технические характеристики, если они есть
  if (item.specs && Object.keys(item.specs).length > 0) {
    html += `
      <div class="product-specs">
        <h3>Технические характеристики</h3>
        <table>
    `;

    for (const [key, value] of Object.entries(item.specs)) {
      html += `
        <tr>
          <td>${key}</td>
          <td>${value}</td>
        </tr>
      `;
    }

    html += `
        </table>
      </div>
    `;
  }

  // Добавляем документы, если они есть
  if (item.docs && item.docs.length > 0) {
    html += `
      <div class="product-docs">
        <h3>Документация</h3>
        <ul>
    `;

    for (const doc of item.docs) {
      html += `
        <li><a href="${doc.url}" target="_blank">${doc.title || 'PDF'}</a></li>
      `;
    }

    html += `
        </ul>
      </div>
    `;
  }

  html += `
      </div>

      <div class="product-order">
        <div class="price-box">
          <h3>Цена</h3>
  `;

  // Добавляем цену
  if (item.price_rub) {
    html += `<p class="price">${Math.round(item.price_rub).toLocaleString('ru-RU')} ₽</p>`;
  } else if (item.price) {
    html += `<p class="price">${Math.round(item.price).toLocaleString('ru-RU')} ${item.currency || ''}</p>`;
  } else {
    html += `<p class="price">По запросу</p>`;
  }

  // Добавляем наличие и регионы
  html += `
        </div>

        <div class="stock-box">
          <h3>Наличие</h3>
  `;

  if (item.regions && item.regions.length > 0) {
    html += `<p>${item.regions.join(', ')}</p>`;
  } else {
    html += `<p>По запросу</p>`;
  }

  // Добавляем форму заказа
  html += `
        </div>

        <div class="order-form">
          <h3>Заказ</h3>
          <div class="form-group">
            <label for="modal-quantity">Количество</label>
            <input type="number" id="modal-quantity" min="1" value="1">
          </div>

          <button id="modal-order-btn" class="order-btn">Оформить заказ</button>
        </div>
      </div>
    </div>
  `;

  // Устанавливаем содержимое модального окна
  const content = document.getElementById('modal-content');
  if (content) {
    content.innerHTML = html;
    
    // Добавляем обработчик для кнопки заказа
    const orderButton = document.getElementById('modal-order-btn');
    if (orderButton) {
      orderButton.addEventListener('click', () => {
        submitOrder();
      });
    }
  } else {
    console.error('Контейнер содержимого модального окна не найден в DOM');
  }
}

/**
 * Отправляет заказ
 */
function submitOrder() {
  // Получаем данные формы
  const quantityInput = document.getElementById('modal-quantity');
  const quantity = quantityInput ? parseInt(quantityInput.value || '1', 10) : 1;

  // Проверяем наличие товара
  if (!currentProduct || !currentProduct.mpn) {
    alert('Ошибка: товар не выбран');
    return;
  }

  // Запрашиваем email
  const email = prompt('Введите ваш email для связи:');
  if (!email) {
    return;
  }

  // Отправляем заказ
  fetch('/api/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mpn: currentProduct.mpn,
      qty: quantity,
      email
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.ok) {
      alert('Заказ успешно отправлен!');
      const modal = document.getElementById('product-modal');
      if (modal) modal.classList.add('hidden');
    } else {
      alert('Ошибка при отправке заказа. Пожалуйста, попробуйте позже.');
    }
  })
  .catch(error => {
    console.error('Error submitting order:', error);
    alert('Ошибка при отправке заказа. Пожалуйста, попробуйте позже.');
  });
}
