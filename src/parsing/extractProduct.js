import * as cheerio from 'cheerio';
import { renderHtml } from '../net/render/playwrightEngine.js';

function parseJsonLd(html) {
  const $ = cheerio.load(html);
  const nodes = $('script[type="application/ld+json"]').toArray();
  let best = null;
  for (const n of nodes) {
    const txt = $(n).contents().text();
    if (!txt || txt.length < 10) continue;
    const json = JSON.parse(txt);
    const list = Array.isArray(json) ? json : [json];
    for (const item of list) {
      const type = item['@type'] || item['@graph']?.[0]?.['@type'];
      const isProduct = (t) => (typeof t === 'string' && t.toLowerCase() === 'product') ||
        (Array.isArray(t) && t.map(x => String(x).toLowerCase()).includes('product'));
      if (type && isProduct(type)) best = best || item;
    }
  }
  if (!best) return null;
  const images = [].concat(best.image || []).flat().map(String).filter(u => u.startsWith('http'));
  const offers = best.offers && (Array.isArray(best.offers) ? best.offers[0] : best.offers);
  return {
    title: String(best.name || ''),
    manufacturer: String(best.brand?.name || best.brand || ''),
    description: String(best.description || ''),
    images,
    pdfs: [],
    price: offers && offers.price ? Number(offers.price) : null,
    currency: offers && offers.priceCurrency ? String(offers.priceCurrency) : null,
  };
}

function parseDom(html) {
  const $ = cheerio.load(html);
  const text = (sel) => { const t = $(sel).first().text().trim(); return t || ''; };
  const abs = (u) => (u && u.startsWith('http')) ? u : '';
  const title = text('h1,[itemprop="name"], .product-title, .card-title');
  const description = text('[itemprop="description"], .product-description, .desc, #description');
  const images = $('img[src]').toArray().map(n => abs($(n).attr('src'))).filter(u => u && !u.endsWith('.svg'));
  const pdfs = $('a[href$=".pdf"]').toArray().map(n => abs($(n).attr('href')));
  const specs = [];
  $('table, .specs, .characteristics').find('tr').each((_, tr) => {
    const k = $(tr).find('th, td').eq(0).text().trim();
    const v = $(tr).find('td').eq(1).text().trim();
    if (k && v) specs.push({ name: k, value: v });
  });
  return { title, description, images, pdfs, specs };
}

export async function extractProductHtmlFirst(url, html, { minFields = 3, allowRender = true } = {}) {
  if (typeof html !== 'string' || html.length < 200) return { ok: false, error: 'bad_html' };
  const j = parseJsonLd(html);           // schema.org/Product первее всего
  const d = parseDom(html);              // затем статический DOM (Cheerio)
  let merged = {
    title: d.title || (j?.title || ''),
    description: d.description || (j?.description || ''),
    images: (d.images?.length ? d.images : (j?.images || [])),
    pdfs: d.pdfs || [],
    specs: d.specs || [],
    price: j?.price ?? null,
    currency: j?.currency ?? null,
  };
  const fullness = (merged.title ? 1 : 0) + (merged.images?.length ? 1 : 0) + (merged.pdfs?.length ? 1 : 0) + (merged.specs?.length >= 3 ? 1 : 0);
  if (fullness >= minFields || !allowRender) return { ok: true, data: merged, source: 'static' };

  const rendered = await renderHtml(url, {});
  if (!rendered.ok) return { ok: false, error: 'render_fail' };
  const d2 = parseDom(rendered.html);
  const j2 = parseJsonLd(rendered.html) || {};
  merged = {
    title: d2.title || (j2.title || merged.title),
    description: d2.description || (j2.description || merged.description),
    images: (d2.images?.length ? d2.images : (j2.images || merged.images || [])),
    pdfs: d2.pdfs?.length ? d2.pdfs : merged.pdfs,
    specs: d2.specs?.length ? d2.specs : merged.specs,
    price: j2.price ?? merged.price,
    currency: j2.currency ?? merged.price,
  };
  const ok = (merged.title && (merged.images?.length || merged.pdfs?.length || (merged.specs?.length >= 3)));
  return ok ? { ok: true, data: merged, source: 'render' } : { ok: false, error: 'insufficient_fields' };
}
