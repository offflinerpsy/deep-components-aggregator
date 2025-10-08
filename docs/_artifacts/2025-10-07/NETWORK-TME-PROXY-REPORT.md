# NETWORK / TME / PROXY INCIDENT REPORT (2025-10-07)

## 1. Summary
Агрегатор потерял результаты поиска: все провайдеры либо 0 результатов, либо `fetch failed`. Критический блокер — сетевой слой сломан после рефакторинга прокси (SOCKS5 → HTTP bridge) и повреждения systemd unit / окружения. Параллельно решалась задача TME pricing (нужен гео-доступ к GetProducts API через польский/ЕС IP). Подпись TME починена, но geo-block остался без рабочего прокси.

## 2. Timeline (UTC+3)
| Время | Событие |
|-------|---------|
| ~17:30 | Начата отладка TME: E_INVALID_SIGNATURE |
| ~18:00 | Найден официальный JS клиент `piotrkochan/tme-api-client` |
| ~18:10 | Переписан алгоритм подписи (http-build-query + rawurlencode + recursive sort) |
| ~18:15 | Получен ответ: E_ACTION_FORBIDDEN (geo-restriction) |
| ~18:25 | Попытка EnvHttpProxyAgent с socks5:// → ошибка протокола |
| ~18:35 | Попытка SocksProxyAgent → несовместимо с undici fetch ("fetch failed") |
| ~18:45 | Реализован http→socks мост (порт 40000 → socks5:25345 WARP) |
| ~19:00 | Попытка включить HTTP_PROXY в systemd env — переменные не подхватываются |
| ~19:10 | Поиск стал возвращать пустые массивы (Digikey/TME полностью отвалились) |
| ~19:20 | Диагностировано: unit повреждён, env не мапится, dispatcher всегда без прокси |

## 3. Root Causes
1. GEO RESTRICTION: TME `GetProducts` требует IP за пределами RU (например PL). Без прокси → только Search API (нет цен/stock).
2. PROXY LAYER DESIGN: undici не поддерживает socks5:// напрямую в ProxyAgent → нужен HTTP мост.
3. SYSTEMD ENV CORRUPTION: Файл unit (или drop-in) повреждён — `EnvironmentFile` не считывается корректно, `HTTP_PROXY` не попадает в процесс.
4. SIDE EFFECT: Dispatcher всегда создаётся как direct `Agent` → все вызовы TME/DigiKey идут без прокси → таймауты/блокировки.

## 4. What Was Fixed Successfully
- Подпись TME (HMAC-SHA1 base: `POST&rawurlencode(url)&rawurlencode(http_build_query(sortedParams))`).
- Реализован fetchWithRetry с таймаутом 7s и общим dispatcher.
- Создан HTTP→SOCKS bridge (скрипт `scripts/http-to-socks-proxy.mjs`).
- Удалены дубли HTTP_PROXY в `/etc/deep-agg.env`.
- Datasheet поля добавлены в normalizers (верификация отложена до восстановления сети).

## 5. Still Broken / Outstanding
| Компонент | Статус | Причина |
|-----------|--------|---------|
| HTTP_PROXY в процессе | FAIL | systemd не экспортирует переменные |
| DigiKey запросы | FAIL | Сеть / токен не инициализируется (нет прокси + возможно блок IP) |
| TME pricing | FAIL | Geo-block без прокси |
| Proxy bridge persistence | TEMP | Запускался вручную, нет systemd юнита |
| Coverage datasheets | PENDING | Нет стабильной выдачи пока провайдеры не починены |

## 6. Technical Deep Dive
### 6.1 TME Signature
Официальный клиент (TypeScript) использует:
```
data = sortKeys(data, { deep: true })
qs = httpBuildQuery(data)
sigBase = 'POST&' + rawurlencode(url) + '&' + rawurlencode(qs)
HMAC-SHA1(base, secret) -> base64
```
Повторено один-в-один.

### 6.2 Почему SOCKS5 прямо не взлетел
`EnvHttpProxyAgent` / `ProxyAgent` в undici ожидают `http:`/`https:` схемы. `socks5://` → `Invalid URL protocol`. `socks-proxy-agent` несовместим с внутренними интерфейсами undici для fetch dispatcher — попытка привела к runtime ошибкам `fetch failed`.

### 6.3 HTTP→SOCKS Bridge Схема
```
client (aggregator fetch)
  -> undici ProxyAgent (http://127.0.0.1:40000)
      -> node http-proxy-to-socks
          -> socks5://127.0.0.1:25345 (wireproxy/WARP)
             -> TME API (видит польский IP)
```

### 6.4 Systemd Unit Corruption Indicators
- `systemctl show deep-agg -p Environment` отсутствует HTTP_PROXY.
- `systemctl cat` вывод с обрезанными символами `>`.
- Drop-in `environment.conf` нечитабелен через стандартный вывод (pager artifacts).

Вероятные причины: некорректное редактирование через инструмент с обрывом, либо внедрение невидимых управляющих символов.

