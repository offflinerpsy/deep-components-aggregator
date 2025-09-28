// src/scout/providers/elitan.mjs
import { canonItem } from "../schema.js";
import { load } from "cheerio";
import { abs, text, pickPrice, detectCurrency } from "../parse-helpers.mjs";

export const meta = { name: "elitan", base: "https://www.elitan.ru", js: true };

// Playwright-based fetcher with human-like viewport and user agent
async function fetchWithBrowser(url, browser) {
  if (!browser) return { ok: false, reason: "browser instance required" };
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    javaScriptEnabled: true,
    acceptDownloads: false,
    extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8'
    }
  });

  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // More robust waiting logic
    await Promise.race([
        page.waitForSelector('div.sl-item', { timeout: 15000 }),
        page.waitForSelector('div.p-header__title', { timeout: 15000 }),
        page.waitForSelector('.search-page__header', { timeout: 15000 }) // for "not found" pages
    ]).catch(() => console.warn(`Timeout waiting for primary content selectors on ${url}`));

    const html = await page.content();

    if (html.toLowerCase().includes('captcha')) {
        return { ok: false, reason: 'CAPTCHA detected on page' };
    }

    return { ok: true, html, $: load(html) };
  } catch (err) {
    return { ok: false, reason: err.message };
  } finally {
    await context.close();
  }
}


export async function search(q, browser) {
  const url = `${meta.base}/search?q=${encodeURIComponent(q)}`;
  const res = await fetchWithBrowser(url, browser);
  if (!res.ok) return { ok: false, reason: res.reason, items: [], raw: res };

  const { $ } = res;
  const links = [];
  $("div.sl-item a.sl-item__name").each((_, a) => {
    const href = $(a).attr("href");
    if (href) links.push(abs(meta.base, href));
  });

  return { ok: true, items: [...new Set(links)].slice(0, 5), html: res.html };
}

export async function product(url, browser) {
  const res = await fetchWithBrowser(url, browser);
  if (!res.ok) return { ok: false, url, item: null, raw: res };

  const { $ } = res;
  const title = $("h1.p-header__title").first().text().trim();
  const brand = $(".p-params-val a[href*='brand']").first().text().trim();
  const mpn = title.split(',')[0] || '';

  const priceStr = $("span.price-val").first().text().trim();
  const price = pickPrice(priceStr);
  const currency = "RUB";

  const availability = $("div.wh-total").text().trim();

  const item = canonItem({
    mpn, brand, title, url,
    offers: price ? [{ 
      dealer: "elitan", 
      url, 
      price, 
      currency, 
      availability, 
      region: "RU" 
    }] : []
  });

  return { ok: true, url, item, html: res.html };
}
