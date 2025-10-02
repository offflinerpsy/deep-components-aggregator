// src/scout/providers/efind.mjs
import { canonItem } from "../schema.js";
import { fetchHtml } from "../http.mjs";
import { abs, pickPrice, detectCurrency } from "../parse-helpers.mjs";

export const meta = { name: "efind", base: "https://efind.ru" };

export async function search(q) {
  const url = `${meta.base}/?search=${encodeURIComponent(q)}`;
  const res = await fetchHtml(url);
  if (!res.ok) return { ok: false, reason: "http", items: [], raw: res };

  const { $ } = res;
  const items = [];

  $("tr[id^='r']").each((_, row) => {
    const $row = $(row);
    const title = $row.find("td:nth-child(1) > a").text().trim();
    const dealer = $row.find("td:nth-child(2) > a").text().trim();
    const priceStr = $row.find("td:nth-child(4)").text().trim();
    const availability = $row.find("td:nth-child(3)").text().trim();
    const itemUrl = $row.find("td:nth-child(1) > a").attr("href");

    const item = canonItem({
      mpn: title,
      title,
      url: abs(meta.base, itemUrl),
      offers: [{
        dealer,
        url: abs(meta.base, itemUrl),
        price: pickPrice(priceStr),
        currency: detectCurrency(priceStr) || 'RUB',
        availability,
        region: "RU",
      }]
    });
    items.push(item);
  });

  return { ok: true, items: items.slice(0, 10), html: res.html };
}

export async function product(url) {
  // efind is an aggregator, product details are on the dealer's site.
  // This function is a no-op for now.
  return { ok: true, url, item: canonItem({url}), html: `<html><body>Aggregator page, no product data on efind for ${url}</body></html>` };
}

