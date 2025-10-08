# Session: Network & TME Diagnostic

Date: 2025-10-07
Status: In Progress (proxy env broken, search degraded)

## Goal
Восстановить рабочий поиск (возврат результатов), включить прокси для TME, подготовить основу для фикса цен.

## Key Findings
- Systemd unit повреждён: переменные HTTP_PROXY/HTTPS_PROXY не загружаются.
- Dispatcher работает в режиме `direct connection`.
- HTTP→SOCKS мост не подтверждён активным после рестартов.
- DigiKey и TME падают на сетевом уровне (fetch failed) — не до логики API.
- TME signature исправлен, но нет прохождения к GetProducts из-за geo.

## Actions Done
- Проверена env: дубликаты HTTP_PROXY удалены.
- Исправлен `dispatcher.mjs` → ProxyAgent при наличии http:// proxy.
- Создан детальный отчет: `docs/_artifacts/2025-10-07/NETWORK-TME-DIAGNOSTIC-REPORT.md`.

## Current Blockers
1. systemd unit (EnvironmentFile) не читает env.
2. Прокси-мост не в systemd юните.

## Next Steps
1. Пересоздать `/etc/systemd/system/deep-agg.service`.
2. Добавить сервис `http-to-socks-proxy.service`.
3. Проверить env применён: `systemctl show ... | grep HTTP_PROXY`.
4. Тест DigiKey OAuth.
5. Сырой TME GetProducts dump.
6. Нормализация PriceList → pricing coverage.

## Risks
- Повторная порча unit → хранить эталон в репо.
- Смена API схемы TME → логировать сырой JSON.

## Hand-off Notes
После восстановления: повторно запустить coverage тест и задокументировать сравнение ДО/ПОСЛЕ.
