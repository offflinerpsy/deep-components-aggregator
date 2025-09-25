// src/config/parsers.config.js - Единый конфиг парсеров RU-источников
export const parsersConfig = {
  chipdip: {
    name: 'ChipDip',
    baseUrl: 'https://www.chipdip.ru',
    searchUrl: (q) => `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(q)}`,
    productUrl: (mpn) => `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(mpn)}`,
    priority: 1, // Наивысший приоритет
    selectors: {
      // Поисковая выдача
      searchResults: '.search-item, .product-item, .catalog-item',
      searchTitle: 'h3 a, .product-name a, [data-name]',
      searchLink: 'h3 a, .product-name a',
      
      // Карточка продукта
      title: 'h1[itemprop="name"], h1.product-name, .product-title h1',
      description: 'div[itemprop="description"], .product-description, .description-content',
      manufacturer: '[itemprop="manufacturer"], .manufacturer, .brand-name',
      package: '.package, .housing, .case, [data-package]',
      packaging: '.packaging, .pack-type, [data-packaging]',
      
      // Технические параметры
      specsTable: '[itemprop="specification"], .specifications table, .tech-params table, .product-specs table',
      specsRows: 'tr:has(td)',
      specsKey: 'td:first-child, th:first-child',
      specsValue: 'td:last-child',
      
      // Документация и изображения
      datasheets: 'a[href*="pdf"], a[href*="datasheet"], .docs a[href*=".pdf"]',
      images: 'img[itemprop="image"], .product-image img, .gallery img',
      imageMain: '.main-image img, .product-image-main img'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }
  },

  compel: {
    name: 'Compel',
    baseUrl: 'https://www.compel.ru',
    searchUrl: (q) => `https://www.compel.ru/search?search=${encodeURIComponent(q)}`,
    productUrl: (mpn) => `https://www.compel.ru/search?search=${encodeURIComponent(mpn)}`,
    priority: 3,
    selectors: {
      searchResults: '.product-item, .search-result-item, .catalog-item',
      searchTitle: 'h3 a, .product-title a, .item-title a',
      searchLink: 'h3 a, .product-title a, .item-title a',
      
      title: 'h1, .product-name, .item-name',
      description: '.product-description, .description, .item-description',
      manufacturer: '.manufacturer, .brand, .vendor',
      package: '.package, .housing, .case-type',
      packaging: '.packaging, .pack-type',
      
      specsTable: '.product-specs table, .characteristics table, .tech-specs table',
      specsRows: 'tr:has(td)',
      specsKey: 'td:first-child',
      specsValue: 'td:last-child',
      
      datasheets: 'a[href*="item-pdf"], a[href*="pdf"], a[href*="datasheet"]',
      images: '.product-image img, .item-image img, .gallery img',
      imageMain: '.main-image img, .product-image img'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  },

  platan: {
    name: 'Platan',
    baseUrl: 'https://www.platan.ru',
    searchUrl: (q) => `https://www.platan.ru/cgi-bin/qwery_i.pl?code=${encodeURIComponent(q)}`,
    productUrl: (mpn) => `https://www.platan.ru/cgi-bin/qwery_i.pl?code=${encodeURIComponent(mpn)}`,
    priority: 4,
    selectors: {
      searchResults: '.goods_item, .product-item, tr[bgcolor]',
      searchTitle: 'h1, .goods_name, #name, .product-name',
      searchLink: 'a[href*="qwery.pl"]',
      
      title: 'h1, .goods_name, #name',
      description: '.description, .goods_description, .product-desc',
      manufacturer: '.manufacturer, .vendor, .brand',
      package: '.package, .case, .housing',
      packaging: '.packaging, .pack',
      
      specsTable: 'table:has(th), .tech table, .params table, .characteristics table',
      specsRows: 'tr:has(td)',
      specsKey: 'td:first-child, th',
      specsValue: 'td:last-child',
      
      datasheets: 'a[href*=".pdf"], a[href*="datasheet"], a[href*="doc"]',
      images: '.goods_image img, .product-image img, img[src*="goods"]',
      imageMain: '.main-image img, .goods_image img'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9',
      'Accept': 'text/html,application/xhtml+xml'
    }
  },

  promelec: {
    name: 'Promelec',
    baseUrl: 'https://www.promelec.ru',
    searchUrl: (q) => `https://www.promelec.ru/search/?q=${encodeURIComponent(q)}`,
    productUrl: (mpn) => `https://www.promelec.ru/search/?q=${encodeURIComponent(mpn)}`,
    priority: 2,
    selectors: {
      searchResults: '.product-item, .search-item, .catalog-item',
      searchTitle: 'h3 a, .product-title a, .item-title',
      searchLink: 'h3 a, .product-title a, a[href*="/product/"]',
      
      title: 'h1, .product-name, .item-title',
      description: '#desc, .descr, .product-description, .description',
      manufacturer: '.manufacturer, .brand, .vendor',
      package: '.package, .case, .housing',
      packaging: '.packaging, .pack-type',
      
      specsTable: 'section:has(h2:contains("Технические параметры")) table, .tech-params table, .specifications table',
      specsRows: 'tr:has(td)',
      specsKey: 'td:first-child',
      specsValue: 'td:last-child',
      
      datasheets: 'a[href*=".pdf"], a[href*="datasheet"], section:contains("Документация") a',
      images: '.product-image img, .gallery img, .main-image img',
      imageMain: '.main-image img, .product-image img'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  },

  electronshik: {
    name: 'Electronshik',
    baseUrl: 'https://www.electronshik.ru',
    searchUrl: (q) => `https://www.electronshik.ru/search?q=${encodeURIComponent(q)}`,
    productUrl: (mpn) => `https://www.electronshik.ru/search?q=${encodeURIComponent(mpn)}`,
    priority: 5,
    selectors: {
      searchResults: '.product-item, .search-item, .catalog-item',
      searchTitle: 'h3 a, .product-title, .item-name',
      searchLink: 'h3 a, .product-link, a[href*="/item/"]',
      
      title: 'h1, .product-name, .item-title',
      description: '.product-description, .description, .item-desc',
      manufacturer: '.manufacturer, .brand, .vendor',
      package: '.package, .case, .housing',
      packaging: '.packaging, .pack',
      
      specsTable: 'h2:contains("Технические параметры") + *, .tech-params table, .specifications table',
      specsRows: 'tr:has(td)',
      specsKey: 'td:first-child',
      specsValue: 'td:last-child',
      
      datasheets: 'a[href*=".pdf"], a[href*="datasheet"], .docs a',
      images: '.product-image img, .gallery img, .item-image img',
      imageMain: '.main-image img, .product-image img'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9',
      'Accept': 'text/html,application/xhtml+xml'
    }
  }
};

// Получение конфига по имени
export const getParserConfig = (parserName) => {
  return parsersConfig[parserName] || null;
};

// Получение всех парсеров отсортированных по приоритету
export const getAllParsers = () => {
  return Object.entries(parsersConfig)
    .map(([key, config]) => ({ key, ...config }))
    .sort((a, b) => a.priority - b.priority);
};

// Валидация конфига парсера
export const validateParserConfig = (config) => {
  const required = ['name', 'baseUrl', 'searchUrl', 'selectors'];
  const missing = required.filter(field => !config[field]);
  
  if (missing.length > 0) {
    return { ok: false, error: `Missing required fields: ${missing.join(', ')}` };
  }
  
  if (typeof config.searchUrl !== 'function') {
    return { ok: false, error: 'searchUrl must be a function' };
  }
  
  return { ok: true };
};

// Настройки по умолчанию для всех парсеров
export const defaultParserSettings = {
  timeout: 15000, // 15 секунд
  retries: 2,
  throttleMs: 600, // минимальная задержка между запросами
  maxConcurrent: 3, // максимум одновременных запросов к одному сайту
  
  // Настройки Playwright для динамических сайтов
  playwright: {
    headless: true,
    timeout: 30000,
    waitForSelector: 'body',
    viewport: { width: 1280, height: 720 }
  }
};
