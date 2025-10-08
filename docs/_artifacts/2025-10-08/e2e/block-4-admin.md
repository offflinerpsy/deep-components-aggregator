# Блок 4: Админ UI и API — Артефакты

## Админ UI доступность

**URL**: http://127.0.0.1:9201/ui/auth.html  
**Статус**: ✅ **200 OK**

### HTTP Headers:
```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 6065
Last-Modified: Mon, 06 Oct 2025 17:41:45 GMT
```

### Ссылки на ассеты:
- CSS: `/ui/auth.css`
- OAuth routes: `/auth/google`, `/auth/yandex`

### Формы:
- **Вход**: Email + пароль
- **Регистрация**: Имя (опционально), Email, Пароль (мин 8 символов)
- **OAuth**: Google, Яндекс

**Вывод**: ✅ Админ UI грузится корректно, нет 404, ассеты подключены.

---

## Админ API endpoints

| Endpoint | HTTP Code | Статус | Примечание |
|----------|-----------|--------|------------|
| `/api/admin/products` | **500** | ❌ Ошибка | Internal Server Error (требует расследования) |
| `/api/admin/orders` | **401** | ✅ Ожидаемо | Unauthorized (нужна аутентификация) |
| `/api/admin/settings/pricing` | **401** | ✅ Ожидаемо | Unauthorized (нужна аутентификация) |

---

## E2E Gap: `/api/admin/products` возвращает 500

**Проблема**: Endpoint `/api/admin/products` падает с Internal Server Error вместо 401/403.

**Ожидаемое поведение**: Должен возвращать 401 Unauthorized (как `/api/admin/orders` и `/api/admin/settings/pricing`).

**Возможные причины**:
1. Отсутствует guard на начало обработчика (проверка auth перед логикой)
2. Ошибка в `requireAdmin` middleware или его отсутствие
3. Проблема с подключением к БД внутри обработчика

**Рекомендация**: 
- Проверить `api/admin.products.js` на наличие guard-clauses для auth
- Добавить middleware `requireAdmin` если отсутствует
- Проверить логи сервера на детали ошибки 500

---

## Вывод по Блоку 4

✅ **Админ UI работает**:
- Страница `/ui/auth.html` доступна (200 OK)
- CSS/OAuth ссылки корректны
- Формы входа/регистрации присутствуют

⚠️ **Админ API частично работает**:
- `/api/admin/orders` → 401 (ожидаемо, нужна auth)
- `/api/admin/settings/pricing` → 401 (ожидаемо, нужна auth)
- `/api/admin/products` → **500** (❌ GAP — требует фикса)

---

**Артефакты сохранены**:
- `docs/_artifacts/2025-10-08/e2e/admin-auth-head.txt` — HEAD /ui/auth.html
- `docs/_artifacts/2025-10-08/e2e/admin-auth-preview.html` — первые 100 строк HTML
- `docs/_artifacts/2025-10-08/e2e/admin-api-heads.txt` — HTTP коды админ API endpoints
- `docs/_artifacts/2025-10-08/e2e/block-4-admin.md` — этот отчёт
