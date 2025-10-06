# Production Sync Report — 2025-10-07

Ветка: prod-sync-2025-10-07
Коммит: e9c2292 "docs(prod): artifacts + structure sync from production 2025-10-07"

## Что сделано
- Синхронизированы артефакты продакшн-диагностики: health, metrics, proxy (WARP), providers, runtime-status.
- Обновлён .gitignore; добавлены deploy_key.template (без секрета) и GIT-PUSH-INSTRUCTIONS.md.
- Добавлен PR-CHECKLIST для быстрой приёмки.

## Проверки
- Health: требуется повторная проверка на проде после запуска сервиса.
- Metrics: экспонируются (Prometheus-совместимые), артефакты приложены.
- WARP: состояние Disconnected — оставить как TODO, либо включить и приложить новый снимок IP via proxy.
- Pricing/price breaks: нужна «боевая» проверка по 2–3 MPN (видимость брейков и ₽-конверсии в выдаче).

## Риски / TODO до мержа
- Убедиться, что health OK и все руты доступны.
- Перепроверить чек-лист в PR, приложить свежие curl/скрины после перезапуска сервиса.
- Если появятся новые артефакты сегодня — положить в docs/_artifacts/2025-10-07 и добить в этот же PR.

Автор: prod sync
