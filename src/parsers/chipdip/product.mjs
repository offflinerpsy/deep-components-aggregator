import * as cheerio from 'cheerio';
import { normCanon } from '../../core/canon.mjs';

export function parseChipDipProduct(html, url) {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim();                 // AD637ARZ
  const brand = $('a[href*="/brand/"], .product__brand a').first().text().trim() || $('td:contains("Производитель")').next().text().trim();
  const sku   = $('td:contains("Номенклатурный номер")').next().text().trim() || (url.split('/').pop() || '').trim();
  const img   = $('img[src*="/images/"]').first().attr('src') || $('meta[property="og:image"]').attr('content') || '';
  const short = $('div:contains("Описание")').first().next().text().trim() || $('meta[name="description"]').attr('content') || '';
  // цены/наличие и регионы: берём «Сроки доставки» блок и «Цена в магазинах» → конверт в offers
  const offers = [];
  $('table:contains("Сроки доставки") tr').each((_, tr)=>{
    const tds = $(tr).find('td');
    if (tds.length >= 3) {
      const region = $(tds[0]).text().trim();           // Москва / ПВЗ / Курьер и т.д.
      const eta    = $(tds[1]).text().trim();
      const priceR = ($(tds[2]).text().match(/[\d\s]+р/)||[''])[0].replace(/\s+/g,'').replace('р',''); // руб
      if (region && priceR) offers.push({ region, currency: 'RUB', price: Number(priceR), stock: null, eta });
    }
  });
  const docs = [];
  $('a[href$=".pdf"]').each((_,a)=>docs.push({ url: new URL($(a).attr('href'), url).toString(), kind: 'pdf' }));

  const canon = normCanon({
    url, mpn: title, brand, title, sku,
    image: img ? new URL(img, url).toString() : null,
    desc_short: short,
    offers, docs,
    source: 'chipdip'
  });
  return canon;
}
