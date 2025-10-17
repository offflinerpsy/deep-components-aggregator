# План реализации улучшений регистрации/заказов

## 1. Схемы и модели

### 1.1 Обновление схемы order.request.schema.json
```json
{
  "type": "object",
  "required": ["customer", "item", "mode"],
  "properties": {
    "mode": {
      "type": "string",
      "enum": ["guest", "register"]
    },
    "customer": {
      "type": "object",
      "required": ["name", "contact"],
      "properties": {
        "name": { "type": "string", "minLength": 2 },
        "contact": {
          "type": "object",
          "properties": {
            "email": { "type": "string", "format": "email" },
            "phone": { "type": "string", "pattern": "^\\+7[0-9]{10}$" }
          },
          "anyOf": [
            { "required": ["email"] },
            { "required": ["phone"] }
          ]
        }
      }
    },
    "registration": {
      "type": "object",
      "properties": {
        "password": { "type": "string", "minLength": 8 },
        "confirmPassword": { "type": "string" }
      },
      "if": {
        "properties": { "mode": { "const": "register" } }
      },
      "then": {
        "required": ["password", "confirmPassword"]
      }
    }
  }
}
```

### 1.2 Миграция БД
```sql
-- Добавляем связь заказов с email для последующей привязки
ALTER TABLE orders ADD COLUMN customer_email TEXT;
CREATE INDEX idx_orders_customer_email ON orders(customer_email);

-- Обновляем существующие заказы
UPDATE orders 
SET customer_email = json_extract(customer_contact, '$.email')
WHERE json_extract(customer_contact, '$.email') IS NOT NULL;
```

## 2. API Endpoints

### 2.1 Новый эндпоинт привязки заказов
POST /api/user/link-orders
- Находит все заказы с email пользователя
- Привязывает их к user_id
- Возвращает количество привязанных заказов

### 2.2 Обновление /auth/verify
- Добавляем автологин после верификации
- Добавляем привязку заказов
- Улучшаем UX редиректов

## 3. Шаблоны писем

### 3.1 order-confirmation-guest.mjml
- Детали заказа
- Предложение создать аккаунт
- Ссылка на регистрацию с предзаполненным email

### 3.2 order-confirmation-new-user.mjml
- Детали заказа
- Инструкции по подтверждению email
- Информация о доступе к ЛК

### 3.3 order-confirmation-existing.mjml
- Детали заказа
- Ссылка на заказ в ЛК
- Статус и следующие шаги

## 4. Тесты

### 4.1 Unit тесты
- Валидация новой схемы заказа
- Логика привязки заказов
- Шаблоны email

### 4.2 Integration тесты
- Полный флоу регистрации через заказ
- Привязка гостевых заказов
- Автологин после верификации

### 4.3 E2E тесты
- Оформление заказа гостем
- Регистрация через заказ
- Вход существующего пользователя