## 7. Immediate Recovery Plan
1. Пересоздать unit: `/etc/systemd/system/deep-agg.service` (чистый текст, LF, без BOM).
2. Пересоздать `/etc/deep-agg.env` (убрать комментарии с разрывами слов, оставить только актуальные переменные).
3. Добавить отдельный unit: `/etc/systemd/system/http-to-socks-proxy.service` (Restart=always) и `After=` dependency.
4. `systemctl daemon-reload && systemctl enable --now http-to-socks-proxy && systemctl restart deep-agg`.
5. Проверка: `systemctl show deep-agg -p Environment | grep HTTP_PROXY` → должен вернуть пару строк.
6. Тест импорта dispatcher: `node -e "import('./src/net/dispatcher.mjs').then(m=>console.log(m.globalDispatcher.constructor.name, process.env.HTTP_PROXY))"`.
7. Тест DigiKey OAuth → лог `[DigiKey] ✅ Access token obtained`.
8. Тест TME official client через мост → ожидаем уход E_ACTION_FORBIDDEN (получим нормальный ответ/или другой бизнес-ошибки).

## 8. Post-Recovery Tasks
| Приоритет | Задача |
|-----------|--------|
| HIGH | Распарсить TME `GetProducts` → заполнить pricing/stock/price_breaks |
| HIGH | Собрать coverage повторно (5 эталонных MPN) |
| MED | Реализовать /metrics (проксировать показатели retry/timeouts) |
| MED | /health расширенный (каждый провайдер latency & status) |
| LOW | UI бейджи источников + символ `—` вместо `...` |
| LOW | Документировать proxy stack в `docs/architecture/network.md` |

## 9. Risks / Mitigations
| Риск | Митигейшн |
|------|-----------|
| Случайное повторное повреждение unit | Добавить ADR о форматировании systemd файлов, запрещать интерактивные редакторы с управляющими кодами |
| WARP нестабилен (таймауты) | Health-проба `httpbin.org/get` через proxy каждые N минут |
| DigiKey IP block | Возможный fallback на второй egress (через WARP тоже) / rotate UA |
| Повтор таймаутов (7s) | Метрика распределения latency и адаптация таймаута при устойчивой деградации |

## 10. Lessons Learned
1. Искать официальный SDK/клиент ПЕРЕД тем как воспроизводить алгоритмы подписи.
2. Для undici нельзя напрямую использовать socks-прокси — нужен слой адаптации.
3. Systemd окружение должно валидироваться автоматически (скрипт lint env + unit checksum).
4. Требуется отдельный health-check сети до основной бизнес-логики.

## 11. Proposed Automation
- Скрипт `scripts/verify-env.mjs`: проверяет наличие ключевых переменных (HTTP_PROXY, TOKENS) и печатает JSON статус.
- Pre-start hook: если нет прослушивания порта 40000 — abort.
- /metrics: `proxy_requests_total`, `proxy_timeouts_total`, `provider_fetch_failures{provider=...}`.

## 12. Current Status Snapshot
```
Dispatcher: direct (HTTP_PROXY not injected)
Bridge: неизвестно (нужно переподнять как сервис)
TME Signature: OK
TME Pricing: BLOCKED (geo + отсутствует прокси)
DigiKey: FAIL (нет OAuth токена сейчас)
Datasheets: Код готов, выдача не проверена
```

## 13. Next Concrete Commands (после ручного доступа root)
```
# 1. Пересоздать unit
cat > /etc/systemd/system/deep-agg.service <<'EOF'
[Unit]
Description=Deep Aggregator
After=network-online.target http-to-socks-proxy.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/deep-agg
EnvironmentFile=/etc/deep-agg.env
ExecStart=/usr/bin/node /opt/deep-agg/server.js
Restart=always
RestartSec=5
LimitNOFILE=65535
LimitNPROC=4096
NoNewPrivileges=true
StandardOutput=append:/var/log/deep-agg.service.log
StandardError=append:/var/log/deep-agg.service.err

[Install]
WantedBy=multi-user.target
EOF

# 2. Unit для моста
cat > /etc/systemd/system/http-to-socks-proxy.service <<'EOF'
[Unit]
Description=HTTP→SOCKS5 bridge for WARP
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/bin/node /opt/deep-agg/scripts/http-to-socks-proxy.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# 3. Env
cat > /etc/deep-agg.env <<'EOF'
NODE_ENV=production
PORT=9201
HTTP_PROXY=http://127.0.0.1:40000
HTTPS_PROXY=http://127.0.0.1:40000
MOUSER_API_KEY=...
FARNELL_API_KEY=...
FARNELL_REGION=uk.farnell.com
TME_TOKEN=...
TME_SECRET=...
DIGIKEY_CLIENT_ID=...
DIGIKEY_CLIENT_SECRET=...
DIGIKEY_API_BASE=https://api.digikey.com
DIGIKEY_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) DeepAgg/2025
SESSION_SECRET=...
EOF

systemctl daemon-reload
systemctl enable --now http-to-socks-proxy
systemctl restart deep-agg
systemctl show deep-agg -p Environment | tr ' ' '\n' | grep HTTP_PROXY
```

## 14. Acceptance Criteria for “Recovered”
- `ProxyAgent` в dispatcher.
- DigiKey возвращает ≥1 результат на LM358.
- TME без E_ACTION_FORBIDDEN на `GetProducts`.
- search API возвращает строки, datasheet_url присутствует где возможно.
- Отчёт сохранён (этот файл) + ссылка в основную документацию/лог.

---
Report version: 1.0.0
Generated: 2025-10-07
Author: automated diagnostic
