# Investment vs Deep-Agg Conflict Analysis

**Date**: 2025-10-09  
**Status**: ✅ NO CONFLICTS DETECTED

---

## Summary

Investment проект и Deep-Agg агрегатор **НЕ конфликтуют** друг с другом.  
Оба проекта изолированы и используют разные порты.

---

## Port Configuration

| Project      | Port  | Process Manager | Status  | Memory  |
|--------------|-------|-----------------|---------|---------|
| **Deep-Agg** | 9201  | PM2 (id: 0)     | Online  | 56.7mb  |
| **Investment**| 3000  | PM2 (id: 1)     | Online  | 66.4mb  |

### Verification
```bash
$ ss -tulpn | grep -E ':(3000|9201)'
tcp   LISTEN   *:3000   (next-server, pid=41916)  # Investment
tcp   LISTEN   *:9201   (node, deep-agg)          # Deep-Agg
```

✅ **Different ports** = No conflict

---

## File System Isolation

| Project      | Location                | Owner | Permissions |
|--------------|-------------------------|-------|-------------|
| **Deep-Agg** | `/opt/deep-agg`         | root  | drwxr-xr-x  |
| **Investment**| `/var/www/investment`  | root  | drwxr-xr-x  |

✅ **Separate directories** = No file system conflicts

---

## Process Management

Both projects run under PM2 with separate process IDs:

```
┌────┬────────────┬──────┬─────────┬─────────┬──────────┐
│ id │ name       │ mode │ status  │ cpu     │ memory   │
├────┼────────────┼──────┼─────────┼─────────┼──────────┤
│ 0  │ deep-agg   │ fork │ online  │ 0%      │ 56.7mb   │
│ 1  │ investment │ fork │ online  │ 0%      │ 66.4mb   │
└────┴────────────┴──────┴─────────┴─────────┴──────────┘
```

✅ **Independent PM2 processes** = No runtime conflicts

---

## Environment Variables

### Deep-Agg (.env)
- PORT=9201 (default if not set)
- MOUSER_API_KEY, FARNELL_API_KEY, TME_TOKEN, etc.
- Database: SQLite (`data/db/deep-agg.db`)

### Investment (.env)
- PORT=3000 (Next.js default)
- Next.js specific environment variables
- No database (static/SSR Next.js app)

✅ **Separate env configs** = No environment variable conflicts

---

## Network Routes

### Deep-Agg (port 9201)
- `/` - Main aggregator UI
- `/api/search` - Search API
- `/api/order` - Orders API
- `/api/admin/*` - Admin panel
- `/auth/*` - Authentication

### Investment (port 3000)
- `/` - Investment landing page
- Next.js app routes
- No API overlap

✅ **Different URL spaces** = No routing conflicts

---

## Database

### Deep-Agg
- SQLite: `/opt/deep-agg/data/db/deep-agg.db`
- Sessions: `/opt/deep-agg/data/db/sessions.db`

### Investment
- No database (static/SSR Next.js)
- OR separate database if configured

✅ **No shared database** = No data conflicts

---

## Dependencies

### Deep-Agg
- Node.js + Express
- SQLite
- Passport (auth)
- API integrations (Mouser, Farnell, TME, DigiKey)

### Investment
- Next.js 15.2.4
- React
- Tailwind CSS
- Separate `node_modules` in `/var/www/investment`

✅ **Separate dependency trees** = No package conflicts

---

## Resource Usage

### Total Memory
- Deep-Agg: 56.7mb
- Investment: 66.4mb
- **Total**: ~123mb (negligible on modern server)

### CPU
- Deep-Agg: 0% (idle)
- Investment: 0% (idle)
- **No resource contention**

✅ **Low resource usage** = No performance conflicts

---

## Potential Issues (None Detected)

1. ❌ Port conflicts - NO (9201 ≠ 3000)
2. ❌ File system conflicts - NO (separate directories)
3. ❌ Environment variable conflicts - NO (separate .env files)
4. ❌ Database conflicts - NO (separate/no shared DB)
5. ❌ Process conflicts - NO (separate PM2 processes)
6. ❌ Route conflicts - NO (different ports/URLs)
7. ❌ Dependency conflicts - NO (separate node_modules)

---

## Access URLs

### Production
- **Deep-Agg**: http://5.129.228.88:9201
- **Investment**: http://5.129.228.88:3000

### Local (on server)
- **Deep-Agg**: http://localhost:9201
- **Investment**: http://localhost:3000

---

## Management Commands

### Both Projects
```bash
# Status
pm2 status

# Logs (both)
pm2 logs

# Logs (specific)
pm2 logs deep-agg
pm2 logs investment

# Restart both
pm2 restart all

# Restart specific
pm2 restart deep-agg
pm2 restart investment
```

---

## Firewall Configuration

If you need external access to both projects:

```bash
# Allow Deep-Agg (port 9201)
ufw allow 9201/tcp

# Allow Investment (port 3000)
ufw allow 3000/tcp

# Check status
ufw status
```

---

## Conclusion

✅ **NO CONFLICTS**

Investment проект и Deep-Agg агрегатор полностью изолированы:
- Разные порты (3000 vs 9201)
- Разные директории (`/var/www/investment` vs `/opt/deep-agg`)
- Разные процессы PM2 (id: 1 vs id: 0)
- Независимые зависимости
- Нет общих ресурсов

**Оба проекта могут работать параллельно без проблем.**

---

**Artifact**: `/opt/deep-agg/docs/_artifacts/2025-10-09/CONFLICT-ANALYSIS.md`  
**Tech Lead Mode**: Verified isolation ✅
