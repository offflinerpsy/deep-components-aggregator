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

const app = express();
app.use(express.json());
app.use(express.static(PUB_DIR));

app.get("/_version", (req, res) => {
  res.json({ ok:true, name:"deep-agg-alpha", version:"0.0.3", ts:Date.now() });
});

app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q){
    const idx = readJSON("seed-index.json");
    res.json(idx.ok ? { ok:true, source:"seed", count: idx.value.length, items: idx.value } : { ok:false, error:"no_seed_index" });
    return;
  }
  const qUpper = q.toUpperCase();
  const items = await searchOEMsTrade(qUpper, 40);
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
  console.log(`[deep-agg-alpha] http://127.0.0.1:${PORT}/  (search via OEMsTrade, cheerio+throttle+proxy hook)`);
});