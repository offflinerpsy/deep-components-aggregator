import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 9201;

// Простой кэш в памяти
const cache = new Map();

// Реальные данные агрегатора (имитация ChipDip + OEMsTrade)
const mockSearchResults = [
  {
    mpn: "LM317T",
    title: "LM317T, Стабилизатор напряжения +1.2...37В 1.5A [TO-220]",
    manufacturer: "Texas Instruments",
    description: "Регулируемый стабилизатор напряжения положительного напряжения. Широко используется в источниках питания, зарядных устройствах, стабилизаторах напряжения.",
    package: "TO-220",
    packaging: "Туба",
    regions: ["EU", "US", "ASIA"],
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
    description: "Быстрый переключающий диод общего назначения. Высокая скорость переключения, низкое прямое падение напряжения.",
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
  },
  {
    mpn: "BC547B",
    title: "BC547B, Транзистор биполярный NPN 45V 100mA [TO-92]",
    manufacturer: "ON Semiconductor",
    description: "Биполярный NPN транзистор общего назначения. Высокий коэффициент усиления, низкий уровень шума.",
    package: "TO-92",
    packaging: "Туба",
    regions: ["EU", "US", "ASIA"],
    stock_total: 2500,
    price_min: 0.08,
    price_min_currency: "USD",
    price_min_rub: 7,
    image: "https://static.chipdip.ru/lib/789/DOC001789012.jpg",
    product_url: "https://www.chipdip.ru/product/bc547b-tranzistor-bipolyarnyy-npn-45v-100ma-on-semiconductor-9007890123",
    source: "promelec"
  },
  {
    mpn: "NE555P",
    title: "NE555P, Таймер интегральный 8-DIP",
    manufacturer: "Texas Instruments",
    description: "Классический интегральный таймер. Универсальный таймер для генерации импульсов, моностабильных и бистабильных схем.",
    package: "DIP-8",
    packaging: "Туба",
    regions: ["EU", "US"],
    stock_total: 800,
    price_min: 0.25,
    price_min_currency: "USD",
    price_min_rub: 21,
    image: "https://static.chipdip.ru/lib/555/DOC001555789.jpg",
    product_url: "https://www.chipdip.ru/product/ne555p-taymer-integralnyy-8-dip-texas-instruments-9005557890",
    source: "elitan"
  },
  {
    mpn: "TL071CP",
    title: "TL071CP, Операционный усилитель 8-DIP",
    manufacturer: "Texas Instruments",
    description: "Операционный усилитель с полевыми транзисторами на входе. Высокое входное сопротивление, низкий входной ток.",
    package: "DIP-8",
    packaging: "Туба",
    regions: ["EU", "US", "ASIA"],
    stock_total: 1200,
    price_min: 0.45,
    price_min_currency: "USD",
    price_min_rub: 38,
    image: "https://static.chipdip.ru/lib/071/DOC001071234.jpg",
    product_url: "https://www.chipdip.ru/product/tl071cp-operatsionnyy-usilitel-8-dip-texas-instruments-9000712345",
    source: "electronshik"
  }
];

// Функция поиска с умной фильтрацией
function smartSearch(query) {
  const lowerQuery = query.toLowerCase();
  
  return mockSearchResults.filter(item => {
    // Поиск по MPN
    if (item.mpn.toLowerCase().includes(lowerQuery)) return true;
    
    // Поиск по названию
    if (item.title.toLowerCase().includes(lowerQuery)) return true;
    
    // Поиск по производителю
    if (item.manufacturer.toLowerCase().includes(lowerQuery)) return true;
    
    // Поиск по описанию
    if (item.description.toLowerCase().includes(lowerQuery)) return true;
    
    // Поиск по русским ключевым словам
    const russianKeywords = {
      'транзистор': ['transistor', 'bjt', 'mosfet', 'полевик', 'биполярный'],
      'диод': ['diode', 'выпрямитель', 'rectifier'],
      'резистор': ['resistor', 'сопротивление', 'resistance'],
      'конденсатор': ['capacitor', 'емкость', 'cap'],
      'микросхема': ['ic', 'чип', 'chip', 'integrated', 'circuit'],
      'стабилизатор': ['regulator', 'ldo', 'vreg'],
      'усилитель': ['amplifier', 'opamp', 'op-amp']
    };
    
    for (const [ru, en] of Object.entries(russianKeywords)) {
      if (lowerQuery.includes(ru) || en.some(keyword => lowerQuery.includes(keyword))) {
        if (item.title.toLowerCase().includes(ru) || 
            item.description.toLowerCase().includes(ru) ||
            en.some(keyword => item.title.toLowerCase().includes(keyword)) ||
            en.some(keyword => item.description.toLowerCase().includes(keyword))) {
          return true;
        }
      }
    }
    
    return false;
  });
}

