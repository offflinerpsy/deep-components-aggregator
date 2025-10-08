# Network & TME Diagnostic Report

Date: 2025-10-07
Status: IN-PROGRESS (Search degraded, proxy env broken)

---
## 1. Executive Summary
Текущая деградация поиска вызвана сломанной прокси-конфигурацией и повреждённым systemd unit (переменные окружения HTTP_PROXY/HTTPS_PROXY не подхватываются). TME pricing по-прежнему недоступен из-за гео-блокировки GetProducts (нужен польский/EU IP через WARP), а DigiKey падает на этапе OAuth (fetch failed) из-за отсутствия рабочего dispatcher-а. Все это приводит к пустой агрегированной выдаче.

---
## 2. Timeline (UTC)
| Время | Событие |
|-------|---------|
| 15:50 | Переписан TME signature по официальному клиенту |
| 16:05 | Обнаружен geo-block (E_ACTION_FORBIDDEN) при GetProducts |
| 16:20 | Настроен SOCKS5 WARP (порт 25345) |
| 16:40 | Создан http→socks мост (порт 40000) |
| 17:10 | Попытка ProxyAgent через HTTP_PROXY=http://127.0.0.1:40000 |
| 18:30 | Начались пустые поисковые ответы (rows=[]) |
| 18:44 | Перезапуск: unit стал неконсистентен (Env не грузится) |
| 19:05 | Диагностика: HTTP_PROXY отсутствует в runtime env |

---
## 3. Root Causes
### 3.1 Systemd Environment Corruption
- Вывод `systemctl show deep-agg -p Environment` не содержит HTTP_PROXY
- Основной unit файл отображается с усечёнными/артефактными строками
- Предположительно повреждён файл или вмешался некорректный редактор (pager вывод с `>`)

### 3.2 Proxy Chain Not Active
- Мост 40000 не подтверждён как LISTEN после рестартов
- Dispatcher видит "direct connection" → все внешние вызовы идут без прокси

### 3.3 TME Pricing Path
- Search API: доступен глобально, но без цен
- GetProducts API: требует EU IP → сейчас вызовы либо не идут через WARP, либо блокируются

### 3.4 DigiKey Failures
- `fetch failed` ещё до OAuth → проблема транспорта (не токена)
- Отсутствие прокси не критично для DigiKey, но сетевой слой нестабилен

---
## 4. What Was Attempted
| Категория | Действие | Статус |
|-----------|----------|--------|
| Signature | Переписан HMAC через sortKeysRecursive + httpBuildQuery + rawurlencode | ✅ |
| Geo-bypass | Настроен SOCKS5 (WARP) | ✅ |
| Undici Proxy | EnvHttpProxyAgent (socks://) | ❌ (не поддерживает) |
| Undici Proxy | SocksProxyAgent | ❌ (несовместим с fetch) |
| Bridge | http-proxy-to-socks (40000→25345) | ✅ (но не закреплён systemd) |
| Dispatcher | Переписан на ProxyAgent (HTTP only) | ✅ |
| Systemd env | Обновлён /etc/deep-agg.env | Частично (unit не читает) |

---
## 5. Current Observable State
```
GET /api/search?q=LM358&fresh=1
→ rows: []
→ providers: mouser(ok,0), farnell(ok,0), digikey(error fetch failed), tme(error fetch failed)
Dispatcher import: Agent (no proxy)
Env file: HTTP_PROXY=http://127.0.0.1:40000 (присутствует)
Runtime env: HTTP_PROXY отсутствует
```

---
## 6. Required Fixes (Priority Order)
1. Пересоздать systemd unit (гарантировать EnvironmentFile путь цел):
   - `/etc/systemd/system/deep-agg.service` чистый текст без артефактов
2. Нормализовать `/etc/deep-agg.env` (без дублей HTTP_PROXY, без пустых кавычек)
3. Поднять systemd unit для HTTP→SOCKS моста (Before=deep-agg / или After=network-online)
4. Проверить `systemctl show deep-agg -p Environment | grep HTTP_PROXY`
5. Проверить `ss -ltnp | grep 40000`
6. Перезапуск поиска и точечный тест DigiKey OAuth
7. Повторный тест TME GetProducts вручную (скрипт теста) → сохранить сырой JSON
8. Добавить нормализацию TME PriceList → заполнить price_breaks

---
## 7. TME PriceList Mapping Plan
| Pole TME | Canonical | Примечание |
|----------|-----------|------------|
| `Data.ProductList[].PriceList[].Amount` | quantity | Break qty |
| `Data.ProductList[].PriceList[].PriceValue` | unit_price | Цена в PLN |
| `Currency` (response root or inferred) | currency | PLN → конверсия в RUB через rates.json |
| `Data.ProductList[].InStock` | stock | Целое значение |

Конверсия: `price_rub = ceil(unit_price * FX['PLN→RUB'] * markup)`

---
## 8. Risk Log
| Риск | Вероятность | Импакт | Митигация |
|------|-------------|--------|-----------|
| Повторная порча unit | Средняя | Высокий | Хранить эталон в репо `docs/operations/systemd/deep-agg.service` |
| Падение WARP | Средняя | Средний | Health-check `/health` + alert |
| Изменение TME схемы | Низкая | Средний | Логи сырого ответа + версионирование нормализации |
| Отказ DigiKey IP | Средняя | Низкий | Fallback Mouser/Farnell, ретрай с proxy pool |

---
## 9. Verification Checklist (To Execute After Fix)
- [ ] `systemctl show deep-agg -p Environment` содержит HTTP_PROXY
- [ ] `node -e import('./src/net/dispatcher.mjs') → ProxyAgent`
- [ ] `curl /api/search?q=2N3904&fresh=1` возвращает ≥1 провайдера с ценой
- [ ] DigiKey токен логируется (`[DigiKey] ✅ Access token obtained`)
- [ ] TME GetProducts сырой JSON сохранён (артефакт)
- [ ] price_breaks для TME заполнены

---
## 10. Next Steps (Actionable)
1. Recreate unit file (plain text, LF) → daemon-reload
2. Create `http-to-socks-proxy.service` → enable → start
3. Restart deep-agg → verify env
4. Raw TME test script → save JSON
5. Implement TME price normalization
6. Coverage re-run (`scripts/test-provider-coverage.mjs`)
7. Commit + tag report → update ROADMAP

---
## 11. Artifacts To Produce
| Файл | Назначение |
|------|------------|
| `docs/_artifacts/2025-10-07/tme-getproducts-raw.json` | Сырой ответ для эталона |
| `docs/_artifacts/2025-10-07/network-env-dump.txt` | Dump env после фикса |
| `docs/_artifacts/2025-10-07/coverage-after-fix.md` | Повторный отчёт покрытия |

---
## 12. Appendix: Discarded Approaches
| Подход | Почему отказались |
|--------|-------------------|
| EnvHttpProxyAgent + socks5:// | Не поддерживает SOCKS протокол |
| SocksProxyAgent напрямую | Не совместим с undici.fetch (ошибки dispatcher) |
| Прямая работа без прокси | Geo-блок TME, отсутствие цен |

---
## 13. Immediate Blockers
- Systemd unit повреждён → Env не применим → ProxyAgent не активируется.

---
## 14. Ownership & Follow-up
| Задача | Ответственный |
|--------|--------------|
| Systemd пересоздать | Ops / Maintainer |
| Bridge service | Ops |
| TME PriceList парсер | Backend |
| Coverage повторный | QA / Backend |

---
Report generated automatically.
