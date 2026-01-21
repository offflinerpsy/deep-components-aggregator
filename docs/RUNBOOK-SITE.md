# Runbook: как устроен и как чинить сайт

Этот документ — короткая «карта местности» для любых следующих задач (включая работу ИИ): где что живёт, как ходит трафик, как устроен сайдбар/каталог, и как быстро диагностировать типовые поломки.

## Источники истины

- Продакшн nginx vhost: `/etc/nginx/sites-enabled/prosnab.tech` (именно его читает nginx).
- Репозиторий хранит ориентир-конфиг: `nginx/prosnab.tech.conf` (должен совпадать по портам/роутингу, но не является автоматически применённым конфигом).

## Архитектура (кратко)

- nginx (SSL/Reverse proxy)
  - `/` и `/_next/static/*` → Next.js (PM2 `deep-v0`)
  - `/api/*` и `/auth/*` → Express (PM2 `deep-agg`)
  - `live search (SSE)` антибуферизация: `proxy_buffering off` + `X-Accel-Buffering: no`
- Next.js (frontend) — папка `v0-components-aggregator-page/`
  - Все вызовы фронта к бэку только через `/api/*` (через rewrites/proxy, без прямых URL бэка на клиенте)
- Express (backend) — `server.js`
  - cache-first эндпоинты и SSE live-search

## Порты и процессы

- `deep-v0` (Next.js): `127.0.0.1:3000`
- `deep-agg` (Express): `0.0.0.0:9201`

Быстрая проверка:

```bash
pm2 ls
ss -ltnp | grep -E ':3000|:9201'
```

## Как работает каталог и поиск

Ключевой принцип: **каталог — cache-first**, live-поиск идёт только по явному запросу.

- Cache list: `GET /api/vitrine/list` — выдача только из SQLite кэша.
- Live search: `GET /api/live/search` — SSE поток, который может ходить к провайдерам.

UX правило для листовых (leaf) категорий:
- При заходе в leaf-категорию без `q` показываем первые 10 результатов из кэша.
- Кнопка «Показать ещё» **не запускает live**, а открывает «советовалку» с примерами запросов.
- Мягкий антиспам: при слишком частых поисках подряд предлагается уточнить запрос (с кнопкой «Искать всё равно»).

См. реализацию:
- `v0-components-aggregator-page/app/catalog/[...slug]/page.tsx`
- `v0-components-aggregator-page/components/ResultsClient.tsx`

## Как работает сайдбар

Сайдбар — отдельный клиентский компонент, открывается по фиксированной вкладке слева (desktop) и рендерит overlay + панель.

Поведение flyout (важное):
- Hover по root-категории открывает flyout с подкатегориями.
- Есть «невидимый мост» (bridge) между кнопкой и flyout, чтобы курсор мог перейти по горизонтальному зазору без закрытия меню.
- Закрытие flyout — с задержкой (таймер), отменяется при наведении на flyout.

См. реализацию:
- `v0-components-aggregator-page/components/CatalogSidebar.tsx`

## Типовые аварии и быстрые фиксы

### 1) «Стили пропали / голый HTML»

Симптомы:
- Страница выглядит без CSS.
- В Network на `/_next/static/*.css` ошибки/502.

Проверка:
```bash
# nginx → Next.js должен отвечать 200
curl -k --resolve prosnab.tech:443:127.0.0.1 -I https://prosnab.tech/

# локальный Next.js
curl -I http://127.0.0.1:3000/
```

Частая причина:
- Рассинхрон порта между nginx upstream и тем, где слушает Next.js.
  - nginx vhost ожидает `127.0.0.1:3000`
  - Next.js должен быть на том же порту.

Фикс:
```bash
pm2 restart deep-v0 --update-env
```

(Если менялся build/код фронта — сначала `cd v0-components-aggregator-page && npm run -s build`.)

### 2) «Server Action mismatch / странные ошибки рендера»

Симптомы:
- Ошибки вида “Failed to find Server Action …” или похожие после деплоя.

Причина:
- Сайт обслуживает HTML/чанки от разных сборок (старый `.next` + новый runtime).

Фикс:
- Пересобрать Next.js (`npm run -s build`) и перезапустить `deep-v0`.

## Принципы (коротко)

- Не менять сетку/лейаут v0-шаблона без отдельной задачи.
- На клиенте — только `/api/*` (через Next rewrites/прокси). Не хардкодить URL бэка.
- Live-search (SSE) — не буферить на nginx.
- Каталог/листы — cache-first, а дорогие провайдеры только по явному поисковому запросу.
