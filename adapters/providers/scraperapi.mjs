// adapters/providers/scraperapi.mjs
import { createHash } from "node:crypto";
import { ok, err } from "../../lib/result.mjs";

const ENDPOINT = "https://api.scraperapi.com";

const enc = (s) => encodeURIComponent(s);
const mask = (k) => (k ? `${k.slice(0, 2)}****${k.slice(-4)}` : "<none>");

export function buildURL({ key, url, opts }) {
  const q = new URLSearchParams();
  q.set("api_key", key || "");
  q.set("url", url);
  if (opts && opts.render === true) q.set("render", "true");
  if (opts && opts.country_code) q.set("country_code", opts.country_code);
  return `${ENDPOINT}?${q.toString()}`;
}

export function fetchViaScraperAPI({ key, url, timeout = 10000, opts = {} }) {
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
        return ok({ html, status, bytes, apiURL, keyMasked: mask(key) });
      }
      return err("bad_status", `scraperapi ${status}`, { apiURL, bytes, keyMasked: mask(key) });
    })
    .catch(() => {
      clearTimeout(to);
      return err("net", "scraperapi fetch failed", { apiURL, keyMasked: mask(key) });
    });
}
