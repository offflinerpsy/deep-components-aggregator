# Contributing Guide

**Project**: Deep Components Aggregator  
**Methodology**: R→I→P (Research → Implementation → Proof)  
**Commit Style**: Conventional Commits

---

## Mission & Truth

- Мы делаем агрегатор электронных компонентов с **живым поиском** и **кэш-слоем**.
- Источники контента: DigiKey, Mouser, Farnell, TME (описания/спеки/изображения/доки).
- Цены/склады: OEMstrade API. **Пользователь видит только регион/цену/наличие**; ссылки на дилеров — **только в админке**.
- Любые найденные позиции пишем в кэш. Ручные («мертвые») карточки также участвуют в поиске.
- Нормализация **RU→EN** обязательна: "транзистор" должно находить релевантные "transistor".
- Гео-ограничения обходятся **прокси-политикой** (WARP).

---

## Architecture & Boundaries

- **Backend** (Express, порт 9201) — источник данных и прокси-политики; секреты/ключи — **только через ENV**.
- **Frontend** (Next.js App Router, порт 3001) — визуальный слой **v0-шаблона**. **Сетку/лейаут НЕ менять**. Допустимы только правки токенов/утилити-классов для отступов.
- Общение фронта с бэком — **строго через Next.js rewrites** по `/api/*` (URL-прокси; CORS и секреты не выносим на клиент).
- Live-поиск — **SSE**: `Content-Type: text/event-stream; charset=utf-8`; события разделяются **двойным \n**; heartbeat комментариями `: ping`.

---

## Workflow: R→I→P

### R (Research) — Разведка

**Цель**: Полностью понять проблему перед кодом.

1. Прочитать в репозитории: `API-CONTRACT.md`, `docs/_artifacts/**`, `README*`, `*REPORT*.md`.
2. Зафиксировать факты в новых артефактах (curl-дампы, headers, SSE-фрагменты) прежде чем писать код.
3. Создать артефакт в `docs/_artifacts/<task-name>/`:
   - `research.md` — что изучил, какие файлы затронуты
   - `api-captures/*.txt` — curl-дампы текущего состояния
   - `headers-comparison.md` — если правишь SSE/rewrites

**Пример**:
```bash
mkdir -p docs/_artifacts/task-123-search-bar
echo "# Research: Add search bar to results page" > docs/_artifacts/task-123-search-bar/research.md
curl -I https://prosnab.tech/results > docs/_artifacts/task-123-search-bar/api-captures/current-headers.txt
```

### I (Implementation) — Реализация

**Цель**: Минимальный код, решающий проблему.

