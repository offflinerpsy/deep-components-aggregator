# NETWORK / TME / PROXY INCIDENT REPORT (2025-10-07)

(Сжатая версия — полный отчёт лежит в `docs/_artifacts/2025-10-07/NETWORK-TME-PROXY-REPORT.md`)

## TL;DR
Потеряли выдачу поиска после рефакторинга прокси. Systemd unit/окружение повреждены → HTTP_PROXY не применился → dispatcher всегда без прокси → DigiKey/TME падают. TME pricing по-прежнему заблокирован без польского IP. Подпись TME исправлена. Нужно пересобрать systemd unit, env и сделать persistent http→socks сервис.

## Core Issues
- GEO-блокировка TME `GetProducts` (E_ACTION_FORBIDDEN) без EU IP.
- undici не понимает `socks5://` → нужен HTTP→SOCKS мост.
- Повреждён systemd unit → переменные окружения не доходят.

## Что уже решено
- Алгоритм подписи TME (HMAC-SHA1, PHP-style query) — OK.
- HTTP→SOCKS мост реализован (порт 40000) — требуется systemd юнит.
- Normalizers дополнены `datasheet_url`.

## Что сломано сейчас
| Компонент | Статус |
|-----------|--------|
| HTTP_PROXY в процессе | FAIL |
| DigiKey OAuth → запросы | FAIL |
| TME pricing | FAIL |
| Bridge persistence | TEMP |

## Восстановление (кратко)
1. Пересоздать чистый `/etc/systemd/system/deep-agg.service`.
2. Создать `/etc/systemd/system/http-to-socks-proxy.service` (Restart=always).
3. Очистить `/etc/deep-agg.env` — без дубликатов/многострочных значений.
4. `systemctl daemon-reload && systemctl enable --now http-to-socks-proxy && systemctl restart deep-agg`.
5. Проверка: `systemctl show deep-agg -p Environment | grep HTTP_PROXY`.
6. Поиск снова должен вернуть результаты DigiKey/Mouser/Farnell; затем включить TME pricing.

## Acceptance Criteria
- Dispatcher: `ProxyAgent` с `http://127.0.0.1:40000`.
- DigiKey: есть результаты по `LM358`.
- TME: нет E_ACTION_FORBIDDEN на GetProducts.
- Datasheet ссылки присутствуют.

## Next Steps
- TME PriceList парсинг → price_breaks.
- /metrics и /health.
- Proxy health probe.

(Полная детализация: причины, таймлайн, команды — см. артефакт.)
