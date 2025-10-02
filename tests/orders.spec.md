# Test Specification: Orders Module

**Version:** 1.0  
**Date:** 2025-10-02  
**Author:** QA Team

---

## Overview
This document defines manual acceptance tests for the Orders Backend MVP. All tests should be executed before deploying to production.

**Test Environment:**
- **Dev:** http://localhost:9201
- **Production:** http://5.129.228.88:9201

**Prerequisites:**
- Database migration applied (`db/migrations/2025-10-02_orders.sql`)
- Server running with latest code
- Nginx Basic Auth configured (for admin tests)
- Test credentials: `admin` / `test_password_123`

---

## Test Suite 1: Database Migration

### Test 1.1: Tables Created
**Objective:** Verify orders and settings tables exist

**Steps:**
```bash
sqlite3 cache.json "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('orders', 'settings');"
```

**Expected Result:**
```
orders
settings
```

**Status:** [ ] PASS [ ] FAIL

---

### Test 1.2: Indexes Created
**Objective:** Verify performance indexes exist

**Steps:**
```bash
sqlite3 cache.json "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_orders%';"
```

**Expected Result:**
```
idx_orders_created_at
idx_orders_status
idx_orders_mpn
```

**Status:** [ ] PASS [ ] FAIL

---

### Test 1.3: Pricing Policy Inserted
**Objective:** Verify default pricing policy exists

**Steps:**
```bash
sqlite3 cache.json "SELECT key, value FROM settings WHERE key='pricing_policy';"
```

**Expected Result:**
```
pricing_policy|{"markup_percent": 0.30, "markup_fixed_rub": 500}
```

**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 2: POST /api/order (Valid Requests)

### Test 2.1: Minimal Valid Order
**Objective:** Create order with only required fields

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Иван Петров",
      "contact": {
        "email": "ivan.petrov@example.com"
      }
    },
    "item": {
      "mpn": "ATMEGA328P-PU",
      "manufacturer": "Microchip",
      "qty": 10
    }
  }'
```

**Expected Response:**
- HTTP Status: 201 Created
- Body: `{ "ok": true, "orderId": "<UUID>" }`
- UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Verify in Database:**
```bash
sqlite3 cache.json "SELECT id, customer_name, mpn, status FROM orders WHERE customer_name='Иван Петров';"
```

**Expected:**
- One row with status='new'

**Status:** [ ] PASS [ ] FAIL

---

### Test 2.2: Full Order with All Fields
**Objective:** Create order with all optional fields

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "ООО Электроника",
      "contact": {
        "email": "orders@electronics.ru",
        "phone": "+79161234567",
        "telegram": "@electronics_ltd"
      }
    },
    "item": {
      "mpn": "STM32F407VGT6",
      "manufacturer": "STMicroelectronics",
      "qty": 50
    },
    "pricing_snapshot": {
      "base_price_rub": 500,
      "markup_percent": 0.25,
      "markup_fixed_rub": 300,
      "final_price_rub": 925
    },
    "meta": {
      "comment": "Срочный заказ, требуется до пятницы"
    }
  }'
```

**Expected Response:**
- HTTP Status: 201 Created
- Body: `{ "ok": true, "orderId": "<UUID>" }`

**Verify in Database:**
```bash
sqlite3 cache.json "SELECT customer_contact, pricing_snapshot, meta FROM orders WHERE customer_name='ООО Электроника';"
```

**Expected:**
- customer_contact contains phone, email, telegram
- pricing_snapshot has all pricing fields
- meta has comment

**Status:** [ ] PASS [ ] FAIL

---

### Test 2.3: Phone Contact Only
**Objective:** Verify phone-only contact is valid

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Петр Сидоров",
      "contact": {
        "phone": "+79267654321"
      }
    },
    "item": {
      "mpn": "NE555",
      "manufacturer": "Texas Instruments",
      "qty": 100
    }
  }'
