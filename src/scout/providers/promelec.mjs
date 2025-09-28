// src/scout/providers/promelec.mjs
import { canonItem } from "../schema.js";
import { fetch } from "undici";
import { abs } from "../parse-helpers.mjs";
import "../http.mjs"; // This ensures the global dispatcher with proxy is set

export const meta = { name: "promelec", base: "https://www.promelec.ru" };

async function apiRequest(payload) {
    const url = 'https://api.promelec.ru/v2';
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    };
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            return { ok: false, reason: `API request failed with status ${res.status}` };
        }
        const json = await res.json();
        return { ok: true, data: json };
    } catch (e) {
        return { ok: false, reason: e.message };
    }
}

export async function search(q) {
    const payload = {
        "method": "frontend.search.get",
        "params": { "query": q, "limit": 10 }
    };
    const res = await apiRequest(payload);
    if (!res.ok || !res.data.result || !res.data.result.products) {
        return { ok: false, reason: res.reason || "Invalid API response structure", items: [] };
    }

    const items = res.data.result.products.map(p => {
        const productUrl = abs(meta.base, `/product/${p.id}/`);
        return canonItem({
            mpn: p.partnumber,
            brand: p.vendor,
            title: p.name,
            image: p.photo_url_medium,
            url: productUrl,
            offers: [{
                dealer: "promelec",
                url: productUrl,
                price: p.price_val,
                currency: "RUB",
                availability: p.in_stock_int > 0 ? `${p.in_stock_int} in stock` : "0",
                region: "RU"
            }]
        });
    });
    
    return { ok: true, items };
}


// The product function is no longer needed as search provides all key data.
// We keep it as a no-op to maintain the interface.
export async function product(url) {
  return { ok: true, url, item: canonItem({url}) };
}
