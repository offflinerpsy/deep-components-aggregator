// Product Page Client-side Logic (v0 EJS port)
(function() {
  'use strict';

  const root = document.getElementById('product-root');
  const mpn = root?.dataset.mpn;
  if (!mpn) {
    console.error('Product MPN not found');
    return;
  }

  // State
  let product = null;
  let offers = [];
  let quantity = 1;
  let selectedImage = '';
  let currentImageIndex = 0;
  let isDescriptionExpanded = false;
  let offersPage = 1;
  const offersPageSize = 25;

  // DOM elements
  const loadingEl = document.getElementById('product-loading');
  const errorEl = document.getElementById('product-error');
  const contentEl = document.getElementById('product-content');
  const mainImageContainer = document.getElementById('main-image-container');
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  const productTitle = document.getElementById('product-title');
  const productMeta = document.getElementById('product-meta');
  const productDescriptionContainer = document.getElementById('product-description-container');
  const productDescription = document.getElementById('product-description');
  const descriptionToggle = document.getElementById('description-toggle');
  const datasheetsContainer = document.getElementById('datasheets-container');
  const datasheetsEmpty = document.getElementById('datasheets-empty');
  const stockInfo = document.getElementById('stock-info');
  const bestPriceEl = document.getElementById('best-price');
  const stockBadge = document.getElementById('stock-badge');
  const stockBadgeText = document.getElementById('stock-badge-text');
  const qtyInput = document.getElementById('qty-input');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const totalPriceEl = document.getElementById('total-price');
  const buyButton = document.getElementById('buy-button');
  const vendorLink = document.getElementById('vendor-link');
  const regionsContainer = document.getElementById('regions-container');
  const tabSpecs = document.getElementById('tab-specs');
  const tabOffers = document.getElementById('tab-offers');
  const specsContent = document.getElementById('specs-content');
  const offersContent = document.getElementById('offers-content');
  const specsTable = document.getElementById('specs-table');
  const specsEmpty = document.getElementById('specs-empty');
  const offersTbody = document.getElementById('offers-tbody');
  const offersEmpty = document.getElementById('offers-empty');
  const offersPagination = document.getElementById('offers-pagination');
  const orderModal = document.getElementById('order-modal');
  const orderForm = document.getElementById('order-form');
  const modalClose = document.getElementById('modal-close');
  const orderMpn = document.getElementById('order-mpn');
  const orderQuantity = document.getElementById('order-quantity');
  const sliderPrev = document.getElementById('slider-prev');
  const sliderNext = document.getElementById('slider-next');

  // Helper functions
  function formatRub(value) {
    return '₽' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function calculateBestPrice(pricing) {
    const candidates = (pricing || [])
      .map(tier => Number(tier.price_rub ?? tier.priceRub ?? tier.price ?? 0))
      .filter(value => Number.isFinite(value) && value > 0);
    return candidates.length ? Math.min(...candidates) : 0;
  }

  function formatStock(stock) {
    if (stock > 100) {
      return { text: `В наличии: ${stock.toLocaleString('ru-RU')} шт`, color: 'text-green-500' };
    }
    if (stock > 10) {
      return { text: `В наличии: ${stock.toLocaleString('ru-RU')} шт`, color: 'text-yellow-500' };
    }
    if (stock > 0) {
      return { text: `В наличии: ${stock.toLocaleString('ru-RU')} шт`, color: 'text-red-500' };
    }
    return { text: 'Нет в наличии', color: 'text-muted-foreground' };
  }

  function getProviderBadgeColor(provider) {
    const colors = {
      mouser: 'bg-blue-500',
      digikey: 'bg-red-500',
      tme: 'bg-green-500',
      farnell: 'bg-orange-500'
    };
    return colors[provider] || 'bg-slate-500';
  }

  function primitiveToString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
    return String(value);
  }

  function formatSpecValue(value) {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) {
      const normalized = value.map(primitiveToString).filter(Boolean);
      return normalized.length ? normalized.join(', ') : '—';
    }
    if (typeof value === 'object') {
      const normalized = Object.entries(value)
        .map(([key, primitive]) => {
          const str = primitiveToString(primitive);
          return str ? `${key}: ${str}` : '';
        })
        .filter(Boolean);
      return normalized.length ? normalized.join(' · ') : '—';
    }
    return primitiveToString(value);
  }

  function deriveOffers(product) {
    const regions = product.regions?.length ? Array.from(new Set(product.regions)) : ['GLOBAL'];
    const pricing = product.pricing || product.price_breaks || [];
    const unique = new Set();
    const offers = [];

    for (const region of regions) {
      for (const tier of pricing) {
  const price = Number(tier.price_rub ?? tier.priceRub ?? tier.price ?? 0);
        if (!Number.isFinite(price) || price <= 0) continue;
        const key = `${region}-${tier.qty}-${price}`;
        if (unique.has(key)) continue;
        offers.push({
          region,
          price,
          moq: tier.qty,
          eta: product.availability?.leadTime
        });
        unique.add(key);
      }
    }

    return offers;
  }

  // Render functions
  function renderMainImage() {
    const images = Array.isArray(product?.images) ? product.images : [];
    if (!images.length) {
      selectedImage = '';
      currentImageIndex = 0;
      mainImageContainer.innerHTML = '<div class="text-sm text-muted-foreground">Нет изображения</div>';
      sliderPrev?.classList.add('hidden');
      sliderNext?.classList.add('hidden');
      return;
    }

    if (currentImageIndex < 0 || currentImageIndex >= images.length) {
      currentImageIndex = 0;
    }

    selectedImage = images[currentImageIndex];

    mainImageContainer.innerHTML = `
      <img
        src="/api/image?url=${encodeURIComponent(selectedImage)}"
        alt="${product.mpn}"
        class="max-h-[360px] w-full object-contain"
        onerror="this.src='/placeholder.svg?height=320&width=320'"
      />
    `;
  }

  function renderThumbnails() {
    const images = Array.isArray(product?.images) ? product.images : [];
    if (!images.length || images.length <= 1) {
      thumbnailsContainer.innerHTML = '';
      sliderPrev?.classList.add('hidden');
      sliderNext?.classList.add('hidden');
      return;
    }

    thumbnailsContainer.innerHTML = images.map((image, index) => {
      const isActive = currentImageIndex === index;
      return `
        <button
          class="relative h-16 w-16 overflow-hidden rounded-lg border-2 transition-all ${
            isActive
              ? 'border-primary ring-2 ring-primary/30'
              : 'border-border hover:border-primary/60 hover:shadow-sm'
          }"
          data-index="${index}"
        >
          <img
            src="/api/image?url=${encodeURIComponent(image)}"
            alt="${product.mpn} preview ${index + 1}"
            class="h-full w-full object-contain p-1"
            onerror="this.src='/placeholder.svg?height=64&width=64'"
          />
        </button>
      `;
    }).join('');

    thumbnailsContainer.querySelectorAll('button').forEach(btn => {
      const idx = Number(btn.dataset.index || '0');
      btn.addEventListener('click', () => {
        if (!Number.isFinite(idx)) {
          return;
        }
        currentImageIndex = idx;
        renderMainImage();
        renderThumbnails();
      });
      btn.addEventListener('mouseenter', () => {
        if (!Number.isFinite(idx)) {
          return;
        }
        currentImageIndex = idx;
        renderMainImage();
        renderThumbnails();
      });
    });

    sliderPrev?.classList.remove('hidden');
    sliderNext?.classList.remove('hidden');
  }

  function renderProductInfo() {
    productTitle.textContent = product.mpn;

    // Meta badges
    const leadTime = product.availability?.leadTime;
    const metaHTML = `
      <div class="flex items-center gap-2">
        <span class="font-medium text-foreground">Производитель:</span>
        <span class="font-semibold text-foreground">${product.manufacturer}</span>
      </div>
      <div class="hidden h-4 w-px bg-border md:block"></div>
      <div class="flex items-center gap-2">
        <span class="text-muted-foreground">Артикул:</span>
        <span class="rounded bg-primary/5 px-2 py-1 text-xs font-medium text-primary">${product.mpn}</span>
      </div>
      ${product.source ? `
        <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${getProviderBadgeColor(product.source)}">
          ${product.source}
        </span>
      ` : ''}
      ${leadTime ? `
        <span class="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/80">
          Срок поставки: ${leadTime}
        </span>
      ` : ''}
    `;
    productMeta.innerHTML = metaHTML;

    // Description
    if (product.description) {
      productDescriptionContainer.classList.remove('hidden');
      productDescription.textContent = product.description;

      if (product.description.length > 200) {
        descriptionToggle.classList.remove('hidden');
        productDescription.classList.add('line-clamp-4');
      }
    }

    // Datasheets
    if (product.datasheets && product.datasheets.length > 0) {
      datasheetsContainer.classList.remove('hidden');
      datasheetsEmpty?.classList.add('hidden');
      datasheetsContainer.innerHTML = product.datasheets.map((url, idx) => `
        <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-white/20 dark:hover:bg-white/5 transition-all cursor-pointer group" data-datasheet-index="${idx}">
          <div class="pdf-icon text-sm">PDF</div>
          <div class="flex-1">
            <div class="font-medium text-sm group-hover:text-blue-500 transition-colors">Документ ${idx + 1}</div>
            <div class="text-xs text-muted-foreground">Скачать документацию</div>
          </div>
          <svg class="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
      `).join('');

      datasheetsContainer.querySelectorAll('[data-datasheet-index]').forEach((element) => {
        element.addEventListener('click', () => {
          const index = Number(element.getAttribute('data-datasheet-index'));
          const targetUrl = product.datasheets?.[index];
          if (targetUrl) {
            const href = `/api/pdf?url=${encodeURIComponent(targetUrl)}&dl=1`;
            window.open(href, '_blank', 'noopener');
          }
        });
      });
    } else {
      datasheetsContainer.classList.add('hidden');
      datasheetsEmpty?.classList.remove('hidden');
    }

    // Stock info
    if (product.availability) {
      const stockValue = Number(product.availability.inStock || 0);
      const stock = formatStock(stockValue);
      stockInfo.classList.remove('hidden');
      stockInfo.innerHTML = `
        <span class="h-2.5 w-2.5 rounded-full ${stockValue > 0 ? 'bg-emerald-500' : 'bg-muted-foreground'}"></span>
        <span class="font-semibold text-foreground">${stock.text}</span>
        ${leadTime ? `<span class="text-xs text-muted-foreground">· Срок поставки: ${leadTime}</span>` : ''}
      `;
    }
  }

  function renderSidebar() {
  const bestPrice = calculateBestPrice(product.pricing || product.price_breaks || []);
    const stockValue = Number(product.availability?.inStock || 0);

    bestPriceEl.textContent = bestPrice > 0 ? formatRub(bestPrice) : '—';
    totalPriceEl.textContent = bestPrice > 0 ? formatRub(bestPrice * quantity) : '—';

    if (stockValue > 0) {
      stockBadge.classList.remove('hidden');
      stockBadgeText.textContent = `${stockValue.toLocaleString('ru-RU')} шт в наличии`;
    } else {
      stockBadge.classList.add('hidden');
      stockBadgeText.textContent = '';
    }

    if (product.vendorUrl) {
      vendorLink.classList.remove('hidden');
      vendorLink.href = product.vendorUrl;
    }

    // Regions
    const regions = product.regions ? Array.from(new Set(product.regions)) : [];
    if (regions.length > 0) {
      regionsContainer.classList.remove('hidden');
      regionsContainer.innerHTML = `
        <div class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Доступно в регионах
        </div>
        <div class="flex flex-wrap gap-2">
          ${regions.map(region => `
            <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              ${region}
            </span>
          `).join('')}
        </div>
      `;
    } else {
      regionsContainer.classList.add('hidden');
      regionsContainer.innerHTML = '';
    }
  }

  function renderSpecs() {
    const specs = Object.entries(product.technical_specs || {});

    if (specs.length === 0) {
      specsTable.innerHTML = '';
      specsEmpty.classList.remove('hidden');
      return;
    }

    specsEmpty.classList.add('hidden');
    specsTable.innerHTML = specs.map(([key, value]) => `
      <div class="grid grid-cols-1 gap-3 py-3 transition-colors md:grid-cols-[minmax(200px,35%)_1fr] md:gap-6 hover:bg-muted/30">
        <div class="text-sm font-medium text-muted-foreground">${key}</div>
        <div class="text-sm font-semibold text-foreground leading-relaxed">${formatSpecValue(value)}</div>
      </div>
    `).join('');
  }

  function renderOffers() {
    if (offers.length === 0) {
      offersTbody.innerHTML = '';
      offersEmpty.classList.remove('hidden');
      offersPagination.classList.add('hidden');
      return;
    }

    offersEmpty.classList.add('hidden');
    const start = (offersPage - 1) * offersPageSize;
    const end = start + offersPageSize;
    const pageOffers = offers.slice(start, end);

  offersTbody.innerHTML = pageOffers.map((offer) => `
      <tr class="bg-background">
        <td class="px-4 py-3 text-foreground">${offer.region}</td>
        <td class="px-4 py-3 font-semibold text-foreground">${formatRub(offer.price)}</td>
        <td class="px-4 py-3 text-foreground">${offer.moq ?? '—'}</td>
        <td class="px-4 py-3 text-foreground">${offer.eta ?? '—'}</td>
      </tr>
    `).join('');

    // Pagination
    const totalPages = Math.ceil(offers.length / offersPageSize);
    if (totalPages > 1) {
      offersPagination.classList.remove('hidden');
      offersPagination.innerHTML = `
        <button id="offers-prev" class="h-8 px-3 py-1 border border-border rounded-md hover:bg-muted/50 transition-colors text-sm ${offersPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
          Назад
        </button>
        <span class="text-muted-foreground">
          Стр. ${offersPage} / ${totalPages}
        </span>
        <button id="offers-next" class="h-8 px-3 py-1 border border-border rounded-md hover:bg-muted/50 transition-colors text-sm ${offersPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}">
          Вперёд
        </button>
      `;

      document.getElementById('offers-prev')?.addEventListener('click', () => {
        if (offersPage > 1) {
          offersPage--;
          renderOffers();
        }
      });

      document.getElementById('offers-next')?.addEventListener('click', () => {
        if (offersPage < totalPages) {
          offersPage++;
          renderOffers();
        }
      });
    } else {
      offersPagination.classList.add('hidden');
    }
  }

  function switchTab(tab) {
    if (tab === 'specs') {
      tabSpecs.className = 'flex-1 px-6 py-4 font-medium transition-colors border-b-2 border-primary bg-background text-primary';
      tabOffers.className = 'flex-1 px-6 py-4 font-medium transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground';
      specsContent.classList.remove('hidden');
      offersContent.classList.add('hidden');
    } else {
      tabOffers.className = 'flex-1 px-6 py-4 font-medium transition-colors border-b-2 border-primary bg-background text-primary';
      tabSpecs.className = 'flex-1 px-6 py-4 font-medium transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground';
      offersContent.classList.remove('hidden');
      specsContent.classList.add('hidden');
    }
  }

  function updateQuantity(newQty) {
    quantity = Math.max(1, newQty);
    qtyInput.value = quantity;

  const bestPrice = calculateBestPrice(product.pricing || product.price_breaks || []);
    totalPriceEl.textContent = bestPrice > 0 ? formatRub(bestPrice * quantity) : '—';
  }

  function showError(title, message) {
    loadingEl.classList.add('hidden');
    contentEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-message').textContent = message;
  }

  function render() {
    loadingEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    renderMainImage();
    renderThumbnails();
    renderProductInfo();
    renderSidebar();
    renderSpecs();
    renderOffers();
    switchTab('specs');

    // Update tab label
    tabOffers.textContent = offers.length ? `Предложения (${offers.length})` : 'Предложения';
  }

  // Event listeners
  descriptionToggle?.addEventListener('click', () => {
    isDescriptionExpanded = !isDescriptionExpanded;
    if (isDescriptionExpanded) {
      productDescription.classList.remove('line-clamp-4');
      document.getElementById('toggle-text').textContent = 'Свернуть';
    } else {
      productDescription.classList.add('line-clamp-4');
      document.getElementById('toggle-text').textContent = 'Читать далее';
    }
  });

  qtyMinus?.addEventListener('click', () => updateQuantity(quantity - 1));
  qtyPlus?.addEventListener('click', () => updateQuantity(quantity + 1));
  qtyInput?.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    updateQuantity(Number.isFinite(val) && val > 0 ? val : 1);
  });

  tabSpecs?.addEventListener('click', () => switchTab('specs'));
  tabOffers?.addEventListener('click', () => switchTab('offers'));

  sliderPrev?.addEventListener('click', () => {
    const images = Array.isArray(product?.images) ? product.images : [];
    if (images.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    renderMainImage();
    renderThumbnails();
  });

  sliderNext?.addEventListener('click', () => {
    const images = Array.isArray(product?.images) ? product.images : [];
    if (images.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % images.length;
    renderMainImage();
    renderThumbnails();
  });

  buyButton?.addEventListener('click', () => {
    orderModal.classList.remove('hidden');
    orderMpn.value = product.mpn;
    orderQuantity.value = quantity;
  });

  modalClose?.addEventListener('click', () => {
    orderModal.classList.add('hidden');
  });

  orderForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = {
      mpn: orderMpn.value,
      quantity: parseInt(orderQuantity.value, 10),
      email: document.getElementById('order-email').value,
      comment: document.getElementById('order-comment').value
    };

    // TODO: Send to /api/order
    fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          alert('Заявка отправлена! Мы свяжемся с вами.');
          orderModal.classList.add('hidden');
          orderForm.reset();
        } else {
          alert('Ошибка отправки заявки: ' + (data.error || 'Неизвестная ошибка'));
        }
      })
      .catch(err => {
        console.error('Order submission error:', err);
        alert('Ошибка отправки заявки');
      });
  });

  // Fetch product data
  const query = new URLSearchParams({ mpn });
  const provider = new URLSearchParams(window.location.search).get('provider');
  if (provider) query.set('provider', provider);

  fetch(`/api/product?${query.toString()}`)
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (!data?.ok) {
        showError('Продукт не найден', 'Проверьте артикул или вернитесь к поиску.');
        return;
      }

      product = data.product;
      offers = deriveOffers(product);
      selectedImage = product.images?.[0] || '';

      render();
    })
    .catch(err => {
      console.error('Failed to fetch product:', err);
      showError('Ошибка загрузки данных', 'Не удалось загрузить информацию о продукте.');
    });
})();
