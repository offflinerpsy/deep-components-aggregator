// parsers.ru.js - конфигурация RU-источников с устойчивыми селекторами
export const parsersConfig = {
  chipdip: {
    base: 'https://www.chipdip.ru',
    search: (q) => `https://www.chipdip.ru/search?searchtext=${encodeURIComponent(q)}`,
    selectors: {
      // поиск
      searchItems: '.search-item, .product-item, .catalog-item',
      searchLink: 'a[href*="/product/"]',
      
      // карточка
      title: 'h1[itemprop="name"], h1.product-name, .product-title h1',
      desc: 'div[itemprop="description"], .product-description, .description-content',
      manufacturer: '[itemprop="manufacturer"], .manufacturer, .brand-name',
      package: '.package, .housing, .case, [data-package]',
      packaging: '.packaging, .pack-type, [data-packaging]',
      
      // цена и наличие
      price: '[itemprop="price"], .price-value, .product-price',
      currency: '[itemprop="priceCurrency"], .price-currency',
      stock: '.stock-value, .availability, [data-stock]',
      
      // галерея
      images: 'img[itemprop="image"], .product-image img, .gallery img',
      
      // технические характеристики
      specsTable: 'table:has(th:contains("Технические параметры")), table.characteristics, .tech-params table',
      specsRows: 'tr:has(td)',
      
      // документация
      pdfLinks: 'a[href$=".pdf"], a[href*="/datasheet/"], .docs a[href*=".pdf"]'
    }
  },
  
  promelec: {
    base: 'https://promelec.ru',
    search: (q) => `https://promelec.ru/search/?q=${encodeURIComponent(q)}`,
    selectors: {
      searchItems: '.product-item, .search-item, .catalog-item',
      searchLink: 'a[href*="/product/"], a[href*="/catalog/"]',
      
      title: 'h1, .product-name, .item-title',
      desc: '.product__description, .card__desc, .description',
      manufacturer: '.manufacturer, .brand, .vendor',
      package: '.package, .case, .housing',
      packaging: '.packaging, .pack-type',
      
      price: '.price, .price-value',
      currency: '.currency',
      stock: '.stock, .availability',
      
      images: '.product-image img, .gallery img, .main-image img',
      
      specsTable: 'table:has(th), .characteristics table, .specifications table',
      specsRows: 'tr:has(td)',
      
      pdfLinks: 'a[href$=".pdf"], a[href*="/docs/"], .documentation a'
    }
  },
  
  compel: {
    base: 'https://www.compel.ru',
    search: (q) => `https://www.compel.ru/catalog?q=${encodeURIComponent(q)}`,
    selectors: {
      searchItems: '.product-item, .catalog-item, .search-result',
      searchLink: 'a[href*="/item/"], a[href*="/product/"]',
      
      title: 'h1, .product-title, .item-name',
      desc: '.product-description, .description, .item-desc',
      manufacturer: '.manufacturer, .brand, .vendor',
      package: '.package, .case',
      packaging: '.packaging',
      
      price: '.price, .price-value',
      currency: '.currency',
      stock: '.stock, .in-stock',
      
      images: '.product-image img, .item-image img',
      
      specsTable: '.specifications table, .params table',
      specsRows: 'tr:has(td)',
      
      // Compel часто имеет прямые PDF endpoints
      pdfLinks: 'a[href*="/infosheets/pdf/"], a[href$=".pdf"], a[href*="/datasheet/"]'
    }
  },
  
  electronshik: {
    base: 'https://electronshik.ru',
    search: (q) => `https://electronshik.ru/?search=${encodeURIComponent(q)}`,
    selectors: {
      searchItems: '.product-item, .search-item',
      searchLink: 'a[href*="/product/"], a[href*="/item/"]',
      
      title: 'h1, .product-title, .item-title',
      desc: '.product-description, .description',
      manufacturer: '.manufacturer, .brand',
      package: '.package, .case',
      packaging: '.packaging',
      
      price: '.price, .price-value',
      currency: '.currency',
      stock: '.stock, .availability',
      
      images: '.product-image img, .gallery img',
      
      specsTable: 'table, .specifications table',
      specsRows: 'tr:has(td)',
      
      pdfLinks: 'a[href$=".pdf"], .documentation a'
    }
  },
  
  elitan: {
    base: 'https://www.elitan.ru',
    search: (q) => `https://www.elitan.ru/search?text=${encodeURIComponent(q)}`,
    selectors: {
      searchItems: '.product-item, .search-result',
      searchLink: 'a[href*="/product/"], a[href*="/catalog/"]',
      
      title: 'h1, .product-name',
      desc: '.product-description, .description',
      manufacturer: '.manufacturer, .brand',
      package: '.package',
      packaging: '.packaging',
      
      price: '.price, .price-value',
      currency: '.currency',
      stock: '.stock, .availability',
      
      images: '.product-image img, .gallery img',
      
      specsTable: 'table, .specifications',
      specsRows: 'tr:has(td)',
      
      pdfLinks: 'a[href$=".pdf"], .docs a'
    }
  }
};

// Приоритет источников
export const SOURCE_PRIORITY = [
  'chipdip',
  'promelec', 
  'compel',
  'electronshik',
  'elitan'
];

// Лимиты для троттлинга
export const NETWORK_LIMITS = {
  timeout: 12000, // 12s
  minDelay: 600,  // ms
  maxDelay: 1200, // ms
  maxConcurrent: 3
};

// Заголовки для запросов
export const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
};
