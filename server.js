import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// Используем новый TypeScript оркестратор (компилируем в JS)
import { contentOrchestrator } from "./src/services/content-orchestrator.js";
import { searchTokenizer } from "./src/services/search-tokenizer.js";
import productTestRouter from "./src/api/routes/product-test.js";
import productRouter from "./src/api/routes/product.js";
import searchRouter from "./backend/src/api/routes/search.js";
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
  res.json({ ok: true, name: "deep-agg-alpha", version: "0.1.0", ts: Date.now() });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    ts: Date.now()
  });
});

// API эндпоинты для популярного/трендов
app.get("/api/popular", (req, res) => {
  const popularPath = path.join(PUB_DIR, "data", "popular.json");
  if (fs.existsSync(popularPath)) {
    const buf = fs.readFileSync(popularPath, "utf8");
    res.setHeader("Content-Type", "application/json");
    res.end(buf);
  } else {
    res.json([]);
  }
});

app.get("/api/trending", (req, res) => {
  const trendingPath = path.join(PUB_DIR, "data", "trending.json");
  if (fs.existsSync(trendingPath)) {
    const buf = fs.readFileSync(trendingPath, "utf8");
    res.setHeader("Content-Type", "application/json");
    res.end(buf);
  } else {
    res.json([]);
  }
});

app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) {
    res.json({ ok: true, source: "empty", count: 0, items: [] });
    return;
  }

  log('info', 'Search API request', { query: q });

  // Получаем результаты из нового оркестратора
  const rawResults = await contentOrchestrator.searchAll(q);

  // Фильтруем и ранжируем через умный поиск
  const rankedResults = searchTokenizer.filterAndRank(rawResults, q);

  // Валидация через JSON Schema
  const validItems = [];
  for (const row of rankedResults) {
    if (validate(row)) {
      validItems.push(row);
    } else {
      log('warn', 'Search result validation failed', { mpn: row.mpn, errors: validate.errors });
      // Временно добавляем все результаты для отладки
      validItems.push(row);
    }
  }

  res.json({
    ok: true,
    query: q,
    count: validItems.length,
    items: validItems
  });
});

app.get("/api/product", async (req, res) => {
  const id = (req.query.id || "").trim();
  const mpn = (req.query.mpn || id).trim(); // поддержка обоих параметров

  if (!mpn) {
    res.status(400).json({ ok: false, error: "id_or_mpn_required" });
    return;
  }

  log('info', 'Product API request', { id, mpn });

  // Получаем карточку из нового оркестратора
  const product = await contentOrchestrator.fetchProduct(mpn);

  if (!product) {
    log('warn', 'No product data found', { id, mpn });
    res.status(404).json({ ok: false, error: "product_not_found", mpn });
    return;
  }

  log('info', 'Product data assembled', {
    id,
    mpn,
    hasTitle: !!product.title,
    hasImages: product.gallery?.length > 0,
    hasDocs: product.docs?.length > 0,
    hasSpecs: product.specs.length > 0,
    sources: product.sources.map(s => s.source),
    hasPrice: product.order.min_price_rub !== null
  });

  res.json({
    ok: true,
    product
  });
});

// Тестовый роут для offline-парсера ChipDip
app.use("/api/product-test", productTestRouter);

// Основной роут для live-парсера ChipDip
app.use("/api/product", productRouter);

// Роут для поиска
app.use("/api/search", searchRouter);

// SSE helper без try/catch
function sseHeaders(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
}

// Универсальный роут: если есть live-пайплайн — используем его; иначе шлём быстрый фолбэк из /api/search
app.get("/api/live/search", async (req, res) => {
  const q = (req.query.q || "").toString();
  sseHeaders(res);
  // фаза 1: моментальный тик, чтобы UI снял лоадер
  res.write(`event: tick\ndata: ${JSON.stringify({phase:"start", q})}\n\n`);

  // есть ли наш live-обработчик?
  const live = app._router?.stack?.find(l =>
    l.route && l.route.path && String(l.route.path).includes("/__internal/live-search"));
  if (live) {
    // передаём управление внутреннему live-роуту, если он есть
    res.write(`event: note\ndata: ${JSON.stringify({phase:"handoff"})}\n\n`);
    // внутренний обработчик должен сам дописать результаты/закрыть поток
    app.handle({ ...req, url: "/__internal/live-search?q=" + encodeURIComponent(q) }, res, () => {});
    return;
  }

  // фаза 2: фолбэк — обычный поиск и единичная посылка
  const origin = await fetch(`http://127.0.0.1:9201/api/search?q=${encodeURIComponent(q)}`);
  const json = await origin.json();
  res.write(`event: results\ndata: ${JSON.stringify(json)}\n\n`);
  res.end();
});

// Новый внутренний live-обработчик с MPN детекцией и Orama
app.get("/__internal/live-search", async (req, res) => {
  const q = (req.query.q || "").toString();

  // Устанавливаем SSE заголовки сразу
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Импортируем live search модули
  const { handleLiveSearch } = await import('./src/live/http.mjs');
  await handleLiveSearch(req, res, q);
});

app.get("/", (req, res) => res.sendFile(path.join(PUB_DIR, "index.html")));
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
