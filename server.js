import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT     = process.env.PORT ? Number(process.env.PORT) : 9201;
const DATA_DIR = path.join(__dirname, "data");
const PUB_DIR  = path.join(__dirname, "public");

// ===== helpers (без try/catch) =====
function readJSON(fname){
  const fp = path.join(DATA_DIR, fname);
  if (!fs.existsSync(fp)) return { ok:false, error:"not_found" };
  const txt = fs.readFileSync(fp, "utf-8");
  if (!txt || !txt.trim()) return { ok:false, error:"empty" };
  const value = JSON.parse(txt); // seed гарантированно валиден
  return { ok:true, value };
}

function fmtNumber(s){
  if (!s) return 0;
  const n = Number(String(s).replace(/[, ]+/g,""));
  return Number.isFinite(n) ? n : 0;
}

// fetch с таймаутом и без исключений
async function fetchText(url, headers={}, timeoutMs=12000){
  const ctl = new AbortController();
  const t = setTimeout(()=>ctl.abort(), timeoutMs);
  return fetch(url, { headers, signal: ctl.signal })
    .then(r => r.ok ? r.text().then(txt => ({ ok:true, status:r.status, text:txt })) : ({ ok:false, status:r.status }))
    .catch(() => ({ ok:false, status:0 }))
    .finally(() => clearTimeout(t));
}

// ===== OEMsTrade adapter (листинг → регионы/сток/минимальная цена) =====
// Страница действительно содержит блоки с "Europe - 61199", "Americas - 30815", прайс-тииры "1 $0.6980, 10 $0.5160" и т.п.
function parseOEMsOffers(html, qUpper){
  if (!html || html.length < 1000) return [];
  const blocks = html.split(/Buy Now/i); // грубое разбиение по блокам предложений
  const out = [];

  for (let raw of blocks){
    const text = raw.replace(/\s+/g," ").trim();
    if (text.length < 200) continue;

    // регионы + сток
    const europe   = /Europe\s*-\s*([\d, ]+)/i.exec(text);
    const americas = /Americas\s*-\s*([\d, ]+)/i.exec(text);
    const asia     = /Asia\s*-\s*([\d, ]+)/i.exec(text);

    const regions = [];
    let stockTotal = 0;
    if (europe){ const n=fmtNumber(europe[1]); if(n>0){ regions.push("EU"); stockTotal += n; } }
    if (americas){ const n=fmtNumber(americas[1]); if(n>0){ regions.push("US"); stockTotal += n; } }
    if (asia){ const n=fmtNumber(asia[1]); if(n>0){ regions.push("ASIA"); stockTotal += n; } }

    if (regions.length === 0 && stockTotal === 0){
      // иногда сток может отсутствовать, но есть lead — пропускаем такие блоки для выдачи
      continue;
    }

    // минимальная цена: USD/EUR
    let min = Infinity, currency = "";
    const priceRe = /(\d+)\s*[€$]\s*([\d.]+)/g;
    let m;
    while ((m = priceRe.exec(text))){
      const p = Number(m[2]);
      if (Number.isFinite(p) && p < min){ min = p; currency = text.slice(m.index, m.index+10).includes("€") ? "EUR" : "USD"; }
    }
    if (!Number.isFinite(min)) min = 0;

    // MPN/заголовок (если найдём), иначе — сам запрос
    let mpn = qUpper;
    const mpnHit = /([A-Z0-9][A-Z0-9\-._]{2,})\s*(?:D#|RoHS|Min Qty|STMicroelectronics|onsemi|Texas|Container)/i.exec(text);
    if (mpnHit && mpnHit[1] && mpnHit[1].length <= 40) mpn = mpnHit[1].toUpperCase();

    out.push({
      mpn,
      title: "",
      manufacturer: "",
      description: "",
      package: "",
      packaging: "",
      regions,
      stock_total: stockTotal,
      lead_days: 0,
      // сюда пока кладём как «минимальную»; конверсию в ₽ подключим отдельным шагом
      price_min_rub: 0,
      price_min: min,
      price_min_currency: currency,
      image: "/ui/placeholder.svg"
    });

    if (out.length >= 40) break;
  }

  return out;
}

// ===== app =====
const app = express();
app.use(express.json());
app.use(express.static(PUB_DIR));

app.get("/_version", (req, res) => {
  res.json({ ok:true, name:"deep-agg-alpha", version:"0.0.2", ts:Date.now() });
});

// /api/search: если есть q → OEMsTrade; иначе seed
app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q){
    const idx = readJSON("seed-index.json");
    res.json(idx.ok ? { ok:true, count: idx.value.length, items: idx.value } : { ok:false, error:"no_seed_index" });
    return;
  }

  const qUpper = q.toUpperCase();
  const url = "https://www.oemstrade.com/search/" + encodeURIComponent(qUpper);
  const r = await fetchText(url, {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.8"
  }, 12000);

  if (!r.ok){
    // мягкий фолбэк: seed, чтобы UI не пустел
    const idx = readJSON("seed-index.json");
    const items = idx.ok ? idx.value.filter(x => (x.mpn||"").toUpperCase().includes(qUpper)) : [];
    res.json({ ok:true, source:"seed", count: items.length, items });
    return;
  }

  const items = parseOEMsOffers(r.text, qUpper);
  // Если OEMsTrade не дал ничего — возвращаем seed-фильтр
  if (!items.length){
    const idx = readJSON("seed-index.json");
    const seedItems = idx.ok ? idx.value.filter(x => (x.mpn||"").toUpperCase().includes(qUpper)) : [];
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
  console.log(`[deep-agg-alpha] http://127.0.0.1:${PORT}/  (source: OEMsTrade for /api/search?q=...)`);
});