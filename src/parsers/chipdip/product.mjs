import * as cheerio from 'cheerio';

export const toCanon = (html, url) => {
  const $ = cheerio.load(html);
  const mpn = $('meta[itemprop="mpn"]').attr('content') || $('meta[property="product:retailer_item_id"]').attr('content') || '';
  const brand = $('meta[itemprop="brand"]').attr('content') || $('a[href*="/catalog/producer/"]').first().text().trim() || '';
  const title = $('h1').first().text().trim();
  const description = $('meta[name="description"]').attr('content') || $('p, .description').first().text().trim() || '';
  const image = $('meta[property="og:image"]').attr('content') || $('img[itemprop="image"]').attr('src') || '';
  const datasheets = $('a[href$=".pdf"]').map((_,a)=> new URL($(a).attr('href'), url).toString()).get().slice(0,4);

  // регион/наличие/цена: грубые эвристики (на старте)
  const stockTxt = $('[class*="stock"], [data-stock]').first().text().replace(/\D+/g,'') || '0';
  const stock = Number(stockTxt)||0;

  return {
    mpn: mpn || title.split(/\s+/)[0], brand, title,
    description, package: '', image_url: image,
    datasheet_urls: datasheets,
    offers: [{
      region: 'RU', stock, price_min_rub: null,
      source: 'chipdip', url
    }]
  };
};