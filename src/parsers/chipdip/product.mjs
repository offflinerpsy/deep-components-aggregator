import * as cheerio from 'cheerio';
import { normCanon } from '../../core/canon.mjs';
import crypto from 'node:crypto';

function hashName(u){ return crypto.createHash('sha1').update(u).digest('hex'); }

export function parseChipDipProduct(html, url) {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim();
  const brand = $('a[href*="/brand/"], .product__brand a').first().text().trim() || $('td:contains("Производитель")').next().text().trim();
  const sku   = $('td:contains("Номенклатурный номер")').next().text().trim() || (url.split('/').pop() || '').trim();
  const ogImg = $('meta[property="og:image"]').attr('content') || '';
  const imgEl = $('img[src*="/images/"]').first().attr('src') || '';
  const image = (ogImg || imgEl) ? new URL((ogImg||imgEl), url).toString() : '';
  const images = [];
  $('img').each((_,e)=>{
    const src = $(e).attr('src')||''; if (!src) return; const abs = new URL(src, url).toString(); images.push(abs);
  });
  const short = $('div:contains("Описание")').first().next().text().trim() || $('meta[name="description"]').attr('content') || '';

  const offers = [];
  let stockTotal = 0;
  $('table:contains("Сроки доставки") tr').each((_, tr)=>{
    const tds = $(tr).find('td');
    if (tds.length >= 3) {
      const region = $(tds[0]).text().trim();
      const eta    = $(tds[1]).text().trim();
      const priceR = ($(tds[2]).text().match(/[\d\s]+р/)||[''])[0].replace(/\s+/g,'').replace('р','');
      if (region && priceR) { offers.push({ region, currency: 'RUB', price: Number(priceR), stock: null, eta }); }
    }
  });
  // Тех. характеристики (dl/dt/dd or table)
  const specs = {};
  $('table, dl').first().find('tr, dt').each((_, el)=>{
    if (el.tagName === 'tr'){
      const tds = $(el).find('td'); if (tds.length>=2){ const k=$(tds[0]).text().trim(); const v=$(tds[1]).text().trim(); if(k) specs[k]=v; }
    } else {
      const k = $(el).text().trim(); const v = $(el).next('dd').text().trim(); if (k) specs[k]=v;
    }
  });
  // PDF документы
  const docs = [];
  $('a[href$=".pdf"]').each((_,a)=>{
    const href = $(a).attr('href'); if(!href) return;
    const abs = new URL(href, url).toString();
    const h = hashName(abs);
    docs.push({ title: $(a).text().trim()||'PDF', url: `/files/pdf/${h}.pdf`, _src: abs, _hash: h });
  });

  const canon = normCanon({
    url, mpn: title, brand, title, sku,
    image, images,
    desc_short: short,
    offers, docs,
    specs,
    stock_total: stockTotal,
    source: 'chipdip'
  });
  return canon;
}
