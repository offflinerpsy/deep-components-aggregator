# Orders Flow Audit

## Status: SERVER NOT RUNNING
**Note**: This audit requires a running server to test the complete order flow.

## Expected Flow

### 1. User Registration/Login
- **Endpoint**: `POST /auth/register`
- **Test User**: `test@local`
- **Password**: `test123!`

**Expected Request**:
```json
{
  "username": "test",
  "email": "test@local",
  "password": "test123!"
}
```

**Expected Response**:
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "username": "test",
    "email": "test@local",
    "role": "user"
  }
}
```

---

### 2. Create Order
- **Endpoint**: `POST /api/order`
- **Auth**: Required (session cookie)

**Expected Request**:
```json
{
  "items": [
    {
      "mpn": "2N3904",
      "manufacturer": "ON Semiconductor",
      "quantity": 10,
      "price_rub": 8.41,
      "source": "mouser"
    }
  ],
  "customer": {
    "name": "Иван Тестовый",
    "email": "test@local",
    "phone": "+79001234567",
    "notes": "Тестовый заказ для аудита"
  }
}
```

**Expected Response**:
```json
{
  "ok": true,
  "order": {
    "id": 1,
    "status": "pending",
    "total_rub": 84.10,
    "created_at": "2025-10-04T14:00:00Z",
    "items": [...]
  }
}
```

---

### 3. Admin View Orders
- **Endpoint**: `GET /api/admin/orders`
- **Auth**: Admin role required

**Expected Response**:
```json
{
  "ok": true,
  "orders": [
    {
      "id": 1,
      "user_id": 1,
      "status": "pending",
      "total_rub": 84.10,
      "customer_name": "Иван Тестовый",
      "created_at": "2025-10-04T14:00:00Z",
      "items_count": 1
    }
  ]
}
```

---

### 4. Update Order Status
- **Endpoint**: `PATCH /api/admin/orders/1`
- **Auth**: Admin role required

**Expected Request**:
```json
{
  "status": "processing"
}
```

**Expected Response**:
```json
{
  "ok": true,
  "order": {
    "id": 1,
    "status": "processing",
    "updated_at": "2025-10-04T14:05:00Z"
  }
}
```

---

### 5. User View My Orders
- **Endpoint**: `GET /api/user/orders`
- **Auth**: User session required

**Expected Response**:
```json
{
  "ok": true,
  "orders": [
    {
      "id": 1,
      "status": "processing",
      "total_rub": 84.10,
      "created_at": "2025-10-04T14:00:00Z",
      "updated_at": "2025-10-04T14:05:00Z",
      "items": [
        {
          "mpn": "2N3904",
          "quantity": 10,
          "price_rub": 8.41
        }
      ]
    }
  ]
}
```

---

## Screenshots Required

### Screenshot 1: Order Modal
- **File**: `order-modal.png`
- **Viewport**: Desktop 1440px
- **Content**: Order form with items, customer details, submit button

### Screenshot 2: Admin Orders List
- **File**: `admin-orders-list.png`
- **Viewport**: Desktop 1440px
- **Content**: Table with orders, status column, action buttons

### Screenshot 3: User My Orders
- **File**: `user-my-orders.png`
- **Viewport**: Desktop 1440px
- **Content**: List of user's orders with status badges

---

## Findings

### Current Implementation Status
- ✅ **Database Schema**: Orders tables exist (AUDIT-ORDERS-BACKEND-ONEFILE.md)
- ✅ **API Endpoints**: Defined in api/order.js, api/admin.*.js
- ⚠️ **Status Sync**: Need to verify real-time update (WebSocket or polling?)
- ❌ **UI Testing**: Requires running server + manual interaction

### Expected Issues
1. **Russian Search**: Orders for Russian queries may fail if search normalization not implemented
2. **Pricing**: Orders may not include markup if admin UI not configured
3. **Dealer Links**: Order details may not show dealer links (Block 4 not implemented)

---

## Recommendations
1. Start server: `npm start`
2. Run manual test with Postman/curl
3. Capture screenshots at each step
4. Verify status synchronization between admin and user views
5. Test error handling (duplicate orders, invalid MPNs, etc.)
