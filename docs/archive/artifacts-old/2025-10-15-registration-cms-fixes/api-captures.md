# API Captures - Registration and Static Pages

## 1. Check Email Endpoint

**Server restart needed** - Endpoint not working initially due to server not loading new route.

After restart:
```bash
curl -X POST http://localhost:9201/api/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response (email not exists):
```json
{"exists": false, "verified": null}
```

Expected response (email exists, verified):
```json
{"exists": true, "verified": true}
```

Expected response (email exists, not verified):
```json
{"exists": true, "verified": false}
```

## 2. Static Pages API

### GET /api/pages/about
```bash
curl http://localhost:9201/api/pages/about
```

Response:
```json
{
  "slug": "about",
  "title": "О нас",
  "content": "<h1>О нас</h1><p>Deep Components Aggregator — агрегатор электронных компонентов с живым поиском и кэш-слоем.</p><p>Мы объединяем данные от ведущих дистрибьюторов (DigiKey, Mouser, Farnell, TME) и предоставляем актуальные цены через OEMstrade.</p>",
  "meta_description": "Deep Components Aggregator - агрегатор электронных компонентов"
}
```

### GET /api/pages/delivery
```bash
curl http://localhost:9201/api/pages/delivery
```

Response:
```json
{
  "slug": "delivery",
  "title": "Доставка",
  "content": "<h1>Доставка</h1><p>Мы работаем с надежными партнерами для обеспечения быстрой доставки электронных компонентов.</p><p>Сроки доставки зависят от наличия товара на складе и региона доставки.</p>",
  "meta_description": "Условия и сроки доставки электронных компонентов"
}
```

### GET /api/pages/contacts
```bash
curl http://localhost:9201/api/pages/contacts
```

Response:
```json
{
  "slug": "contacts",
  "title": "Контакты",
  "content": "<h1>Контакты</h1><p>Email: zapros@prosnab.tech</p><p>Телефон: +7 (495) 123-45-67</p><p>Адрес: Россия, Москва</p>",
  "meta_description": "Контактная информация Deep Components Aggregator"
}
```

## 3. SPA Page Routes

### GET /page/about
```bash
curl http://localhost:9201/page/about
```

Returns: `page.html` (SPA that fetches `/api/pages/about` client-side)

### GET /page/delivery
Returns: `page.html` (SPA that fetches `/api/pages/delivery` client-side)

### GET /page/contacts
Returns: `page.html` (SPA that fetches `/api/pages/contacts` client-side)

## 4. Database State

```sql
SELECT slug, title, is_published FROM static_pages;
```

Result:
```
about|О нас|1
delivery|Доставка|1
contacts|Контакты|1
```

## Status

✅ Static pages API working
✅ SPA routes serving page.html correctly
✅ Database migration applied successfully
✅ All 3 pages (about, delivery, contacts) accessible
