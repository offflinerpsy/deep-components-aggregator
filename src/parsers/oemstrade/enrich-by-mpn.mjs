import * as cheerio from 'cheerio';

const HOST = 'https://www.oemstrade.com';

// OEMsTrade поддерживает поиск по частичному/полномy MPN через /search/<query>.
export function buildSearchUrl(mpn) {
  return `${HOST}/search/${encodeURIComponent(mpn)}`;
}

export function parseOemsTrade({ html }) {
  const $ = cheerio.load(html);
  const offers = [];
  // Гибкий парс: ищем строки прайс-листа с ценой/валютой/минимумом и поставщиком.
  $('table tr').each((_, tr) => {
    const t = $(tr).text().replace(/\s+/g,' ').trim();
    if (!t) return;
    const price = (t.match(/(\d+[.,]?\d*)\s*(USD|EUR|RUB)/i) || [])[0] || '';
    const cur = (price.match(/(USD|EUR|RUB)/i) || [])[0] || '';
    const pnum = Number((price.match(/[\d.,]+/) || [''])[0].replace(',', '.'));
    if (!pnum || !cur) return;
    const qty = Number((t.match(/Qty[:\s]+(\d[\d\s]*)/i) || [])[1]?.replace(/\s/g,'') || 0) || null;
    offers.push({ price: pnum, currency: cur.toUpperCase(), minQty: qty });
  });
  return { ok: true, data: offers };
}
