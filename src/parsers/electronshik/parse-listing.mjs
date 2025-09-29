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

  // Часто у Электронщика листинги — таблицы или плитки.
  $('table tr, .catalog-item, .product-tile').each((_, el) => {
    const row = $(el);
    const a = row.find('a[href*="/product/"], a[href*="/catalog/"], a[href*="/item/"]').first();
    const url = a.attr('href') ? new URL(a.attr('href'), sourceUrl).toString() : null;
    const title = blank(a.text());
    const desc = blank(row.find('.description, .descr, .desc, .shortdesc').text());
    const brand = blank(row.find('.brand, .manufacturer, td:contains("Производитель") + td').text());
    const pkg = blank(row.find('.package, td:contains("Корпус") + td').text());
    const priceLine = blank(row.find(':contains("Цена"), :contains("цена")').first().text());
    const stockLine = blank(row.find(':contains("В наличии"), :contains("Наличие")').first().text());
    const minPriceRub = asNum(priceLine);
    const stock = asNum(stockLine);

    if (url && title) {
      const mpn = (title.match(/[A-Z0-9\-_./]+/gi) || []).sort((a,b)=>b.length-a.length)[0] || '';
      items.push({
        source: 'electronshik',
        url, title, mpn,
        manufacturer: brand,
        description: desc,
        package: pkg,
        packaging: '',
        regions: ['RU'],
        stock,
        min_rub: minPriceRub
      });
    }
  });

  return { ok: true, data: items };
}
