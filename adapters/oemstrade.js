// adapters/oemstrade.js — парсер выдачи OEMsTrade (регионы/сток/минимальная цена)
import * as cheerio from "cheerio";
import { httpGet, politeDelay } from "../lib/net.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";
const HDRS = { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.8" };

// мягкие нормализаторы (никаких исключений)
function nz(v){ return v === undefined || v === null ? "" : String(v); }
function nnum(s){ const n = Number(String(s).replace(/[, ]+/g,"")); return Number.isFinite(n) ? n : 0; }

function parseBlockText(text, qUpper){
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 120) return null;

  const mEU = /Europe\s*-\s*([\d, ]+)/i.exec(t);
  const mUS = /Americas\s*-\s*([\d, ]+)/i.exec(t);
  const mAS = /Asia\s*-\s*([\d, ]+)/i.exec(t);

  const regions = [];
  let stock = 0;
  if (mEU){ const n = nnum(mEU[1]); if (n>0){ regions.push("EU"); stock += n; } }
  if (mUS){ const n = nnum(mUS[1]); if (n>0){ regions.push("US"); stock += n; } }
  if (mAS){ const n = nnum(mAS[1]); if (n>0){ regions.push("ASIA"); stock += n; } }

  if (regions.length === 0 && stock === 0) return null;

  // минимальная цена — находим в тексте ближайший прайс-тиер
  let min = Infinity, cur = "";
  const re = /(\d+)\s*([€$])\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(t))){
    const p = Number(m[3]);
    if (Number.isFinite(p) && p < min){ min = p; cur = m[2] === "€" ? "EUR" : "USD"; }
  }
  if (!Number.isFinite(min)) { min = 0; cur = ""; }

  // MPN — берём из текста якорь с буквенно-цифровым идентификатором
  let mpn = qUpper;
  const mh = /([A-Z0-9][A-Z0-9\-._]{2,})\s*(?:D#|RoHS|Min Qty|STMicroelectronics|onsemi|Texas|Container)/i.exec(t);
  if (mh && mh[1] && mh[1].length <= 40) mpn = mh[1].toUpperCase();

  return {
    mpn, title: "", manufacturer: "", description: "",
    package: "", packaging: "",
    regions, stock_total: stock, lead_days: 0,
    price_min: min, price_min_currency: cur, price_min_rub: 0,
    image: "/ui/placeholder.svg"
  };
}

export async function searchOEMsTrade(qUpper, maxItems = 40){
  const url = "https://www.oemstrade.com/search/" + encodeURIComponent(qUpper);
  await politeDelay(); // уважительный интервал перед запросом
  const r = await httpGet(url, HDRS, 12000);
  if (!r.ok || !r.text || r.text.length < 1000) return [];

  const $ = cheerio.load(r.text);
  // Режем по повторяющемуся маркеру кнопки — в выдаче OEMsTrade это "Buy Now"
  const chunks = $.text().split(/Buy Now/i);
  const out = [];
  for (let raw of chunks){
    const item = parseBlockText(nz(raw), qUpper);
    if (item) out.push(item);
    if (out.length >= maxItems) break;
  }

  // дедупликация по (mpn+regions) — на всякий случай
  const seen = new Set();
  return out.filter(x => {
    const key = x.mpn + "|" + x.regions.join(",");
    if (seen.has(key)) return false; seen.add(key); return true;
  });
}
