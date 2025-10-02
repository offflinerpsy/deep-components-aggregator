import { chromium } from "playwright";

export async function snapSearch(url, {limit=10} = {}) {
  const browser = await chromium.launch({
    args: process.env.HTTP_PROXY ? [`--proxy-server=${process.env.HTTP_PROXY}`] : []
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 });

  const urls = await page.$$eval("a[href*='/product/'], a[href*='/catalog/']", as =>
    Array.from(new Set(as.map(a => a.getAttribute("href"))))
      .filter(Boolean)
      .map(h => (h.startsWith("http") ? h : `https://www.chipdip.ru${h}`))
      .slice(0, limit)
  );

  await browser.close();
  return urls;
}
