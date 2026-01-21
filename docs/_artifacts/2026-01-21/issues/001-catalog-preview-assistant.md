# [Task] Catalog: 10 cached items + assistant + anti-spam

## PLAN
- В leaf-категории показывать 10 позиций из кэша (cache-only) и не запускать live-search без `q`.
- На «Показать ещё» открывать нижний помощник (без внешнего AI), предлагать варианты запроса и кнопку «Показать ещё 10 из кэша».
- При >10 поисков за 60 секунд показывать помощник перед следующим поиском (не блокировать, но добавлять «осознанность»).

## CHANGES
modified:
- v0-components-aggregator-page/app/catalog/[...slug]/page.tsx
- v0-components-aggregator-page/components/ResultsClient.tsx
- v0-components-aggregator-page/app/catalog/page.tsx
created:
- docs/_artifacts/2026-01-21/tz-catalog-preview-assistant.md
- docs/_artifacts/2026-01-21/ui-smoke-results.md

## RUN
```bash
cd v0-components-aggregator-page
npm run -s build
```

## VERIFY
- Leaf category без `q` показывает максимум 10 позиций и блок с «Показать ещё».
- «Показать ещё» открывает bottom-sheet и не запускает SSE.
- «Показать ещё 10 из кэша» догружает cache-only.
- Live-search стартует только при вводе `q`.
- При 11-м поиске в минуту появляется помощник-антиспам.

## ARTIFACTS
- docs/_artifacts/2026-01-21/tz-catalog-preview-assistant.md
- docs/_artifacts/2026-01-21/ui-smoke-results.md

## GIT
Branch: feat/catalog-preview-assistant
Commits:
- feat(catalog): cache preview + assistant
- chore(git): ignore sqlite wal/shm
PR: to main