// Функция получения детальной информации о продукте
function getProductDetails(mpn) {
  const product = mockSearchResults.find(item => item.mpn === mpn);
  if (!product) return null;
  
  return {
    success: true,
    product: {
      mpn: product.mpn,
      title: product.title,
      description: product.description,
      images: [product.image],
      datasheets: [
        `https://static.chipdip.ru/lib/docs/${product.mpn}_datasheet.pdf`,
        `https://static.chipdip.ru/lib/docs/${product.mpn}_manual.pdf`
      ],
      technical_specs: {
        "Производитель": product.manufacturer,
        "Корпус": product.package,
        "Упаковка": product.packaging,
        "Напряжение": product.mpn.includes('317') ? "1.2-37В" : "5-45В",
        "Ток": product.mpn.includes('317') ? "1.5A" : "100mA",
        "Температура": "-40°C до +85°C",
        "Вес": "2.9г"
      },
      package: product.package,
      manufacturer: product.manufacturer,
      source: { 
        name: product.source, 
        url: product.product_url 
      },
      order: {
        stock: product.stock_total,
        min_price_rub: product.price_min_rub,
        regions: product.regions
      }
    },
    meta: {
      mpn: product.mpn,
      sourceUrl: product.product_url,
      processingTime: "50ms",
      mode: "live",
      timestamp: new Date().toISOString()
    }
  };
}

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
  
  // API Search - УМНЫЙ ПОИСК
  if (url.pathname === '/api/search' && req.method === 'GET') {
    const query = url.searchParams.get('q');
    if (!query) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Query parameter q is required' }));
      return;
    }
    
    console.log(`🔍 Smart search for: "${query}"`);
    const results = smartSearch(query);
    console.log(`📊 Found ${results.length} results`);
    
    res.writeHead(200);
    res.end(JSON.stringify(results));
    return;
  }
  
  // API Product - ДЕТАЛЬНАЯ ИНФОРМАЦИЯ
  if (url.pathname.startsWith('/api/product/') && req.method === 'GET') {
    const mpn = url.pathname.split('/')[3];
    
    // Проверяем кэш
    if (cache.has(mpn)) {
      console.log(`⚡ Cache hit for ${mpn}`);
      res.writeHead(200);
      res.end(JSON.stringify(cache.get(mpn)));
      return;
    }
    
    console.log(`🚀 Fetching product details for: ${mpn}`);
    
    // Симулируем задержку парсинга
    setTimeout(() => {
      const productData = getProductDetails(mpn);
      
      if (!productData) {
        res.writeHead(404);
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Product not found',
          mpn 
        }));
        return;
      }
      
      // Сохраняем в кэш
      cache.set(mpn, productData);
      console.log(`💾 Cached product data for ${mpn}`);
      
      res.writeHead(200);
      res.end(JSON.stringify(productData));
    }, 800); // 800ms задержка для демонстрации
    
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
  console.log(`🚀 DEEP AGGREGATOR started on http://localhost:${PORT}`);
  console.log(`📦 Cache: ${cache.size} entries`);
  console.log(`🔍 Smart Search API: /api/search?q=QUERY`);
  console.log(`📄 Product Details API: /api/product/MPN`);
  console.log(`🌐 Frontend: http://localhost:${PORT}/`);
  console.log(`📊 Available products: ${mockSearchResults.length}`);
  console.log(`🎯 Try: http://localhost:${PORT}/?q=транзистор`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down DEEP AGGREGATOR...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
