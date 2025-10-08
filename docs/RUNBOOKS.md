# RUNBOOKS — дежурные процедуры (DEEP Aggregator)
Версия: 2025-10-08 • Ссылка на канон: `docs/PROJECT_CANON.md`

## 1) Быстрый прод-чек (5 минут)
```bash
curl -fsS http://127.0.0.1:9201/api/health | jq
curl -fsS http://127.0.0.1:9201/api/metrics | head -n 50
curl -fsS 'http://127.0.0.1:9201/api/search?q=LM317' | jq '.items[0], .tookMs'
curl -N 'http://127.0.0.1:9201/api/live/search?q=1N4148' | sed -n '1,80p'
```
Ожидания: `ok:true`, метрики провайдеров видны; SSE события приходят и завершаются `done` < 10s.

## 2) Сеть/прокси (WARP/HTTP→SOCKS)
```bash
systemctl status warp-bridge.service
curl -fsS https://ifconfig.io
grep -v '^#' /etc/default/deep-agg
```
Если IP/доступ не совпали — проверить порядок запуска: `Requires=warp-bridge.service`, `After=warp-bridge.service`, переменные `HTTP(S)_PROXY`.

## 3) Логи и алертинг
```bash
journalctl -u deep-agg -n 200 --no-pager
journalctl -u warp-bridge -n 200 --no-pager
```
Ошибки нормализованы; без PII. При всплесках 5xx — приложить фрагменты в `docs/_artifacts/<date>/logs/`.

## 4) Курсы валют / индексы
```bash
./scripts/rates-refresh.sh
./scripts/build-index.sh
```
Проверить, что `rates` обновились (<24h), индексы на месте.

## 5) Контрольные MPN
```bash
for q in LM317 1N4148 "LDB-500L"; do
  curl -fsS "http://127.0.0.1:9201/api/search?q=$q" | jq '{q:$ENV.q, n:(.items|length), tookMs}'
done
```
Сохраняем JSON-выжимку и скрин UI в `docs/_artifacts/<date>/checks/`.

## 6) Оформление заказа (smoke)
```bash
curl -fsS -X POST http://127.0.0.1:9201/api/order \
  -H 'Content-Type: application/json' \
  -d '{"mpn":"1N4148","qty":50,"contact_name":"QA","contact_email":"qa@example.com"}' | jq
```
Ожидаем `status:"new"`. В админке заказ виден; наценка применена согласно settings.

## 7) Кириллица/нормализация
```bash
curl -fsS 'http://127.0.0.1:9201/api/search?q=транзистор' | jq '.items|length'
```
Положительная выдача, корректные подсказки/типизация.

## 8) Регрессии и Playwright
Запуск e2e: `npm run test:e2e`. Репорт положить в `docs/_artifacts/<date>/e2e/`.

## 9) Выпуск (release acceptance)
Чек-лист из канона §12. Все артефакты — в `docs/_artifacts/<YYYY-MM-DD>/` с индексом `index.json`.