```

**Expected Response:**
- HTTP Status: 201 Created

**Status:** [ ] PASS [ ] FAIL

---

### Test 2.4: Telegram Contact Only
**Objective:** Verify Telegram-only contact is valid

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Алексей Иванов",
      "contact": {
        "telegram": "@alexey_tech"
      }
    },
    "item": {
      "mpn": "ESP32-WROOM-32",
      "manufacturer": "Espressif",
      "qty": 20
    }
  }'
```

**Expected Response:**
- HTTP Status: 201 Created

**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 3: POST /api/order (Invalid Requests)

### Test 3.1: Missing Customer Name
**Objective:** Validate required field enforcement

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "contact": {
        "email": "test@example.com"
      }
    },
    "item": {
      "mpn": "TEST-001",
      "manufacturer": "Test",
      "qty": 1
    }
  }'
```

**Expected Response:**
- HTTP Status: 400 Bad Request
- Body: `{ "ok": false, "error": "validation_error", "errors": [{ "field": "customer", "message": "must have required property 'name'" }] }`

**Status:** [ ] PASS [ ] FAIL

---

### Test 3.2: No Contact Methods
**Objective:** Validate at least one contact method required

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Test User",
      "contact": {}
    },
    "item": {
      "mpn": "TEST-002",
      "manufacturer": "Test",
      "qty": 1
    }
  }'
```

**Expected Response:**
- HTTP Status: 400 Bad Request
- Body contains: `"At least one contact method is required"`

**Status:** [ ] PASS [ ] FAIL

---

### Test 3.3: Invalid Email Format
**Objective:** Validate email format

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Test User",
      "contact": {
        "email": "invalid-email"
      }
    },
    "item": {
      "mpn": "TEST-003",
      "manufacturer": "Test",
      "qty": 1
    }
  }'
```

**Expected Response:**
- HTTP Status: 400 Bad Request
- Body contains: `"must match format \"email\""`

**Status:** [ ] PASS [ ] FAIL

---

### Test 3.4: Invalid Phone Format
**Objective:** Validate E.164 phone format

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Test User",
      "contact": {
        "phone": "89161234567"
      }
    },
    "item": {
      "mpn": "TEST-004",
      "manufacturer": "Test",
      "qty": 1
    }
  }'
```

**Expected Response:**
- HTTP Status: 400 Bad Request
- Body contains: `"must match pattern"`
- Note: Phone must start with `+` and country code

**Status:** [ ] PASS [ ] FAIL

---

### Test 3.5: Invalid Telegram Username
**Objective:** Validate Telegram format (@username)

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Test User",
      "contact": {
        "telegram": "username_without_at"
      }
    },
    "item": {
      "mpn": "TEST-005",
      "manufacturer": "Test",
      "qty": 1
    }
  }'
```

**Expected Response:**
- HTTP Status: 400 Bad Request
- Body contains: `"must match pattern"`

**Status:** [ ] PASS [ ] FAIL

---

### Test 3.6: Invalid Quantity (Zero)
**Objective:** Validate qty >= 1

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Test User",
      "contact": {"email": "test@example.com"}
    },
    "item": {
      "mpn": "TEST-006",
      "manufacturer": "Test",
      "qty": 0
    }
  }'
```

**Expected Response:**
- HTTP Status: 400 Bad Request
- Body contains: `"must be >= 1"`

**Status:** [ ] PASS [ ] FAIL

---

### Test 3.7: Additional Properties Rejected
**Objective:** Validate strict schema (additionalProperties: false)

**Request:**
```bash
curl -X POST http://localhost:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Test User",
      "contact": {"email": "test@example.com"}
    },
    "item": {
      "mpn": "TEST-007",
      "manufacturer": "Test",
      "qty": 1
    },
    "extra_field": "should be rejected"
  }'
```

**Expected Response:**
- HTTP Status: 400 Bad Request
- Body contains: `"must NOT have additional properties"`

