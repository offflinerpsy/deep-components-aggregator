import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { searchOEMsTrade } from "./adapters/oemstrade.js";
import { getRates, applyRub } from "./src/services/rates-cbr.js";
import { ensureCanon } from "./src/mw/validateCanon.js";
import Ajv from "ajv";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT     = process.env.PORT ? Number(process.env.PORT) : 9201;
const DATA_DIR = path.join(__dirname, "data");
const PUB_DIR  = path.join(__dirname, "public");

// --- Structured logging (без исключений) ---
function log(level, msg, meta = {}) {
  const entry = { 
    ts: new Date().toISOString(), 
    level, 
    msg, 
    pid: process.pid,
    ...meta 
  };
  console.log(JSON.stringify(entry));
}

// --- Startup validation ---
function validateStartup() {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    log('error', 'Invalid PORT configuration', { port: PORT });
    return { ok: false, error: 'invalid_port' };
  }
  
  if (!fs.existsSync(DATA_DIR)) {
    log('error', 'DATA_DIR not found', { path: DATA_DIR });
    return { ok: false, error: 'missing_data_dir' };
  }
  
  if (!fs.existsSync(PUB_DIR)) {
    log('error', 'PUB_DIR not found', { path: PUB_DIR });
    return { ok: false, error: 'missing_public_dir' };
  }
  
  return { ok: true };
}

// Загружаем схему валидации (с проверкой существования)
const schemaPath = path.join(__dirname, "src", "schema", "canon.search-row.json");
if (!fs.existsSync(schemaPath)) {
  log('error', 'Schema file not found', { path: schemaPath });
  process.exit(1);
}

const SCHEMA = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
const ajv = new Ajv({ allErrors: false, strict: false });
const validate = ajv.compile(SCHEMA);
log('info', 'Schema loaded successfully', { schemaPath });

// --- утилиты (без исключений) ---
function readJSON(fname){
  const fp = path.join(DATA_DIR, fname);
  if (!fs.existsSync(fp)) return { ok:false, error:"not_found" };
  const txt = fs.readFileSync(fp, "utf-8");
  if (!txt || !txt.trim()) return { ok:false, error:"empty" };
  const value = JSON.parse(txt);
  return { ok:true, value };
}

// --- НОРМАЛИЗАЦИЯ СТРОК ДЛЯ /api/search (строгое подмножество полей) ---
function nz(v) { 
  return (v === undefined || v === null) ? "" : String(v).trim(); 
}

function toSearchRow(x) {
  const regions = Array.isArray(x.regions) ? 
    x.regions.filter(r => /^(EU|US|ASIA)$/i.test(r)).map(r => r.toUpperCase()) : [];
  const stock   = Number.isFinite(Number(x.stock_total)) ? Number(x.stock_total) : 0;
  const lead    = Number.isFinite(Number(x.lead_days))   ? Number(x.lead_days)   : 0;
  
  // Поддерживаем как новый формат (price_min), так и старый (price_min_rub из seed)
  const price   = Number.isFinite(Number(x.price_min))   ? Number(x.price_min)   : 0;
  const currency = (x.price_min_currency === "USD" || x.price_min_currency === "EUR") ? 
    x.price_min_currency : "";
  const priceRub = Number.isFinite(Number(x.price_min_rub)) ? Number(x.price_min_rub) : 0;

  return {
    mpn: nz(x.mpn).toUpperCase(),
    title: nz(x.title),
    manufacturer: nz(x.manufacturer),
    description: nz(x.description),
    package: nz(x.package),        // ТО-220, SOD-123 и т.п.
    packaging: nz(x.packaging),    // Tape/Tube/Reel
    regions,                       // только EU/US/ASIA
    stock_total: stock,            // число
    lead_days: lead,               // дни
    price_min: price,              // исходная цена
    price_min_currency: currency,  // USD/EUR
    price_min_rub: 0,              // будет заполнено после конвертации
    image: nz(x.image) || "/ui/placeholder.svg"
  };
}

const app = express();
app.use(express.json({ charset: 'utf-8' }));
app.use(express.static(PUB_DIR));
app.use(express.static(path.join(__dirname, "frontend", "public")));

// Устанавливаем правильную кодировку только для API ответов
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.get("/_version", (req, res) => {
  res.json({ ok:true, name:"deep-agg-alpha", version:"0.0.3", ts:Date.now() });
});

