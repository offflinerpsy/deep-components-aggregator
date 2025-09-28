const state = { items: [], es: null };

export function liveSearch(q){
  if (state.es) { try{ state.es.close(); }catch{} }
  state.items = [];
  renderTable([]);
  const es = new EventSource(`/api/live/search?q=${encodeURIComponent(q)}`);
  state.es = es;

  es.addEventListener('start', e => {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('no-results').classList.add('hidden');
  });

  es.addEventListener('item', e => {
    const msg = JSON.parse(e.data);
    if (msg?.item) {
      state.items.push(msg.item);
      renderTable(state.items);
    }
  });

  es.addEventListener('done', e => {
    es.close();
    document.getElementById('loading').classList.add('hidden');

    // Если пусто — показать подсказку/«ничего не найдено»
    if (state.items.length === 0) {
      document.getElementById('no-results').classList.remove('hidden');

      // Попробовать fallback к обычному поиску
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
          if (data.items && data.items.length > 0) {
            state.items = data.items;
            renderTable(state.items);
            document.getElementById('no-results').classList.add('hidden');
          }
        })
        .catch(err => console.error('Fallback search error:', err));
    }
  });
}

function renderTable(items) {
  const tbody = document.querySelector('#results tbody');
  if (!tbody) return;

  // Очищаем таблицу, если нет элементов
  if (!items.length) {
    tbody.innerHTML = '';
    return;
  }

  // Обновляем счетчик
  const counter = document.getElementById('results-count');
  if (counter) counter.textContent = items.length;

  // Обновляем таблицу
  tbody.innerHTML = items.map(item => `
    <tr>
      <td><img class="thumb" src="${item.image_url || ''}" alt=""></td>
      <td>
        <div class="mpn">${item.mpn || ''}</div>
        <div class="title">${item.title || ''}</div>
      </td>
      <td>${item.brand || ''}</td>
      <td>${item.description || ''}</td>
      <td>${item.package || ''}</td>
      <td>${item.packaging || ''}</td>
      <td>${(item.regions || []).map(r => `<span class="badge">${r}</span>`).join('')}</td>
      <td>${item.stock_total || item.total_stock || 'По запросу'}</td>
      <td>${item.price_min_rub || item.min_price_rub ? `${Math.round(item.price_min_rub || item.min_price_rub).toLocaleString('ru-RU')} ₽` : 'По запросу'}</td>
      <td><button class="btn-open" data-id="${item.id || ''}" data-mpn="${item.mpn || ''}">Открыть</button></td>
    </tr>
  `).join('');

  // Добавляем обработчики для кнопок
  document.querySelectorAll('.btn-open').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const mpn = btn.dataset.mpn;
      const item = state.items.find(i => (i.id == id) || (i.mpn === mpn));
      if (item) {
        openProductModal(item);
      }
    });
  });
}

function openProductModal(item) {
  const modal = document.getElementById('product-modal');
  const content = document.getElementById('modal-content');

  if (!modal || !content) return;

  // Формируем HTML для модального окна
  let html = `
    <div class="product-card">
      <div class="product-gallery">
        <img src="${item.image_url || ''}" alt="${item.title || item.mpn || ''}">
      </div>
      <div class="product-info">
        <h2>${item.title || ''}</h2>
        <p><strong>MPN:</strong> ${item.mpn || ''}</p>
        <p><strong>Производитель:</strong> ${item.brand || ''}</p>
        <p>${item.description || ''}</p>

        <div class="product-specs">
          <h3>Технические характеристики</h3>
          <table>
  `;

  // Добавляем технические характеристики
  if (item.specs) {
    for (const [key, value] of Object.entries(item.specs)) {
      html += `<tr><td>${key}</td><td>${value}</td></tr>`;
    }
  } else {
    html += `<tr><td colspan="2">Нет данных</td></tr>`;
  }

  html += `
          </table>
        </div>

        <div class="product-docs">
          <h3>Документация</h3>
  `;

  // Добавляем документацию
  if (item.datasheet_urls && item.datasheet_urls.length > 0) {
    html += '<ul>';
    for (const url of item.datasheet_urls) {
      html += `<li><a href="${url}" target="_blank">PDF</a></li>`;
    }
    html += '</ul>';
  } else {
    html += '<p>Документация не найдена</p>';
  }

  html += `
        </div>
      </div>

      <div class="product-order">
        <div class="price-box">
          <h3>Цена</h3>
          <p class="price">${item.price_min_rub || item.min_price_rub ? `${Math.round(item.price_min_rub || item.min_price_rub).toLocaleString('ru-RU')} ₽` : 'По запросу'}</p>
        </div>

        <div class="stock-box">
          <h3>Наличие</h3>
          <p>${item.stock_total || item.total_stock || 'По запросу'}</p>
          <p>${(item.regions || []).join(', ') || 'Регион не указан'}</p>
        </div>

        <div class="order-form">
          <h3>Заказать</h3>
          <div class="form-group">
            <label for="quantity">Количество</label>
            <input type="number" id="quantity" min="1" value="1">
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="example@mail.ru">
          </div>

          <button id="order-btn" class="order-btn" data-mpn="${item.mpn || ''}">Оформить заказ</button>
        </div>
      </div>
    </div>
  `;

  // Устанавливаем содержимое модального окна
  content.innerHTML = html;

  // Показываем модальное окно
  modal.classList.remove('hidden');

  // Добавляем обработчик для кнопки заказа
  const orderBtn = document.getElementById('order-btn');
  if (orderBtn) {
    orderBtn.addEventListener('click', () => {
      const mpn = orderBtn.dataset.mpn;
      const quantity = document.getElementById('quantity')?.value || 1;
      const email = document.getElementById('email')?.value || '';

      if (!email) {
        alert('Пожалуйста, укажите email');
        return;
      }

      // Отправляем заказ
      fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mpn,
          qty: quantity,
          email
        })
      })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          alert('Заказ успешно отправлен!');
          modal.classList.add('hidden');
        } else {
          alert('Ошибка при отправке заказа');
        }
      })
      .catch(err => {
        console.error('Order error:', err);
        alert('Ошибка при отправке заказа');
      });
    });
  }

  // Добавляем обработчик для закрытия модального окна
  const closeBtn = modal.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // Закрытие при клике вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
}
