# Onboarding Guide

**For**: New developers joining the project  
**Time**: ~30 minutes  
**Prerequisites**: Basic Node.js/React knowledge

---

## Welcome! 👋

Ты присоединяешься к проекту **Deep Components Aggregator** — агрегатор электронных компонентов с живым поиском.

### Что мы делаем
- Агрегируем данные с DigiKey, Mouser, Farnell, TME
- Показываем цены/наличие через OEMstrade API
- Кэшируем результаты в SQLite
- Живой поиск через SSE (Server-Sent Events)

### Stack
- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS
- **Backend**: Express, Undici (HTTP + Proxy), SQLite
- **Deployment**: PM2, nginx, Cloudflare WARP

---

## 📚 Step 1: Read Documentation (15 min)

**Обязательно** прочитай перед началом работы:

1. [README.md](./README.md) — общий обзор проекта
2. [ARCHITECTURE.md](./ARCHITECTURE.md) — полная архитектура
3. [API-CONTRACT.md](./API-CONTRACT.md) — эндпоинты бэка
4. [PROJECT-TREE.md](./PROJECT-TREE.md) — структура файлов

**Опционально** (если будешь работать с конкретной областью):
- [docs/frontend/REWRITES.md](./docs/frontend/REWRITES.md) — Next.js proxy
- [docs/backend/PROXY-POLICY.md](./docs/backend/PROXY-POLICY.md) — Undici + WARP
- [docs/frontend/V0-MIGRATION.md](./docs/frontend/V0-MIGRATION.md) — история v0 редизайна

---

## 💻 Step 2: Local Setup (10 min)

### 2.1 Clone Repository

```bash
git clone git@github.com:offflinerpsy/v0-components-aggregator-page.git ~/projects/deep-agg
cd ~/projects/deep-agg
git checkout ops/ui-ux-r3
```

### 2.2 Install Dependencies

```bash
# Backend
npm install

# Frontend
cd v0-components-aggregator-page
npm install
cd ..
```

### 2.3 Setup .env

```bash
cp .env.example .env
nano .env
```

**Минимум для локального запуска**:
```bash
MOUSER_API_KEY=your_test_key  # Попроси у тимлида
DB_PATH=./var/db/deepagg-local.sqlite
BACKEND_PORT=9201
FRONTEND_PORT=3000
NODE_ENV=development
```

**Полные ключи** (DigiKey, OEMstrade) нужны для продакшена — запроси у тимлида.

---

## 🚀 Step 3: Run Locally (5 min)

### Terminal 1: Backend

```bash
cd ~/projects/deep-agg
npm run dev
# Backend started on http://localhost:9201
```

### Terminal 2: Frontend

```bash
cd ~/projects/deep-agg/v0-components-aggregator-page
npm run dev
# Frontend started on http://localhost:3000
```

### Test

1. Open http://localhost:3000
2. Enter "resistor" in search
3. Results should appear (cache or live)
4. Click on a product → Details page

---

## �� Step 4: Run Tests

```bash
# E2E tests (Playwright)
npm run test:e2e

# Frontend smoke test
cd v0-components-aggregator-page
npm run test:smoke
```

---

## 🔧 Step 5: Development Workflow

### Branches

- `main` — stable release (protected)
- `ops/ui-ux-r3` — current active development
- `ops/ui-ux-r3-backend` — backend-only branch

### Workflow (R→I→P)

1. **Research (R)**: Изучи проблему, создай артефакты в `docs/_artifacts/`
2. **Implementation (I)**: Реализуй фичу/фикс
3. **Proof (P)**: Докажи что работает (скрины, curl-дампы, тесты)

### Commits (Conventional Commits)

```bash
feat(results): add search bar
fix(product): correct image gallery layout
docs(api): update cache endpoint spec
chore(deps): upgrade next to 14.2.16
```

### Pull Requests

