# 2026-01-21 — Runbook добавлен

Цель: зафиксировать «как оно работает» (site+sidebar+catalog) и типовые аварии (например, «пропали стили») так, чтобы любой следующий разработчик/ИИ не тратил время на реконструкцию.

## Что добавлено/обновлено

- Добавлен runbook: `docs/RUNBOOK-SITE.md`
  - Архитектура трафика: nginx → Next.js (3000) → Express (9201)
  - Инвариант: все вызовы фронта только через `/api/*` (Next rewrites)
  - Каталог: cache-first (`/api/vitrine/list`), live-search только явно (`/api/live/search`)
  - Сайдбар: hover flyout + «мост» курсора + таймер закрытия
  - Инцидент-рутина: проверка портов/PM2/nginx при «голом HTML»

- Синхронизирован контракт: `API-CONTRACT.md` (строка `/api/vitrine/list` → реальные query params и shape)
- Синхронизирована архитектура: `ARCHITECTURE.md` (убраны устаревшие `/api/cache` и `/api/live`, обновлены rewrites)

## Связанные доказательства (инцидент «стили пропали»)

- Curl/headers/body proofs лежат в: `docs/_artifacts/2026-01-21/styles-meltdown/`
  - Проверка: nginx отдаёт `/_next/static/*.css` с `Content-Type: text/css; charset=UTF-8`
  - Root-cause: рассинхрон портов nginx upstream ↔ Next.js runtime
