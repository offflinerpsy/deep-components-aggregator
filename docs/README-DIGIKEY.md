# Digi-Key (Product Information v4) — проверка через сервер

Цель: все вызовы Digi‑Key выполняем строго на сервере (не с локальной машины). Ниже — минимальный набор команд для проверки того, что на сервере всё работает.

Важно: дизайн UI не трогаем. Всё — чисто сервер и curl.

---

## 1) Быстрый smoke‑test через наши серверные эндпоинты

Запускать на сервере, где крутится `server.js` (порт по умолчанию 9201):

- Проверка здоровья (видно, включён ли digikey)
```bash
curl -s http://localhost:9201/api/health | jq
```

- Поиск по ключевому слову (использует v4 /search/keyword под капотом)
```bash
curl -s "http://localhost:9201/api/digikey/keyword?q=M83513/19-E01NW" | jq '.status, .count'
```

- Детали по Digi‑Key Part Number (DKPN) — пример: `P5555-ND`
```bash
curl -s "http://localhost:9201/api/digikey/details?dkpn=P5555-ND" | jq '.status'
```

Ожидаемо: HTTP 200 и ненулевая выдача. Если придёт 403 — значит этот egress IP Digi‑Key режет, и нужно менять выходной IP/регион.

---

## 2) Прямая проверка v4 API (не обязательно)

Если нужно убедиться, что сервер напрямую ходит в Digi‑Key (без наших эндпоинтов):

- Получить токен (OAuth2 client_credentials). Важно: переменные окружения уже заданы в `.env` и должны быть экспортированы в среду процесса. Если в ответ прилетает `302 → blocked.digikey.com`, настраиваем Cloudflare Worker-прокси: деплоим код из `cloudflare-worker.js`, берём URL вида `https://deep-agg-proxy.xxx.workers.dev` и прописываем `DIGIKEY_API_BASE=https://deep-agg-proxy.xxx.workers.dev/digikey` в `.env`.
```bash
TOKEN=$(curl -sS -X POST 'https://api.digikey.com/v1/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "client_id=$DIGIKEY_CLIENT_ID" \
  --data-urlencode "client_secret=$DIGIKEY_CLIENT_SECRET" \
  --data-urlencode 'grant_type=client_credentials' | jq -r '.access_token')

echo "TOKEN len: ${#TOKEN}"
```

- v4 keyword search (расширенная выдача):
```bash
curl -sS 'https://api.digikey.com/products/v4/search/keyword' \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-DIGIKEY-Client-Id: $DIGIKEY_CLIENT_ID" \
  -H 'X-DIGIKEY-Locale-Site: US' \
  -H 'X-DIGIKEY-Locale-Language: en' \
  -H 'X-DIGIKEY-Locale-Currency: USD' \
  -H 'Content-Type: application/json' \
  -d '{"Keywords":"M83513/19-E01NW","RecordCount":5}' | jq '.Products | length'
```

- v4 productdetails by DKPN (детальная карточка):
```bash
curl -sS "https://api.digikey.com/products/v4/search/P5555-ND/productdetails" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-DIGIKEY-Client-Id: $DIGIKEY_CLIENT_ID" \
  -H 'X-DIGIKEY-Locale-Site: US' \
  -H 'X-DIGIKEY-Locale-Language: en' \
  -H 'X-DIGIKEY-Locale-Currency: USD' | jq '.Products | length'
```

---

## 3) Быстрая проверка параметрики

Вывести пример параметров (если продукт найден):
```bash
curl -s "http://localhost:9201/api/digikey/keyword?q=M83513/19-E01NW" | \
  jq -r '.raw.Products[0].Parameters[0:10] | .[] | "\(.ParameterText // .Parameter // "?"): \(.ValueText // .Value // "?")"'
```

Если поле `Parameters` отсутствует, смотрим `raw.Products[0]` и ищем `Parameters`/`MediaLinks`/`StandardPricing` и т.п. — это типовые поля v4.

---

## 4) Частые проблемы

- `302 → blocked.digikey.com` — egress-IP заблокирован. Используем Cloudflare Worker как прокси и задаём `DIGIKEY_API_BASE` (см. выше).
- `403 Blocked` — Digi‑Key режет выходной IP. Решение: поменять egress на US/EU (Cloudflare Worker тоже помогает).
- Пустой ответ — проверь `Keywords` (для MPN лучше начинать с keyword search). Для `productdetails` используем DKPN (`*-ND`).
- `401` — истёк токен или не передали `X-DIGIKEY-Client-Id`. Токен живёт ~10 минут.

---

## 5) Дальше

После успешного smoke‑теста можно подключить Digi‑Key как дополнительный источник в `/api/search` (после Mouser) без изменений в UI.

---

## 6) Бесплатный обход egress‑блокировок (Cloudflare WARP через WireGuard)

Если серверный IP режется Digi‑Key и Cloudflare Worker не помогает, можно сменить egress с помощью WARP:

Вариант «в одну кнопку» (мы добавили скрипт):

1. Запустите скрипт установки на сервере из корня проекта:

```bash
python scripts/setup_warp_proxy.py
```

Что делает скрипт:
- Устанавливает wgcf (WARP CLI) и wireproxy
- Поднимает локальный SOCKS5 на 127.0.0.1:25344
- Пропишет `DIGIKEY_OUTBOUND_PROXY=socks5://127.0.0.1:25344` в `.env`
- Перезапустит сервер и прогонит selftest/keyword

Отмена/остановка:
```bash
systemctl stop wireproxy
systemctl disable wireproxy
sed -i '/^DIGIKEY_OUTBOUND_PROXY=.*/d' /opt/deep-agg/.env
```

Примечание: Используйте этот метод ответственно и в рамках ToS поставщиков.