// src/parsers/chipdip/parse-listing.mjs
import * as cheerio from "cheerio";
import { ok, err } from "../../../lib/result.mjs";

const RUB_RE = /([\d\s]+)[\u00A0\s]*руб/i;
const QTY_RE = /(\d+)[\u00A0\s]*шт/i;

export function parseListing({ html, sourceUrl }) {
  const $ = cheerio.load(html);
  const out = [];
  // Ищем «карточки в списке»: ссылки на /product/ — опорная точка
  $('a[href^="/product/"]').each((_, a) => {
    const $a = $(a);
    const href = $a.attr("href");
    const row = $a.closest("div,li,tr,article"); // страхуемся
    const title = $a.text().trim() || row.find("h3,h2").first().text().trim();
    const img = row.find("img").first().attr("src") || "";
    const txt = row.text();

    const priceMatch = txt.match(RUB_RE);
    const qtyMatch = txt.match(QTY_RE);

    const priceRub = priceMatch ? Number(priceMatch[1].replace(/\s+/g, "")) : undefined;
    const qty = qtyMatch ? Number(qtyMatch[1]) : undefined;

    const item = {
      url: new URL(href, sourceUrl || "https://www.chipdip.ru").toString(),
      title,
      mpn: pickMPN(title),
      brand: guessBrand(title),
      image: img?.startsWith("http") ? img : img ? `https://www.chipdip.ru${img}` : undefined,
      description: clip(row.find("p, .desc, .description").first().text().trim(), 280),
      package: pickToken(title, ["SOD", "SOT", "DO", "TO", "QFN", "TSSOP", "SOIC"]),
      packaging: undefined,
      regions: undefined,
      stock: qty,
      price_min_rub: priceRub,
      source: "chipdip"
    };

    out.push(item);
  });

  if (out.length === 0) return err("empty", "no items parsed");
  return ok(out);
}

function clip(s, n) { return s && s.length > n ? s.slice(0, n - 1) + "…" : s; }
function pickToken(s, keys) {
  const m = (s || "").toUpperCase().match(/\b([A-Z0-9\-]+)\b/g) || [];
  return m.find((t) => keys.some((k) => t.includes(k)));
}
function guessBrand(s) {
  const up = (s || "").toUpperCase();
  const marks = ["VISHAY","ST","MICROSEMI","ON","NXP","TI","INFINEON","TOSHIBA","ROHM","DIOTEC","FAIRCHILD","EVERLIGHT"];
  return marks.find((m) => up.includes(m)) || undefined;
}
function pickMPN(t) {
  const m = (t || "").match(/[A-Z0-9][A-Z0-9\-\._]{2,}/i);
  return m ? m[0].toUpperCase() : undefined;
}
