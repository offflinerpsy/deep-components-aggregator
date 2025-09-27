import * as cheerio from 'cheerio';

export function chipdipHtmlToCanon(html, url) {
  const $ = cheerio.load(html);
  const pick = sel => ($(sel).attr("content") || $(sel).text() || "").trim();

  const title = pick("meta[property='og:title']") || $("h1").first().text().trim();
  const brand = pick("meta[itemprop='brand']") || pick("meta[property='product:brand']");
  const mpn   = pick("meta[itemprop='mpn']");
  const sku   = pick("meta[itemprop='sku']");
  const text  = [$("article").text(), $("#content").text()].join(" ").replace(/\s+/g," ").trim();

  return { id: url, url, title, brand, mpn, sku, text };
}
