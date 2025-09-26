import { chromium } from '@playwright/test';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122 Safari/537.36';

export async function renderHtml(url, { timeoutMs = 20000, lang = 'ru-RU,ru;q=0.9,en;q=0.8' } = {}) {
  if (!url || typeof url !== 'string') return { ok: false, error: 'bad_url' };
  const launch = await chromium.launch({ headless: true });
  const ctx = await launch.newContext({
    userAgent: UA,
    locale: 'ru-RU',
    extraHTTPHeaders: { 'Accept-Language': lang },
  });
  const page = await ctx.newPage();
  const start = Date.now();
  const goto = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  const okNav = !!goto && goto.ok();
  if (!okNav) { await ctx.close(); await launch.close(); return { ok: false, error: 'nav_fail', status: goto ? goto.status() : 0 }; }
  await page.waitForTimeout(300);
  const html = await page.content();
  const ms = Date.now() - start;
  await ctx.close(); await launch.close();
  return (html && html.length > 512) ? { ok: true, html, ms } : { ok: false, error: 'empty_html', ms };
}