app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) { 
    res.json({ ok: true, source: "empty", count: 0, items: [] }); 
    return; 
  }

  // Получаем курсы валют
  const rates = await getRates();
  const qUpper = q.toUpperCase();
  const raw = await searchOEMsTrade(qUpper, 40);
  const normalized = (raw || []).map(toSearchRow).filter(r => r.mpn);

  // Конвертация в рубли через новый сервис
  for (const row of normalized) {
    if (row.price_min > 0 && row.price_min_currency && rates.ok) {
      row.price_min_rub = applyRub(row.price_min, row.price_min_currency, rates);
      log('debug', 'Currency conversion applied', { 
        mpn: row.mpn, 
        price: row.price_min, 
        currency: row.price_min_currency, 
        rate: rates[row.price_min_currency], 
        result: row.price_min_rub 
      });
    }
  }

  // Валидация через JSON Schema
  const validItems = [];
  for (const row of normalized) {
    if (validate(row)) {
      validItems.push(row);
    }
  }

  // Fallback на seed данные если нет результатов
  if (!validItems.length) {
    const idx = readJSON("seed-index.json");
    const seedItems = idx.ok ? 
      idx.value.filter(x => (x.mpn || "").toUpperCase().includes(qUpper)).map(toSearchRow) : [];
    res.json({ ok: true, source: "seed", count: seedItems.length, items: seedItems });
    return;
  }

  res.json({ 
    ok: true, 
    source: "oemstrade", 
    count: validItems.length, 
    items: validItems,
    rates_cached: rates.cached || false
  });
});

app.get("/api/product", async (req, res) => {
  const mpn = (req.query.mpn || "").trim();
  if (!mpn) { 
    res.status(400).json({ ok:false, error:"mpn_required" }); 
    return; 
  }

  log('info', 'Product API request', { mpn });

  // Получаем данные с OEMsTrade
  const oemsData = await searchOEMsTrade(mpn.toUpperCase(), 10);
  if (!oemsData || oemsData.length === 0) {
    log('warn', 'No OEMsTrade data found', { mpn });
    res.status(404).json({ ok:false, error:"product_not_found", mpn });
    return;
  }

  // Берем первый результат как основной
  const primaryOems = oemsData[0];
  
  // Получаем курсы валют для конвертации
  const rates = await getRates();
  let priceRub = 0;
  if (rates.ok && primaryOems.price_min > 0) {
    priceRub = applyRub(primaryOems.price_min, primaryOems.price_min_currency, rates);
  }

  // Формируем объединенную карточку продукта (ChipDip стиль)
  const product = {
    mpn: primaryOems.mpn,
    title: primaryOems.title || primaryOems.description || mpn,
    manufacturer: primaryOems.manufacturer || "",
    description: primaryOems.description || "",
    package: primaryOems.package || "",
    packaging: primaryOems.packaging || "",
    
    // ChipDip стиль данных
    images: [primaryOems.image || "/ui/placeholder.svg"],
    datasheets: [], // TODO: интеграция с ChipDip для PDF
    technical_specs: {
      "MPN": primaryOems.mpn,
      "Производитель": primaryOems.manufacturer || "—",
      "Корпус": primaryOems.package || "—",
      "Упаковка": primaryOems.packaging || "—"
    },
    
    // Данные о наличии и ценах
    availability: {
      inStock: primaryOems.stock_total || 0,
      lead: primaryOems.lead_days || 0
    },
    pricing: [{
      qty: 1,
      price: primaryOems.price_min,
      currency: primaryOems.price_min_currency,
      price_rub: priceRub
    }],
    regions: primaryOems.regions || [],
    
    // Источники данных
    suppliers: [{
      name: "OEMsTrade",
      url: `https://www.oemstrade.com/search/${encodeURIComponent(mpn)}`,
      region: primaryOems.regions && primaryOems.regions.length > 0 ? primaryOems.regions[0] : "",
      availability: { inStock: primaryOems.stock_total || 0 },
      pricing: [{ qty: 1, price: primaryOems.price_min, currency: primaryOems.price_min_currency, price_rub: priceRub }]
    }]
  };

  log('info', 'Product data assembled', { mpn, hasData: !!product.title });
  res.json({ ok: true, product });
});

app.get("/",        (req,res)=> res.sendFile(path.join(PUB_DIR, "ui", "index.html")));
app.get("/product", (req,res)=> res.sendFile(path.join(PUB_DIR, "ui", "product.html")));

// --- Graceful shutdown ---
let server;

function shutdown(signal) {
  log('info', 'Received shutdown signal', { signal });
  
  if (server) {
    server.close((err) => {
      if (err) {
        log('error', 'Error during server shutdown', { error: err.message });
        process.exit(1);
      }
      log('info', 'Server closed gracefully');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// --- Server startup ---
const validation = validateStartup();
if (!validation.ok) {
  log('error', 'Startup validation failed', { error: validation.error });
  process.exit(1);
}

log('info', 'Starting server', { port: PORT, nodeVersion: process.version });

server = app.listen(PORT, (err) => {
  if (err) {
    log('error', 'Failed to start server', { error: err.message, port: PORT });
    process.exit(1);
  }
  
  log('info', 'Server started successfully', { 
    port: PORT, 
    url: `http://127.0.0.1:${PORT}/`,
    features: ['OEMsTrade', 'cheerio', 'throttle', 'proxy-hook']
  });
});

server.on('error', (err) => {
  log('error', 'Server error', { error: err.message, code: err.code });
  if (err.code === 'EADDRINUSE') {
    log('error', 'Port already in use', { port: PORT });
  }
  process.exit(1);
});