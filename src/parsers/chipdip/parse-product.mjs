// src/parsers/chipdip/parse-product.mjs
import * as cheerio from "cheerio";
import { ok, err } from "../../../lib/result.mjs";

export function parseProduct({ html, sourceUrl }) {
  const $ = cheerio.load(html);
  const title = $("h1").first().text().trim();
  if (!title) return err("no_title", "product title not found");

  const pdfs = [];
  $('a[href$=".pdf"]').each((_, a) => {
    const href = $(a).attr("href");
    if (href) pdfs.push(new URL(href, sourceUrl).toString());
  });

  const images = [];
  $("img").each((_, img) => {
    const src = $(img).attr("src");
    if (src && /\/images?\//.test(src)) images.push(new URL(src, sourceUrl).toString());
  });

  const specs = {};
  $("table, .specs, .characteristics").find("tr").each((_, tr) => {
    const k = $(tr).find("th,td").eq(0).text().trim();
    const v = $(tr).find("th,td").eq(1).text().trim();
    if (k && v) specs[k.toLowerCase()] = v;
  });

  const res = {
    title,
    mpn: pickMPN(title),
    brand: pickBrand(title, $("body").text()),
    description: $("meta[name='description']").attr("content") || $("p").first().text().trim(),
    specs,
    images: Array.from(new Set(images)).slice(0, 8),
    pdfs: Array.from(new Set(pdfs)).slice(0, 8),
    source: sourceUrl,
  };
  return ok(res);
}

function pickMPN(t) {
  const m = (t || "").match(/[A-Z0-9][A-Z0-9\-\._]{2,}/i);
  return m ? m[0].toUpperCase() : undefined;
}
function pickBrand(title, body) {
  const pool = (title + " " + body).toUpperCase();
  const marks = ["VISHAY","ST","MICROSEMI","ON","NXP","TI","INFINEON","TOSHIBA","ROHM","DIOTEC","EVERLIGHT","TAIWAN SEMICONDUCTOR"];
  return marks.find((m) => pool.includes(m)) || undefined;
}