1. **Фронт**: `/` → сабмит на `/results?q=…`; `/results` тянет **через /api/** (rewrites) cache-эндпоинт и/или live-SSE; `/product/[mpn]` наполняется данными (Specs/Offers/Docs) без слома сетки; Offers — пагинация если >50.
2. **Бэк**: Все внешние вызовы — через Undici ProxyAgent; ошибки — guard-ветки/ранние возвраты (НЕ try/catch).
3. **Админ-логика** (цены/наценка/ссылки дилеров) — **не выводить** пользователю.

**Coding Standard**:
- **Никаких try/catch** в новом коде — только guard-ветки/ранние возвраты.
- **Conventional Commits**; EditorConfig/ESLint соблюдаем; детерминированные сборки.
- **Не изменять** макет/сетку v0; компоненты — только переиспользовать; стили — через существующие токены.
- Все вызовы с фронта — **только** `/api/*` (rewrites). Прямых URL бэка, CORS-костылей, лейкинга ключей — **запрещено**.

**Commit Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: новая фича
- `fix`: баг-фикс
- `docs`: документация
- `chore`: инфраструктура (deps, build)
- `refactor`: рефакторинг без изменения API
- `test`: добавление тестов

**Scope**: `results`, `product`, `api`, `proxy`, `cache`, etc.

**Пример**:
```
feat(results): add search bar and remove duplicate filters

- Add search box at top of results page (v0-style)
- Remove large 4-column filter block (duplicate)
- Keep single compact filter row
- Remove manufacturer filter (not in v0 design)

Fixes: #123
```

### P (Proof) — Доказательства

**Цель**: Убедиться что работает в production.

1. В `docs/_artifacts/<task-name>/` приложить:
   - `rewrites-proof.md` — сравнение заголовков «напрямую vs через фронт» (если правил rewrites)
   - `api-captures/*.txt` — curl после фикса
   - `sse-proof/*` — headers + первые 100 строк стрима (если правил SSE)
   - `ui-smoke-results.md` — таблица PASS + скрины для страниц в 3 брейкпоинтах (desktop/tablet/mobile)

2. **Тесты**:
   ```bash
   npm run test:e2e  # Playwright E2E
   ```

3. **Production smoke**:
   ```bash
   curl -I https://prosnab.tech/results?q=resistor  # 200 OK?
   curl -N https://prosnab.tech/api/live?q=test     # SSE работает?
   ```

**Пример ui-smoke-results.md**:
```markdown
# UI Smoke Results

| Page | Desktop (1920) | Tablet (768) | Mobile (375) | Status |
|------|----------------|--------------|--------------|--------|
| / | ![](./desktop-home.png) | ![](./tablet-home.png) | ![](./mobile-home.png) | ✅ PASS |
| /results | ![](./desktop-results.png) | ![](./tablet-results.png) | ![](./mobile-results.png) | ✅ PASS |
| /product | ![](./desktop-product.png) | ![](./tablet-product.png) | ![](./mobile-product.png) | ✅ PASS |
```

---

## Pull Request Definition of Done

- [ ] `/results` и `/product` рендерят **реальные** данные без изменения сетки v0.
- [ ] Все клиентские вызовы идут через `/api/*` (rewrites подтверждён артефактом).
- [ ] SSE соответствует MDN/WHATWG (двойной \n, heartbeat) и не буферится на реверсе (доказано заголовком/конфигом).
- [ ] Пустые состояния/ошибки отображаются «мягко» (бейджи/подсказки), UX устойчив к неполным данным.
- [ ] В PR приложены: `rewrites-proof.md`, `api-captures/*`, `sse-proof/*`, `ui-smoke-results.md`.
- [ ] E2E тесты проходят: `npm run test:e2e`
- [ ] Код соответствует EditorConfig/ESLint
- [ ] Conventional Commits использованы
- [ ] Reviewed by 1+ teammate

---

## Code Quality

### EditorConfig

`.editorconfig` — обязателен для всех файлов:
```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

### ESLint

```bash
npm run lint       # Check
npm run lint:fix   # Auto-fix
```

### Prettier (если используем)

```bash
npm run format
```

---

## Testing

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

Тесты находятся в `e2e/` и `tests/e2e/`.

### Smoke Tests

```bash
cd v0-components-aggregator-page
npm run test:smoke
```

---

## Branching Strategy

### Main Branches

- `main` — stable production (protected)
- `ops/ui-ux-r3` — current active (frontend)
- `ops/ui-ux-r3-backend` — backend-only branch

### Feature Branches

```bash
git checkout -b feat/search-bar-results
# Work...
git commit -m "feat(results): add search bar"
git push origin feat/search-bar-results
# Open PR to ops/ui-ux-r3
```

### Hotfix Branches

```bash
git checkout -b hotfix/sse-buffering
# Fix...
git commit -m "fix(api): disable nginx buffering for SSE"
git push origin hotfix/sse-buffering
# Open PR to main
```

---

## Security

### Secrets

- **NEVER** commit `.env` файлы в git!
- API ключи — только через ENV переменные
- Проверяй `.gitignore` перед коммитом

### Proxy

- Все внешние API вызовы — через Undici ProxyAgent
- `NO_PROXY=127.0.0.1,localhost` обязателен

### User Privacy

- Ссылки на дилеров (DigiKey/Mouser) — **только в админке**
- Пользователю показываем: регион, цену, наличие, даташиты

---

## Deployment

### Local Development

```bash
# Backend
npm run dev   # http://localhost:9201

# Frontend
cd v0-components-aggregator-page
npm run dev   # http://localhost:3000
```

### Production Build

```bash
cd v0-components-aggregator-page
rm -rf .next
npm run build
pm2 restart deep-v0
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide.

---

## Common Issues

### 1. Frontend не видит изменения бэка

**Решение**: Перезапусти Next.js dev server.

### 2. SSE стрим не работает

**Проверь**:
- `X-Accel-Buffering: no` в ответе
- nginx config: `proxy_buffering off`
- Backend headers: `Content-Type: text/event-stream; charset=utf-8`

### 3. Proxy 403/404

**Решение**:
```bash
warp-cli status
warp-cli connect
curl --proxy socks5://127.0.0.1:40000 https://api.digikey.com
```

---

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Next.js Rewrites](https://nextjs.org/docs/api-reference/next.config.js/rewrites)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Undici ProxyAgent](https://undici.nodejs.org/#/docs/api/ProxyAgent)

---

**Questions?** Ask in `#deep-agg-dev` Slack channel.