**Title**: `feat(scope): short description`  
**Description**:
```markdown
## Problem
User cannot search on results page.

## Solution
- Added search box component
- Connected to router.push()
- Styled with v0 glass-card

## Proof
- Screenshot: docs/_artifacts/ui-smoke-results.md
- Test: `npm run test:e2e` passes
```

**Definition of Done**:
- [ ] Code follows EditorConfig/ESLint
- [ ] No console errors in browser
- [ ] E2E tests pass
- [ ] Artifacts created (R→I→P)
- [ ] Reviewed by 1+ teammate

---

## 📁 Where to Find Things

### Backend

| What | Where |
|------|-------|
| API routes | `src/api/*.mjs` |
| Parsers (DigiKey/Mouser) | `src/parsers/` |
| Database queries | `src/lib/db.mjs` |
| Proxy setup | `server.js` (line ~50) |

### Frontend

| What | Where |
|------|-------|
| Homepage | `v0-components-aggregator-page/app/page.tsx` |
| Results page | `v0-components-aggregator-page/app/results/page.tsx` |
| Product page | `v0-components-aggregator-page/app/product/[mpn]/page.tsx` |
| Results UI | `v0-components-aggregator-page/components/ResultsClient.tsx` |
| Rewrites | `v0-components-aggregator-page/next.config.mjs` |

### Docs

| What | Where |
|------|-------|
| Architecture | `ARCHITECTURE.md` |
| API contract | `API-CONTRACT.md` |
| Deployment | `DEPLOYMENT.md` |
| Project tree | `PROJECT-TREE.md` |
| Frontend docs | `docs/frontend/` |
| Backend docs | `docs/backend/` |

---

## 🎯 Common Tasks

### Add New API Endpoint

1. Create `src/api/new-endpoint.mjs`
2. Add route in `server.js`
3. Document in `API-CONTRACT.md`
4. Add tests in `tests/api/`

### Add New React Component

1. Create `v0-components-aggregator-page/components/MyComponent.tsx`
2. Document in `docs/frontend/COMPONENTS.md`
3. Add to Storybook (if applicable)

### Update Frontend Styles

1. Edit `v0-components-aggregator-page/app/globals.css` (global)
2. Or use inline Tailwind classes
3. **DO NOT** break v0 grid layout!

### Debug SSE Stream

```bash
# Direct backend test
curl -N http://localhost:9201/api/live?q=resistor

# Through Next.js rewrite
curl -N http://localhost:3000/api/live?q=resistor

# Check headers
curl -I http://localhost:9201/api/live?q=test
```

---

## ⚠️ Common Pitfalls

### 1. Frontend doesn't see new backend changes
**Solution**: Restart Next.js dev server (`npm run dev` in v0-components-aggregator-page/).

### 2. SSE stream "склеивается" (no live updates)
**Solution**: Check `X-Accel-Buffering: no` header in nginx config.

### 3. Proxy not working (403 from DigiKey)
**Solution**: 
```bash
warp-cli status
warp-cli connect
```

### 4. `.next` build errors
**Solution**:
```bash
cd v0-components-aggregator-page
rm -rf .next
npm run build
```

### 5. PM2 process crashed
**Solution**:
```bash
pm2 logs deep-agg --lines 50
pm2 restart deep-agg
```

---

## 🤝 Getting Help

### Slack Channels
- `#deep-agg-dev` — general development
- `#deep-agg-ops` — deployment/infrastructure

### Code Owners
- **Frontend**: @username1
- **Backend**: @username2
- **DevOps**: @username3

### Useful Commands
```bash
pm2 logs              # Production logs
npm run test:e2e      # Run E2E tests
git log --oneline -10 # Recent commits
```

---

## 📝 Next Steps

1. Pick a task from GitHub Issues (label: `good-first-issue`)
2. Create feature branch: `git checkout -b feat/my-feature`
3. Code + commit (Conventional Commits)
4. Push + open PR
5. Request review

**Happy coding!** 🚀
