// backend/api/live-search.mjs
import { open, note, warn, enrich, tick, done } from "../../lib/sse.mjs";
import { makeRotator } from "../../lib/rotator.mjs";
import { ok, isOk } from "../../lib/result.mjs";
import { buildTargets } from "../../src/targets/chipdip.mjs";
import { fetchViaScraperAPI } from "../../adapters/providers/scraperapi.mjs";
import { fetchViaScrapingBee } from "../../adapters/providers/scrapingbee.mjs";
import { fetchDirect } from "../../adapters/providers/direct.mjs";
import { parseListing } from "../../src/parsers/chipdip/parse-listing.mjs";
import { parseProduct } from "../../src/parsers/chipdip/parse-product.mjs";
import { PROVIDER_CONFIG } from "../../config/providers.mjs";

const TOUT = PROVIDER_CONFIG.PROVIDER_TIMEOUT_MS;

export default function liveSearchRoute(app) {
  app.get("/api/live/search", (req, res) => {
    const q = String(req.query.q || "").trim();
    open(res);

    if (!q) {
      warn(res, { reason: "empty_query" });
      return done(res);
    }

    const targets = buildTargets(q);
    const providers = makeRotator([
      { name: "scraperapi", fn: (t) => fetchViaScraperAPI({ key: PROVIDER_CONFIG.SCRAPERAPI_KEY, url: t, timeout: TOUT }) },
      { name: "scrapingbee", fn: (t) => fetchViaScrapingBee({ key: pickBeeKey(), url: t, timeout: TOUT }) },
      { name: "direct", fn: (t) => fetchDirect({ url: t, timeout: TOUT }) },
    ]);

    let sent = 0;
    let timer = setInterval(() => tick(res), 12000);

    run()
      .then(() => {
        clearInterval(timer);
        done(res);
      });

    function run() {
      // пытаемся сначала листинг, потом карточку (или наоборот — без разницы, т.к. targets уже упорядочены)
      return seq(targets, async (target) => {
        note(res, { target });
        const got = await raceProviders(target);
        if (!got) return false;

        const parsed = target.includes("/product/")
          ? parseProduct({ html: got.html, sourceUrl: target })
          : parseListing({ html: got.html, sourceUrl: target });

        if (isOk(parsed)) {
          enrich(res, parsed.data);
          sent += 1;
          return true; // достаточно одного успешного источника
        } else {
          warn(res, { target, reason: parsed.reason || parsed.code });
          return false;
        }
      }).then((any) => any);
    }

    function raceProviders(target) {
      const list = providers.nextUsable();
      if (list.length === 0) {
        warn(res, { reason: "no_providers_available" });
        return Promise.resolve(null);
      }
      // последовательно, чтобы не жечь кредиты
      return seq(list, async (p) => {
        note(res, { provider: p.name });
        const r = await p.fn(target);
        if (isOk(r)) {
          providers.markOk(p.name);
          return r.data;
        } else {
          providers.markFail(p.name);
          warn(res, { provider: p.name, reason: r.reason || r.code });
          return null;
        }
      });
    }
  });
}

function pickBeeKey() {
  const keys = PROVIDER_CONFIG.SCRAPINGBEE_KEYS;
  if (keys.length === 0) return "";
  const i = Math.floor(Math.random() * keys.length);
  return keys[i];
}

function seq(items, worker) {
  let i = 0;
  function step() {
    if (i >= items.length) return Promise.resolve(false);
    const it = items[i++];
    return Promise.resolve(worker(it)).then((ok) => (ok ? true : step()));
  }
  return step();
}