**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 4: Rate Limiting

### Test 4.1: Order Rate Limit Enforcement
**Objective:** Verify 10 requests/minute limit

**Steps:**
1. Create test script `test_rate_limit.sh`:
```bash
#!/bin/bash
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:9201/api/order \
    -H "Content-Type: application/json" \
    -d '{
      "customer": {"name": "Rate Test", "contact": {"email": "test@example.com"}},
      "item": {"mpn": "TEST-RATE", "manufacturer": "Test", "qty": 1}
    }'
  sleep 0.5
done
```

2. Run script: `bash test_rate_limit.sh`

**Expected Output:**
- First 10 responses: `201`
- Responses 11-15: `429`

**Verify Metric:**
```bash
curl -s http://localhost:9201/api/metrics | grep rate_limit_hits_total
```

**Expected:**
- Counter > 0 for endpoint="/api/order"

**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 5: Admin Endpoints (Protected)

### Test 5.1: Unauthorized Access Blocked
**Objective:** Verify Nginx Basic Auth protection

**Request (no auth):**
```bash
curl -i http://localhost:9201/api/admin/orders
```

**Expected Response:**
- HTTP Status: 401 Unauthorized
- Header: `WWW-Authenticate: Basic realm="Admin Area"`

**Status:** [ ] PASS [ ] FAIL

---

### Test 5.2: Valid Credentials Allowed
**Objective:** Verify admin can access with credentials

**Request:**
```bash
curl -u admin:test_password_123 http://localhost:9201/api/admin/orders?limit=5
```

**Expected Response:**
- HTTP Status: 200 OK
- Body: `{ "ok": true, "orders": [...], "pagination": {...} }`

**Status:** [ ] PASS [ ] FAIL

---

### Test 5.3: List Orders with Filters
**Objective:** Test query parameter filtering

**Request:**
```bash
curl -u admin:test_password_123 \
  "http://localhost:9201/api/admin/orders?status=new&q=ATMEGA&limit=10"
```

**Expected Response:**
- HTTP Status: 200 OK
- orders array filtered by status='new' and containing 'ATMEGA' in MPN

**Status:** [ ] PASS [ ] FAIL

---

### Test 5.4: Get Order Details
**Objective:** Retrieve full order by ID

**Prerequisite:** Create order and save orderId from response

**Request:**
```bash
ORDER_ID="<UUID from Test 2.1>"
curl -u admin:test_password_123 \
  "http://localhost:9201/api/admin/orders/$ORDER_ID"
```

**Expected Response:**
- HTTP Status: 200 OK
- Body includes: customer_contact (full), dealer_links (array of 4), meta

**Status:** [ ] PASS [ ] FAIL

---

### Test 5.5: Update Order Status (Valid)
**Objective:** Change order status from new → in_progress

**Request:**
```bash
ORDER_ID="<UUID from Test 2.1>"
curl -X PATCH \
  -u admin:test_password_123 \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' \
  "http://localhost:9201/api/admin/orders/$ORDER_ID"
```

**Expected Response:**
- HTTP Status: 200 OK
- Body: `{ "ok": true, "orderId": "<UUID>", "status": "in_progress", "updated_at": <timestamp> }`

**Verify in Database:**
```bash
sqlite3 cache.json "SELECT status, updated_at FROM orders WHERE id='$ORDER_ID';"
```

**Expected:**
- status='in_progress'
- updated_at > created_at

**Status:** [ ] PASS [ ] FAIL

---

### Test 5.6: Update Order Status (Invalid)
**Objective:** Reject invalid status value

**Request:**
```bash
ORDER_ID="<UUID from Test 2.1>"
curl -X PATCH \
  -u admin:test_password_123 \
  -H "Content-Type: application/json" \
  -d '{"status":"invalid_status"}' \
  "http://localhost:9201/api/admin/orders/$ORDER_ID"
```

