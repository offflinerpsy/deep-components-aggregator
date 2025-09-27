import { chromium } from "playwright"; // без try/catch — пусть падает, если не ок
const url = process.argv[2] || "http://127.0.0.1/";
const path = process.argv[3] || "/opt/deep-agg/_diag/last-home.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }});
await page.goto(url, { waitUntil: "networkidle" });
await page.screenshot({ path, fullPage: true });
await browser.close();
console.log(`Screenshot saved: ${path}`);
