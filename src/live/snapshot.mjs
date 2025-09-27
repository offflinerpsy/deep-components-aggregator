import { chromium } from 'playwright';
import { currentProxy } from '../net/proxy.mjs';
import { chipdipHtmlToCanon } from '../parsers/chipdip/html-to-canon.js';

const HEADLESS = (process.env.HEADLESS || '1') !== '0';

function launchOpts(){
  const p = currentProxy();
  return p ? { headless: HEADLESS, proxy: { server: p.server, username: p.username, password: p.password } }
           : { headless: HEADLESS };
}

export async function snapAndParse(url){
  const browser = await chromium.launch(launchOpts());
  const ctx = await browser.newContext({
    locale: 'ru-RU',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123 Safari/537.36'
  });
  const page = await ctx.newPage();
  const t0 = Date.now();

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1', { state: 'visible' });
  await page.waitForLoadState('networkidle');           // финальный DOM
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  await browser.close();

  const canon = chipdipHtmlToCanon(html, url);
  return { canon, ms: Date.now() - t0 };
}
