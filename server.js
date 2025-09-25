import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { orchestrateSearch, orchestrateProduct } from "./src/services/orchestrator.js";
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
let validate;
if (fs.existsSync(schemaPath)) {
  const ajv = new Ajv({ allErrors: false, strict: false });
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  validate = ajv.compile(schema);
  log('info', 'Schema loaded successfully', { schemaPath });
} else {
  log('error', 'Schema file not found, validation disabled', { schemaPath });
  validate = () => true; // Отключаем валидацию, если схема не найдена
}

const app = express();
app.use(express.json({ charset: 'utf-8' }));
app.use(express.static(PUB_DIR));

// Устанавливаем правильную кодировку только для API ответов
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.get("/_version", (req, res) => {
  res.json({ ok: true, name: "deep-agg-orchestrated", version: "0.1.0", ts: Date.now() });
});

app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) {
    res.json({ ok: true, source: "empty", count: 0, items: [] });
    return;
  }

  log('info', 'Search API request', { query: q });
  
  const result = await orchestrateSearch(q, 40);
  
  if (!result.ok) {
    log('error', 'Search orchestration failed', { query: q, code: result.code });
    res.status(500).json({ ok: false, error: result.code });
    return;
  }

  // Валидация через JSON Schema
  const validItems = [];
  for (const row of result.items) {
    if (validate(row)) {
      validItems.push(row);
    } else {
      log('warn', 'Search result validation failed', { mpn: row.mpn, errors: validate.errors });
    }
  }

  res.json({
    ok: true,
    source: result.source,
    count: validItems.length,
    items: validItems,
    rates_cached: result.rates_cached,
    duration: result.duration
  });
});

app.get("/api/product", async (req, res) => {
  const mpn = (req.query.mpn || "").trim();
  if (!mpn) {
    res.status(400).json({ ok: false, error: "mpn_required" });
    return;
  }

  log('info', 'Product API request', { mpn });

  const result = await orchestrateProduct(mpn);
  
  if (!result.ok) {
    log('error', 'Product orchestration failed', { mpn, code: result.code });
    res.status(500).json({ ok: false, error: result.code });
    return;
  }

  if (!result.product || !result.product.mpn) {
    log('warn', 'No product data found', { mpn });
    res.status(404).json({ ok: false, error: "product_not_found", mpn });
    return;
  }

  log('info', 'Product data assembled', { 
    mpn, 
    hasTitle: !!result.product.title,
    hasImages: result.product.images.length > 0,
    hasDatasheets: result.product.datasheets.length > 0,
    hasSpecs: Object.keys(result.product.technical_specs).length > 0,
    sourcesCount: result.product.sources.length
  });

  res.json({ 
    ok: true, 
    product: result.product,
    orchestration: result.product.orchestration
  });
});

app.get("/", (req, res) => res.sendFile(path.join(PUB_DIR, "ui", "index.html")));
app.get("/product", (req, res) => res.sendFile(path.join(PUB_DIR, "ui", "product.html")));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "not_found" });
});

// 500 handler (без исключений)
app.use((err, req, res, next) => {
  log('error', 'Server error', { error: err.message, stack: err.stack });
  res.status(500).json({ message: "internal_error" });
});

// --- Graceful shutdown ---
let server;

function shutdown(signal) {
  log('info', 'Received shutdown signal', { signal });

  if (server) {
    server.close((err) => {
      if (err) {
        log('error', 'Server close error', { error: err.message });
        process.exit(1);
      }
      log('info', 'Server closed successfully');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Server error handlers
process.on('uncaughtException', (err) => {
  log('error', 'Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', 'Unhandled rejection', { reason: String(reason) });
  process.exit(1);
});

// --- Start server ---
const startupResult = validateStartup();
if (!startupResult.ok) {
  log('error', 'Startup validation failed', { error: startupResult.error });
  process.exit(1);
}

server = app.listen(PORT, () => {
  log('info', 'Starting server', { port: PORT, nodeVersion: process.version });
  log('info', 'Server started successfully', { 
    port: PORT, 
    url: `http://127.0.0.1:${PORT}/`, 
    features: ["RU-orchestrator", "5-sources", "CBR-rates", "cheerio", "throttle", "proxy-hook"] 
  });
});

// Server-level error handling
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log('error', 'Port already in use', { port: PORT, code: err.code });
    process.exit(1);
  } else {
    log('error', 'Server error', { error: err.message, code: err.code });
    process.exit(1);
  }
});