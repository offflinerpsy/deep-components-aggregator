# API Contract — R1 (UI⇆API Wiring)

Фактический контракт, подтверждён живыми запросами и артефактами из `docs/_artifacts/ui-wire-r1/`.

Колонки: method | path | query/body | 200 shape | headers | notes | artifacts

| method | path | query/body | 200 shape (ключи) | headers (ключевые) | notes | artifacts |
|---|---|---|---|---|---|---|
| GET | /api/health | probe?: boolean | status, version, ts, latency_ms, probe, proxy{trust,value}, sources{...}, currency{rates{USD,EUR},age_hours}, cache{...} | Content-Type: application/json | public | docs/_artifacts/ui-wire-r1/api-captures/health.txt |
| GET | /api/currency/rates | - | ok, timestamp, date, age_hours, rates{USD,EUR,GBP?}, source | application/json | public | docs/_artifacts/ui-wire-r1/api-captures/currency_rates.txt |
| GET | /api/metrics | - | Prometheus text (0.0.4) | Content-Type: text/plain; version=0.0.4; charset=utf-8 | public, text | docs/_artifacts/ui-wire-r1/api-captures/metrics.txt |
| GET | /api/vitrine/sections | - | ok, sections[] | application/json | cache-backed | docs/_artifacts/ui-wire-r1/api-captures/vitrine_sections.txt |
| GET | /api/vitrine/list | section?, q?, in_stock?, price_min?, price_max?, region?, sort?, limit? | ok, rows[], meta{cached,usedFts,queryNorm?,filters,total,totalBeforeLimit} | application/json | cache-backed (SQLite + FTS5, RU→EN) | docs/_artifacts/ui-wire-r1/api-captures/vitrine_list.txt |
| GET | /api/search | q: string, fresh?: '1' | ok, q, rows[], meta{source,total,cached,elapsed,providers[],currency{rates{USD,EUR},date,source},usedQueries?[]} | application/json | нормализация на стороне бэка отражается в meta.usedQueries | docs/_artifacts/ui-wire-r1/api-captures/search_LM317T.txt |
| GET | /api/autocomplete | q: string | suggestions[], meta{q,originalQuery,specsDetected,specs?,cached,latencyMs,providersHit} | application/json; Cache-Control: no-store | Поддерживает поиск по MPN и характеристикам (specs parsing). При specsDetected=true в meta.specs возвращается распарсенный объект {package,resistance,capacitance,voltage,tolerance,power,...}. Кэш: SQLite autocomplete_cache (TTL 1h). | docs/_artifacts/2025-11-05/specs-autocomplete/test1-0603-100k.json |
| GET | /api/live/search | q: string | SSE events: search:start, provider:partial|error, result, done; heartbeat `: ping` | Content-Type: text/event-stream; Cache-Control: no-cache; X-Accel-Buffering: no | события разделены `\n\n`; ошибки провайдеров — expected reality и отражены отдельными событиями | docs/_artifacts/ui-wire-r1/sse-proof/headers.txt, docs/_artifacts/ui-wire-r1/sse-proof/stream.txt |
| GET | /api/product | mpn | ok, product{mpn,manufacturer,title,description,images/datasheets?,technical_specs?,pricing?,availability?,regions?,package?,packaging?,vendorUrl,source}, meta{cached,sources?} | application/json | merged из Mouser/TME/Farnell/DigiKey | docs/_artifacts/ui-wire-r1/api-captures/product_LM317T.txt |

SSE — канон (подтверждено артефактами):
- Заголовки: `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no` (см. `docs/_artifacts/ui-wire-r1/sse-proof/headers.txt`).
- Формат: сообщения разделены двойным переводом строки `\n\n`, heartbeat-комментарии вида `: ping` (см. `docs/_artifacts/ui-wire-r1/sse-proof/stream.txt`).
- Антибуферизация: либо заголовок `X-Accel-Buffering: no` на ответе, либо `proxy_buffering off;` на SSE-location в nginx (иначе поток превращается в «ком» после таймаута).

Примечание по прокси/сети: в бэкенде включён Undici ProxyAgent и setGlobalDispatcher (унификация HTTP через прокси, вкл. встроенный fetch). Рекомендуемый инвариант окружения: `NO_PROXY=127.0.0.1,localhost`.

## R2 Final — Порты и процессы (Source of Truth)

- Backend (Express): 127.0.0.1:9201 — единый источник данных (не торчит наружу).
- Frontend (Next.js/v0): 127.0.0.1:3000 — единственный фронт. Любые dev-поднятия на 3001 — запрещены.
- Все клиентские вызовы — только через `/api/*` (Next.js rewrites). Прямых URL бэка в клиенте быть не должно.
- PM2 автозапуск: `pm2 start server.js --name deep-agg -- --port 9201 && pm2 save && pm2 startup`; фронт: `pm2 start "npm run start -- -p 3000" --name deep-v0 && pm2 save`.
- Глобальный HTTP-диспетчер: Undici `ProxyAgent` + `setGlobalDispatcher`; `NO_PROXY=127.0.0.1,localhost,::1`.

Документ «Server Source of Truth»: `docs/SERVER-SOURCE-OF-TRUTH.md`.

Происхождение: `server.js`, `api/*.mjs|js`, `src/api/*.mjs|js`. Живые ответы приложены в `docs/_artifacts/ui-wire-r1/`.
