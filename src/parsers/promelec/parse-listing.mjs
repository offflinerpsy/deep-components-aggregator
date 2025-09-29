import * as cheerio from 'cheerio';

const blank = s => (s || '').replace(/\s+/g,' ').trim();
const asNum = s => {
  const m = (s || '').replace(/\s/g,'').match(/[\d.,]+/);
  if (!m) return null;
  const n = Number(m[0].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function parseListing({ html, sourceUrl }) {
  const $ = cheerio.load(html);
  const items = [];

  // Универсальный захват карточек/строк в листинге:
  // 1) плитка товара
  $('.catalog__item, .product-card, .goods-list__item, .list__item').each((_, el) => {
    const root = $(el);
    const a = root.find('a[href*="/product/"], a[href*="/goods/"], a[href*="/catalog/"]').first();
    const url = a.attr('href') ? new URL(a.attr('href'), sourceUrl).toString() : null;
    const title = blank(a.text());
    const desc = blank(root.find('.product-card__descr, .goods-item__descr, .shortdesc, .desc').text());
    const priceLine = blank(root.find(':contains("Цена от")').text());
    const stockLine = blank(root.find(':contains("Наличие")').text());
    const minPriceRub = asNum(priceLine);
    const stock = asNum(stockLine);

    if (url && title) {
      // выдернем MPN как "самое длинное слово в TITLE" (эвристика), до карточек по MPN
      const mpn = (title.match(/[A-Z0-9\-_./]+/gi) || []).sort((a,b)=>b.length-a.length)[0] || '';
      items.push({
        source: 'promelec',
        url, title, mpn,
        manufacturer: '',
        description: desc,
        package: '',
        packaging: '',
        regions: ['RU'],
        stock,
        min_rub: minPriceRub
      });
    }
  });

  return { ok: true, data: items };
}

