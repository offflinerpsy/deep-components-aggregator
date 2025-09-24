import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { searchOEMsTrade } from "./adapters/oemstrade.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT     = process.env.PORT ? Number(process.env.PORT) : 9201;
const DATA_DIR = path.join(__dirname, "data");
const PUB_DIR  = path.join(__dirname, "public");

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
function toSearchRow(x) {
  const S = v => (v === undefined || v === null) ? "" : String(v).trim();
  const A = arr => Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];

  const regions = A(x.regions).filter(r => /^(EU|US|ASIA)$/i.test(r)).map(r => r.toUpperCase());
  const stock   = Number.isFinite(Number(x.stock_total)) ? Number(x.stock_total) : 0;
  const lead    = Number.isFinite(Number(x.lead_days))   ? Number(x.lead_days)   : 0;
  const priceR  = Number.isFinite(Number(x.price_min_rub)) ? Number(x.price_min_rub) : 0;

  return {
    mpn:        S(x.mpn).toUpperCase(),
    title:      S(x.title),
    manufacturer:S(x.manufacturer),
    description:S(x.description),
    package:    S(x.package),    // ТО-220, SOD-123 и т.п.
    packaging:  S(x.packaging),  // Tape/Tube/Reel
    regions,                   // только EU/US/ASIA
    stock_total: stock,        // число
    lead_days:  lead,          // дни
    price_min_rub: priceR,     // ₽ (пока 0 — позже сконвертируем)
    image: S(x.image) || "/ui/placeholder.svg"
  };
}

const app = express();
app.use(express.json());
app.use(express.static(PUB_DIR));

app.get("/_version", (req, res) => {
  res.json({ ok:true, name:"deep-agg-alpha", version:"0.0.3", ts:Date.now() });
});

app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) {
    const idx = readJSON("seed-index.json");
    const items = idx.ok ? idx.value.map(toSearchRow) : [];
    res.json({ ok:true, source:"seed", count: items.length, items });
    return;
  }
  const qUpper = q.toUpperCase();
  const raw = await searchOEMsTrade(qUpper, 40); // уже есть из task 04
  const items = (raw && raw.length ? raw : []).map(toSearchRow);

  if (!items.length) {
    const idx = readJSON("seed-index.json");
    const seedItems = idx.ok ? idx.value.filter(x => (x.mpn||"").toUpperCase().includes(qUpper)).map(toSearchRow) : [];
    res.json({ ok:true, source:"seed", count: seedItems.length, items: seedItems });
    return;
  }
  res.json({ ok:true, source:"oemstrade", count: items.length, items });
});

app.get("/api/product", (req, res) => {
  const mpn = (req.query.mpn || "").trim();
  if (!mpn) { res.status(400).json({ ok:false, error:"mpn_required" }); return; }
  const fname = "seed-" + mpn.replace(/[^A-Za-z0-9_.-]/g, "").toUpperCase() + ".json";
  const got = readJSON(fname);
  if (!got.ok) { res.status(404).json({ ok:false, error:"mpn_not_seeded", mpn }); return; }
  res.json({ ok:true, product: got.value });
});

app.get("/",        (req,res)=> res.sendFile(path.join(PUB_DIR, "ui", "index.html")));
app.get("/product", (req,res)=> res.sendFile(path.join(PUB_DIR, "ui", "product.html")));

app.listen(PORT, () => {
  console.log(`[deep-agg-alpha] http://127.0.0.1:${PORT}/  (search via OEMsTrade, cheerio+throttle+proxy hook)`);
});