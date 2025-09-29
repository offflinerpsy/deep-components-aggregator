// adapters/providers/scrapingbee.mjs
import { ok, err } from "../../lib/result.mjs";

const ENDPOINT = "https://app.scrapingbee.com/api/v1";

export function buildURL({ key, url, opts }) {
  const q = new URLSearchParams();
  q.set("api_key", key || "");
  q.set("url", url);
  // Часто хватает дефолта; можно добавить wait / block_resources по надобности
  if (opts && opts.wait) q.set("wait", String(opts.wait));
  if (opts && opts.block_resources === false) q.set("block_resources", "false");
  return `${ENDPOINT}?${q.toString()}`;
}

export function fetchViaScrapingBee({ key, url, timeout = 10000, opts = {} }) {
  const apiURL = buildURL({ key, url, opts });
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), timeout);

  return fetch(apiURL, { signal: ctl.signal })
    .then(async (r) => {
      clearTimeout(to);
      const status = r.status;
      const html = await r.text();
      const bytes = Buffer.byteLength(html || "", "utf8");
      if (status >= 200 && status < 300 && bytes > 5120) {
        return ok({ html, status, bytes, apiURL, keyMasked: maskKey(key) });
      }
      return err("bad_status", `scrapingbee ${status}`, { apiURL, bytes, keyMasked: maskKey(key) });
    })
    .catch(() => {
      clearTimeout(to);
      return err("net", "scrapingbee fetch failed", { apiURL, keyMasked: maskKey(key) });
    });
}

const maskKey = (k) => (k ? `${k.slice(0, 2)}****${k.slice(-4)}` : "<none>");