**Expected Response:**
- HTTP Status: 400 Bad Request
- Body contains: `"must be equal to one of the allowed values"`

**Status:** [ ] PASS [ ] FAIL

---

### Test 5.7: Update Non-Existent Order
**Objective:** Return 404 for missing order

**Request:**
```bash
curl -X PATCH \
  -u admin:test_password_123 \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}' \
  "http://localhost:9201/api/admin/orders/00000000-0000-0000-0000-000000000000"
```

**Expected Response:**
- HTTP Status: 404 Not Found
- Body: `{ "ok": false, "error": "not_found", "message": "Order not found" }`

**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 6: Prometheus Metrics

### Test 6.1: Metrics Endpoint Accessible
**Objective:** Verify /api/metrics returns data

**Request:**
```bash
curl http://localhost:9201/api/metrics
```

**Expected Response:**
- HTTP Status: 200 OK
- Content-Type: `text/plain; version=0.0.4; charset=utf-8`
- Body contains:
  - `# HELP orders_total`
  - `# TYPE orders_total counter`
  - `orders_total{status="accepted"}`
  - `orders_total{status="rejected"}`

**Status:** [ ] PASS [ ] FAIL

---

### Test 6.2: Orders Total Counter
**Objective:** Verify counter increments on order creation

**Steps:**
1. Get current value:
   ```bash
   curl -s http://localhost:9201/api/metrics | grep 'orders_total{status="accepted"' | awk '{print $2}'
   ```
2. Create one order (Test 2.1)
3. Get new value:
   ```bash
   curl -s http://localhost:9201/api/metrics | grep 'orders_total{status="accepted"' | awk '{print $2}'
   ```

**Expected:**
- New value = Old value + 1

**Status:** [ ] PASS [ ] FAIL

---

### Test 6.3: Orders By Status Gauge
**Objective:** Verify gauge reflects database state

**Steps:**
1. Get current counts from metrics:
   ```bash
   curl -s http://localhost:9201/api/metrics | grep orders_by_status
   ```
2. Get counts from database:
   ```bash
   sqlite3 cache.json "SELECT status, COUNT(*) FROM orders GROUP BY status;"
   ```

**Expected:**
- Metrics match database counts

**Status:** [ ] PASS [ ] FAIL

---

### Test 6.4: Order Duration Histogram
**Objective:** Verify histogram records timing

**Request:**
```bash
curl -s http://localhost:9201/api/metrics | grep order_create_duration_seconds
```

**Expected Output (example):**
```
order_create_duration_seconds_bucket{le="0.01"} 5
order_create_duration_seconds_bucket{le="0.05"} 12
order_create_duration_seconds_sum 0.432
order_create_duration_seconds_count 15
```

**Expected:**
- Buckets have increasing counts
- sum/count = average duration

**Status:** [ ] PASS [ ] FAIL

---

## Test Suite 7: Integration

### Test 7.1: End-to-End Order Flow
**Objective:** Complete order lifecycle

**Steps:**
1. Create order (POST /api/order) → save orderId
2. List orders as admin (GET /api/admin/orders) → verify order appears
3. Get order details (GET /api/admin/orders/:id) → verify all fields
4. Update status to 'in_progress' (PATCH) → verify response
5. Update status to 'done' (PATCH) → verify response
6. Check metrics → verify gauges updated

**Expected:**
- All steps succeed
- Metrics reflect changes

**Status:** [ ] PASS [ ] FAIL

---

## Test Summary

**Total Tests:** 30

**Results:**
- PASS: ___ / 30
- FAIL: ___ / 30
- SKIP: ___ / 30

**Test Environment:**
- Server: _______________
- Date: _______________
- Tester: _______________

**Notes:**
_______________________________
_______________________________
_______________________________

**Sign-off:**
- QA Lead: _______________ Date: _______________
- Backend Lead: _______________ Date: _______________

---

**Document Version:** 1.0  
**Next Review:** After each deployment
