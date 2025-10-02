// adapters/providers/direct.mjs
import { ok, err } from "../../lib/result.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

export function fetchDirect({ url, timeout = 10000 }) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), timeout);

  const headers = {
    "User-Agent": UA,
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    Accept: "text/html,application/xhtml+xml",
  };

  return fetch(url, { signal: ctl.signal, headers })
    .then(async (r) => {
      clearTimeout(to);
      const status = r.status;
      const html = await r.text();
      const bytes = Buffer.byteLength(html || "", "utf8");
      if (status >= 200 && status < 300 && bytes > 5120) {
        return ok({ html, status, bytes, apiURL: url });
      }
      return err("bad_status", `direct ${status}`, { apiURL: url, bytes });
    })
    .catch(() => {
      clearTimeout(to);
      return err("net", "direct fetch failed", { apiURL: url });
    });
}
