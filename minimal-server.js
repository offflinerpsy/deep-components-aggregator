import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 9201;

// Простой кэш в памяти
const cache = new Map();

// Простые моковые данные
const mockSearchResults = [
  {
    mpn: "LM317T",
    title: "LM317T, Стабилизатор напряжения +1.2...37В 1.5A [TO-220]",
    manufacturer: "Texas Instruments",
    description: "Регулируемый стабилизатор напряжения положительного напряжения",
    package: "TO-220",
    packaging: "Туба",
    regions: ["EU", "US"],
    stock_total: 150,
    price_min: 25.50,
    price_min_currency: "USD",
    price_min_rub: 2142,
    image: "https://static.chipdip.ru/lib/413/DOC005413067.jpg",
    product_url: "https://www.chipdip.ru/product/lm317t-stabilizator-napryazheniya-1.2-37v-1.5a-hgsemi-9001130283",
    source: "chipdip"
  },
  {
    mpn: "1N4148W-TP",
    title: "1N4148W-TP, Диод быстрый переключающий 100V 200mA [SOD-123]",
    manufacturer: "Vishay",
    description: "Быстрый переключающий диод общего назначения",
    package: "SOD-123",
    packaging: "Лента",
    regions: ["EU", "ASIA"],
    stock_total: 5000,
    price_min: 0.15,
    price_min_currency: "USD",
    price_min_rub: 13,
    image: "https://static.chipdip.ru/lib/123/DOC001123456.jpg",
    product_url: "https://www.chipdip.ru/product/1n4148w-tp-diod-bystryy-pereklyuchayushchiy-100v-200ma-vishay-9001234567",
    source: "chipdip"
  }
];

const mockProductData = {
  success: true,
  product: {
    mpn: "LM317T",
    title: "LM317T, Стабилизатор напряжения +1.2...37В 1.5A [TO-220]",
    description: "Регулируемый стабилизатор напряжения положительного напряжения",
    images: ["https://static.chipdip.ru/lib/413/DOC005413067.jpg"],
    datasheets: ["https://static.chipdip.ru/lib2/a/368/DOC062368789.pdf"],
    technical_specs: {
      "Вес, г": "2.9",
      "Напряжение": "1.2-37В",
      "Ток": "1.5A"
    },
    package: "TO-220",
    manufacturer: "Texas Instruments",
    source: { name: "chipdip", url: "https://www.chipdip.ru/product/lm317t" }
  },
  meta: {
    mpn: "LM317T",
    sourceUrl: "https://www.chipdip.ru/product/lm317t",
    processingTime: "50ms",
    mode: "cached",
    timestamp: new Date().toISOString()
  }
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  console.log(`${req.method} ${req.url}`);
  
  // API Search
  if (url.pathname === '/api/search' && req.method === 'GET') {
    const query = url.searchParams.get('q');
    if (!query) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Query parameter q is required' }));
      return;
    }
    
    const results = mockSearchResults.filter(item => 
      item.mpn.toLowerCase().includes(query.toLowerCase()) ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(query.toLowerCase())
    );
    
    res.writeHead(200);
    res.end(JSON.stringify(results));
    return;
  }
  
  // API Product
  if (url.pathname.startsWith('/api/product/') && req.method === 'GET') {
    const mpn = url.pathname.split('/')[3];
    
    // Проверяем кэш
    if (cache.has(mpn)) {
      console.log(`⚡ Cache hit for ${mpn}`);
      res.writeHead(200);
      res.end(JSON.stringify(cache.get(mpn)));
      return;
    }
    
    // Симулируем задержку парсинга
    setTimeout(() => {
      const productData = { ...mockProductData };
      productData.product.mpn = mpn;
      productData.meta.mpn = mpn;
      productData.meta.processingTime = "15000ms";
      productData.meta.mode = "live";
      
      // Сохраняем в кэш
      cache.set(mpn, productData);
      console.log(`💾 Cached data for ${mpn}`);
      
      res.writeHead(200);
      res.end(JSON.stringify(productData));
    }, 1000); // 1 секунда задержки для демонстрации
    
    return;
  }
  
  // Статические файлы
  if (url.pathname === '/global.css' && req.method === 'GET') {
    const cssPath = join(__dirname, 'frontend', 'public', 'global.css');
    if (existsSync(cssPath)) {
      res.setHeader('Content-Type', 'text/css');
      res.writeHead(200);
      res.end(readFileSync(cssPath, 'utf8'));
      return;
    }
  }
  
  if (url.pathname === '/layout/header.html' && req.method === 'GET') {
    const headerPath = join(__dirname, 'frontend', 'public', 'layout', 'header.html');
    if (existsSync(headerPath)) {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(readFileSync(headerPath, 'utf8'));
      return;
    }
  }
  
  if (url.pathname === '/layout/footer.html' && req.method === 'GET') {
    const footerPath = join(__dirname, 'frontend', 'public', 'layout', 'footer.html');
    if (existsSync(footerPath)) {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(readFileSync(footerPath, 'utf8'));
      return;
    }
  }
  
  if (url.pathname === '/search.html' && req.method === 'GET') {
    const searchPath = join(__dirname, 'frontend', 'public', 'search.html');
    if (existsSync(searchPath)) {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(readFileSync(searchPath, 'utf8'));
      return;
    }
  }
  
  if (url.pathname === '/search.js' && req.method === 'GET') {
    const searchJsPath = join(__dirname, 'frontend', 'public', 'search.js');
    if (existsSync(searchJsPath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.writeHead(200);
      res.end(readFileSync(searchJsPath, 'utf8'));
      return;
    }
  }

  // Главная страница
  if (url.pathname === '/' && req.method === 'GET') {
    const indexPath = join(__dirname, 'frontend', 'public', 'index.html');
    if (existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(readFileSync(indexPath, 'utf8'));
      return;
    }
  }
  
  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`🚀 Minimal server started on http://localhost:${PORT}`);
  console.log(`📦 Cache: ${cache.size} entries`);
  console.log(`🔍 Search API: /api/search?q=QUERY`);
  console.log(`📄 Product API: /api/product/MPN`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
