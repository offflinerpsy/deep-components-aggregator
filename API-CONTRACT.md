# API Contract — R1 (UI⇆API Wiring)

Фактический контракт, подтверждён живыми запросами и артефактами из `docs/_artifacts/ui-wire-r1/`.

Колонки: method | path | query/body | 200 shape | headers | notes | artifacts

| method | path | query/body | 200 shape (ключи) | headers (ключевые) | notes | artifacts |
|---|---|---|---|---|---|---|
| GET | /api/health | probe?: boolean | status, version, ts, latency_ms, probe, proxy{trust,value}, sources{...}, currency{rates{USD,EUR},age_hours}, cache{...} | Content-Type: application/json | public | docs/_artifacts/ui-wire-r1/api-captures/health.txt |
| GET | /api/currency/rates | - | ok, timestamp, date, age_hours, rates{USD,EUR,GBP?}, source | application/json | public | docs/_artifacts/ui-wire-r1/api-captures/currency_rates.txt |
| GET | /api/metrics | - | Prometheus text (0.0.4) | Content-Type: text/plain; version=0.0.4; charset=utf-8 | public, text | docs/_artifacts/ui-wire-r1/api-captures/metrics.txt |
| GET | /api/vitrine/sections | - | ok, sections[] | application/json | cache-backed | docs/_artifacts/ui-wire-r1/api-captures/vitrine_sections.txt |
| GET | /api/vitrine/list | section? | ok, items[] | application/json | cache-backed | docs/_artifacts/ui-wire-r1/api-captures/vitrine_list.txt |
| GET | /api/search | q: string, fresh?: '1' | ok, q, rows[], meta{source,total,cached,elapsed,providers[],currency{rates{USD,EUR},date,source},usedQueries?[]} | application/json | нормализация на стороне бэка отражается в meta.usedQueries | docs/_artifacts/ui-wire-r1/api-captures/search_LM317T.txt |
| GET | /api/live/search | q: string | SSE events: search:start, provider:partial|error, result, done; heartbeat `: ping` | Content-Type: text/event-stream; Cache-Control: no-cache; X-Accel-Buffering: no | события разделены `\n\n`; ошибки провайдеров — expected reality и отражены отдельными событиями | docs/_artifacts/ui-wire-r1/sse-proof/headers.txt, docs/_artifacts/ui-wire-r1/sse-proof/stream.txt |
| GET | /api/product | mpn | ok, product{mpn,manufacturer,title,description,images/datasheets?,technical_specs?,pricing?,availability?,regions?,package?,packaging?,vendorUrl,source}, meta{cached,sources?} | application/json | merged из Mouser/TME/Farnell/DigiKey | docs/_artifacts/ui-wire-r1/api-captures/product_LM317T.txt |

SSE — канон (подтверждено артефактами):
- Заголовки: `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no` (см. `docs/_artifacts/ui-wire-r1/sse-proof/headers.txt`).
- Формат: сообщения разделены двойным переводом строки `\n\n`, heartbeat-комментарии вида `: ping` (см. `docs/_artifacts/ui-wire-r1/sse-proof/stream.txt`).
- Антибуферизация: либо заголовок `X-Accel-Buffering: no` на ответе, либо `proxy_buffering off;` на SSE-location в nginx (иначе поток превращается в «ком» после таймаута).

Примечание по прокси/сети: в бэкенде включён Undici ProxyAgent и setGlobalDispatcher (унификация HTTP через прокси, вкл. встроенный fetch). Рекомендуемый инвариант окружения: `NO_PROXY=127.0.0.1,localhost`.

Происхождение: `server.js`, `api/*.mjs|js`, `src/api/*.mjs|js`. Живые ответы приложены в `docs/_artifacts/ui-wire-r1/`.
