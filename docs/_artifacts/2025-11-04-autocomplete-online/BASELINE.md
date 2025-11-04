# R4 Online Autocomplete — Baseline State

**Дата создания**: 4 ноября 2025  
**Ветка**: `feat/r4-online-autocomplete` (создана с `ops/recon-`)  
**Rollback tag**: `R4-BASE-20251104-xxxx`

---

## Версии и порты

### Backend (Express)
- **Порт**: 9201
- **Версия**: 3.1.0
- **Node.js**: 22.20.0
- **PM2 процесс**: `deep-agg` (id:2, uptime 10 дней, 1806 рестартов)
- **Status**: online

### Frontend (Next.js)
- **Порт**: 3001
- **Node.js**: 22.20.0
- **PM2 процесс**: `deep-v0` (id:8, uptime 17 дней, 0 рестартов)
- **Status**: online

---

## Rewrites (Next.js → Express)

```javascript
// v0-components-aggregator-page/next.config.mjs
rewrites: async () => [
  {
    source: '/api/:path*',
    destination: 'http://127.0.0.1:9201/api/:path*'
  }
]
```

**Статус**: ✅ Работает (проверено `curl http://127.0.0.1:3001/api/health`)

---

## Провайдеры (ключи настроены)

```bash
DIGIKEY_API_BASE=***
DIGIKEY_CLIENT_ID=***
DIGIKEY_CLIENT_SECRET=***
DIGIKEY_USER_AGENT=***
FARNELL_API_KEY=***
FARNELL_REGION=***
HTTP_PROXY=***
MOUSER_API_KEY=***
TME_SECRET=***
TME_TOKEN=***
```

**Все 4 провайдера имеют credentials** в `.env`.

---

## WARP Proxy

- **Порт**: 127.0.0.1:40000
- **Статус**: ✅ Активен 2+ недели
- **Процесс**: `warp-svc` (PID 802)
- **Проверка**:
  ```bash
  curl -x socks5://127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace
  # warp=on, ip=104.28.251.138
  ```

---

## База данных

- **Путь**: `/opt/deep-agg/var/db/deepagg.sqlite`
- **Размер**: 3 MB
- **Таблицы**: 31 (включая `search_rows_fts` с `prefix='2 3 4'`)
- **Продуктов в кэше**: 3

---

## Текущий UI (до изменений)

### Главная страница (/)
- Единственный инпут поиска в центре
- Нет автодополнения
- Сабмит → `/results?q=...`

### Страница результатов (/results)
- Инпут поиска вверху
- Нет автодополнения
- Отображение результатов в сетке

**Скриншот "до"**: см. `ui-screens/baseline-home.png` (будет создан)

---

## Что будет добавлено (R4)

1. **Backend**: 
   - `/api/autocomplete?q=...` endpoint
   - 4 suggest-клиента (Mouser, DigiKey, Farnell, TME)
   - Оркестратор с дедупликацией и сортировкой

2. **Frontend**:
   - `AutocompleteSearch.tsx` компонент
   - `useDebounce.ts` hook
   - Dropdown подсказок (≤20 items)

3. **Ограничители**:
   - Debounce 250-300ms
   - Rate limit 10 rps/IP
   - Timeout 1200ms/провайдер
   - Max 3 провайдера параллельно

4. **No local cache**: только краткоживущий in-memory LRU (TTL ≤60s) для анти-дребезга

---

## Rollback процедура

Если что-то пойдет не так:

```bash
# 1. Вернуться к тегу
git checkout R4-BASE-20251104-xxxx

# 2. Создать hotfix ветку
git checkout -b hotfix/rollback-r4

# 3. Restart PM2
pm2 restart deep-agg
pm2 restart deep-v0

# 4. Проверить работоспособность
curl http://127.0.0.1:9201/api/health
curl http://127.0.0.1:3001/
```

---

**Baseline зафиксирован.** Начинается работа над R4 Online Autocomplete.
