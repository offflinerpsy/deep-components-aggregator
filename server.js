import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT    = process.env.PORT ? Number(process.env.PORT) : 9201;
const DATA_DIR = path.join(__dirname, "data");
const PUB_DIR  = path.join(__dirname, "public");

function readJSON(fname) {
  const fp = path.join(DATA_DIR, fname);
  if (!fs.existsSync(fp)) return { ok: false, error: "not_found" };
  const txt = fs.readFileSync(fp, "utf-8");
  if (!txt || !txt.trim()) return { ok: false, error: "empty" };
  const value = JSON.parse(txt); // seed-файлы валидные
  return { ok: true, value };
}

const app = express();
app.use(express.json());
app.use(express.static(PUB_DIR)); // раздача /public, как рекомендует Express

app.get("/_version", (req, res) => {
  res.json({ ok: true, name: "deep-agg-alpha", version: "0.0.1", ts: Date.now() });
});

app.get("/api/search", (req, res) => {
  const q = (req.query.q || "").trim().toLowerCase();
  const idx = readJSON("seed-index.json");
  if (!idx.ok) { res.status(500).json({ ok:false, error:"no_seed_index" }); return; }
  const list = Array.isArray(idx.value) ? idx.value : [];
  const out = q ? list.filter(x => ((x.mpn + " " + (x.title||"") + " " + (x.manufacturer||"")).toLowerCase()).includes(q)) : list;
  res.json({ ok: true, count: out.length, items: out });
});

app.get("/api/product", (req, res) => {
  const mpn = (req.query.mpn || "").trim();
  if (!mpn) { res.status(400).json({ ok:false, error:"mpn_required" }); return; }
  const fname = "seed-" + mpn.replace(/[^A-Za-z0-9_.-]/g, "").toUpperCase() + ".json";
  const got = readJSON(fname);
  if (!got.ok) { res.status(404).json({ ok:false, error:"mpn_not_seeded", mpn }); return; }
  res.json({ ok: true, product: got.value });
});

app.get("/",        (req,res)=> res.sendFile(path.join(PUB_DIR, "ui", "index.html")));
app.get("/product", (req,res)=> res.sendFile(path.join(PUB_DIR, "ui", "product.html")));

app.listen(PORT, () => {
  console.log(`[deep-agg-alpha] http://127.0.0.1:${PORT}/`);
});
