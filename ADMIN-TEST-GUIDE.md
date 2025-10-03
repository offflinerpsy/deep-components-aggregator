## 🧪 Быстрый тест админ-панели

### 1️⃣ Логин
```bash
curl -c cookies.txt -X POST http://5.129.228.88:9201/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"deploy_test@example.com","password":"admin123"}'
```

**Ожидаемый результат:**
```json
{"ok":true,"user":{"id":"36d8a92e-bf9a-49e5-91c3-466195c05801","email":"deploy_test@example.com","role":"admin"}}
```

---

### 2️⃣ Проверка доступа к админ-панели
```bash
curl -b cookies.txt http://5.129.228.88:9201/api/admin/orders
```

**Ожидаемый результат:**
```json
{"ok":true,"orders":[...]}
```

---

### 3️⃣ Открыть в браузере

**URL:** http://5.129.228.88:9201/ui/auth.html

1. Ввести email: `deploy_test@example.com`
2. Ввести пароль: `admin123`
3. Нажать "Войти"
4. Перейти на: http://5.129.228.88:9201/ui/admin-orders.html

**Должно быть видно:**
- ✅ Таблица с заказами (1 заказ - LM317)
- ✅ Фильтры: статус, поиск, даты
- ✅ Кнопка "Подробнее" на каждом заказе
- ✅ При клике - модальное окно с деталями
- ✅ Ссылки OEMsTrade в деталях заказа
- ✅ Кнопки смены статуса

---

### 4️⃣ Тест смены статуса
```bash
# Получить ID заказа
ORDER_ID=$(curl -b cookies.txt http://5.129.228.88:9201/api/admin/orders | jq -r '.orders[0].id')

# Изменить статус на "processing"
curl -b cookies.txt -X PATCH http://5.129.228.88:9201/api/admin/orders/$ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"processing"}'
```

**Ожидаемый результат:**
```json
{"ok":true,"order":{...,"status":"processing"}}
```

---

### 5️⃣ Тест 403 для обычного юзера

```bash
# Логин как обычный юзер
curl -c cookies_user.txt -X POST http://5.129.228.88:9201/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1759472605@example.com","password":"test123"}'

# Попытка доступа к админ-панели
curl -b cookies_user.txt http://5.129.228.88:9201/api/admin/orders
```

**Ожидаемый результат:**
```json
{"ok":false,"error":"forbidden","message":"Admin access required"}
```

---

## ✅ Всё готово!

**Админ-доступ:**
- Email: `deploy_test@example.com`
- Пароль: `admin123`
- URL: http://5.129.228.88:9201/ui/auth.html

**После логина:**
- Админ-панель: http://5.129.228.88:9201/ui/admin-orders.html
