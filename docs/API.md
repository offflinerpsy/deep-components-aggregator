# API Documentation: Orders & Authentication

## Overview
The API provides endpoints for user authentication (with OAuth support), customer order creation, and admin management. All endpoints return JSON responses.

**Base URL:** `http://5.129.228.88:9201`

---

## Table of Contents
- [Authentication Endpoints](#authentication-endpoints)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/logout](#post-authlogout)
  - [GET /auth/me](#get-authme)
  - [OAuth Flow](#oauth-flow-googleyandex)
- [User Endpoints (Require Auth)](#user-endpoints-require-auth)
  - [GET /api/user/orders](#get-apiuserorders)
  - [GET /api/user/orders/:id](#get-apiuserordersid)
- [Public Endpoints (Require Auth)](#public-endpoints-require-auth)
  - [POST /api/order](#post-apiorder)
- [Admin Endpoints (Protected)](#admin-endpoints-protected)
  - [GET /api/admin/orders](#get-apiadminorders)
  - [GET /api/admin/orders/:id](#get-apiadminordersid)
  - [PATCH /api/admin/orders/:id](#patch-apiadminordersid)
- [Metrics Endpoint](#metrics-endpoint)
  - [GET /api/metrics](#get-apimetrics)
- [Error Responses](#error-responses)

---

## Authentication Endpoints

### POST /auth/register

**Description:** Register a new user with email and password

**Rate Limiting:** 5 requests per 15 minutes per IP

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com (required, RFC 5322)",
  "password": "string (min 8 chars, required)",
  "confirmPassword": "string (must match password)",
  "name": "string (optional, 2-128 chars)"
}
```

**Success Response:** `200 OK`
```json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error (password mismatch, invalid email, etc.)
- `409 Conflict`: User with this email already exists
- `429 Too Many Requests`: Rate limit exceeded

---

### POST /auth/login

**Description:** Authenticate with email and password

**Rate Limiting:** 5 requests per 15 minutes per IP

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "string"
}
```

**Success Response:** `200 OK`
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded

**Note:** Sets `HttpOnly`, `Secure` (in production), `SameSite=Lax` session cookie. Cookie expires after 7 days.

---

### POST /auth/logout

**Description:** Destroy current user session

**Success Response:** `200 OK`
```json
{
  "message": "Logout successful"
}
```

---

### GET /auth/me

**Description:** Get current authenticated user info

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "provider": "local"
}
```

**Error Response:** `401 Unauthorized` if not logged in

---

### OAuth Flow (Google/Yandex)

**Google Login:**
1. Redirect user to `/auth/google`
2. User authorizes with Google
3. Callback to `/auth/google/callback`
4. On success: Redirect to `/ui/my-orders.html`
5. On failure: Redirect to `/ui/auth.html?error=google`

**Yandex Login:**
1. Redirect user to `/auth/yandex`
2. User authorizes with Yandex
3. Callback to `/auth/yandex/callback`
4. On success: Redirect to `/ui/my-orders.html`
5. On failure: Redirect to `/ui/auth.html?error=yandex`

**Required Environment Variables:**
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
YANDEX_CLIENT_ID=your_client_id
YANDEX_CLIENT_SECRET=your_secret
SESSION_SECRET=random_32+_byte_string
```

---

## User Endpoints (Require Auth)

### GET /api/user/orders

**Description:** Get paginated list of orders belonging to authenticated user

**Authentication Required:** Yes (401 if not logged in)

**Rate Limiting:** 10 requests per minute per user

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 25, max: 100): Items per page
- `status` (string, optional): Filter by status (`pending`, `processing`, `completed`, `cancelled`)

**Success Response:** `200 OK`
```json
{
  "orders": [
    {
      "id": "uuid",
      "part_number": "ATMEGA328P-PU",
      "quantity": 10,
      "status": "pending",
      "created_at": "2025-10-02T12:34:56.789Z",
      "updated_at": "2025-10-02T12:34:56.789Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 25
}
```

---

### GET /api/user/orders/:id

**Description:** Get detailed information about a specific order (user must own it)

**Authentication Required:** Yes (401 if not logged in)

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "part_number": "ATMEGA328P-PU",
  "quantity": 10,
  "status": "pending",
  "customer_name": "Иван Петров",
  "customer_email": "ivan@example.com",
  "customer_phone": "+79161234567",
  "customer_telegram": "@ivan",
  "manufacturer": "Microchip",
  "pricing_snapshot": {
    "base_price_rub": 150,
    "markup_percent": 0.3,
    "final_price_rub": 195
  },
  "notes": "Urgent order",
  "created_at": "2025-10-02T12:34:56.789Z",
  "updated_at": "2025-10-02T12:34:56.789Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Not logged in
- `404 Not Found`: Order doesn't exist OR doesn't belong to current user (no info disclosure)

---

## Public Endpoints (Require Auth)

### POST /api/order

**Description:** Create a new customer order

**Authentication Required:** Yes (401 if not logged in)

**Rate Limiting:** 10 requests per minute per user

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "customer": {
    "name": "string (2-128 chars)",
    "contact": {
      "email": "user@example.com (optional, RFC 5322 format)",
      "phone": "+79161234567 (optional, E.164 format)",
      "telegram": "@username (optional, 5-32 chars)"
    }
  },
  "item": {
    "mpn": "string (1-64 chars, manufacturer part number)",
    "manufacturer": "string (1-128 chars)",
    "qty": integer (>= 1)
  },
  "pricing_snapshot": {
    "base_price_rub": number (>= 0, optional)",
    "markup_percent": number (0-1, optional)",
    "markup_fixed_rub": number (>= 0, optional)",
    "final_price_rub": number (>= 0, optional)"
  },
  "meta": {
    "comment": "string (max 500 chars, optional)"
  }
}
```

**Important Notes:**
- **At least ONE contact method** is required (email, phone, or telegram)
- `pricing_snapshot` is optional; if not provided, pricing will be calculated from `settings.pricing_policy`
- All fields follow `additionalProperties: false` — extra fields will cause validation errors

**Example Request (Minimal):**
```json
{
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
}
```

**Example Request (Full):**
```json
{
  "customer": {
    "name": "ООО \"Электроника Плюс\"",
    "contact": {
      "email": "orders@electronics-plus.ru",
      "phone": "+79161234567",
      "telegram": "@electronics_plus"
    }
  },
  "item": {
    "mpn": "ATMEGA328P-PU",
    "manufacturer": "Microchip Technology",
    "qty": 100
  },
  "pricing_snapshot": {
    "base_price_rub": 250.00,
    "markup_percent": 0.30,
    "markup_fixed_rub": 500,
    "final_price_rub": 825
  },
  "meta": {
    "comment": "Срочный заказ, требуется до пятницы"
  }
}
```

**Success Response (201 Created):**
```json
{
  "ok": true,
  "orderId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (400 Bad Request - Validation Failed):**
```json
{
  "ok": false,
  "error": "validation_error",
  "errors": [
    {
      "field": "customer.name",
      "message": "must be string",
      "params": { "type": "string" }
    },
    {
      "field": "item.qty",
      "message": "must be >= 1",
      "params": { "comparison": ">=", "limit": 1 }
    }
  ]
}
```

**Error Response (429 Too Many Requests):**
```json
{
  "ok": false,
  "error": "rate_limit",
  "message": "Too many order requests. Please try again later.",
  "retry_after": 60
}
```

---

## Admin Endpoints (Protected)

**Authentication:** HTTP Basic Auth (configured in Nginx)

**How to authenticate:**
```bash
curl -u admin:password http://5.129.228.88:9201/api/admin/orders
```

**Unauthorized Response (401):**
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Basic realm="Admin Area"
```

---

### GET /api/admin/orders

**Description:** Get paginated list of orders with filtering

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `processing`, `completed`, `cancelled`)
- `q` (optional): Search by MPN, manufacturer, or customer name (partial match)
- `from` (optional): Start date (Unix timestamp in milliseconds)
- `to` (optional): End date (Unix timestamp in milliseconds)
- `limit` (optional): Page size (default: 50, max: 200)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```bash
GET /api/admin/orders?status=pending&limit=10&offset=0
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
```

**Success Response (200 OK):**
```json
{
  "ok": true,
  "orders": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": 1696204800000,
      "updated_at": 1696204800000,
      "customer_name": "Иван Петров",
      "mpn": "ATMEGA328P-PU",
      "manufacturer": "Microchip",
      "qty": 10,
      "pricing_snapshot": {
        "base_price_rub": 250,
        "markup_percent": 0.3,
        "markup_fixed_rub": 500,
        "final_price_rub": 825
      },
      "status": "pending"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

---

### GET /api/admin/orders/:id

**Description:** Get full details of a specific order

**Path Parameters:**
- `id`: Order UUID

**Example Request:**
```bash
GET /api/admin/orders/550e8400-e29b-41d4-a716-446655440000
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
```

**Success Response (200 OK):**
```json
{
  "ok": true,
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": 1696204800000,
    "updated_at": 1696204800000,
    "customer_name": "Иван Петров",
    "customer_contact": {
      "email": "ivan.petrov@example.com",
      "phone": "+79161234567",
      "telegram": "@ivan_petrov"
    },
    "mpn": "ATMEGA328P-PU",
    "manufacturer": "Microchip Technology",
    "qty": 10,
    "pricing_snapshot": {
      "base_price_rub": 250,
      "markup_percent": 0.3,
      "markup_fixed_rub": 500,
      "final_price_rub": 825
    },
    "dealer_links": [
      {
        "dealer": "mouser",
        "url": "https://www.mouser.com/ProductDetail/?q=ATMEGA328P-PU"
      },
      {
        "dealer": "digikey",
        "url": "https://www.digikey.com/en/products/result?keywords=ATMEGA328P-PU"
      },
      {
        "dealer": "tme",
        "url": "https://www.tme.eu/en/katalog/?search=ATMEGA328P-PU"
      },
      {
        "dealer": "farnell",
        "url": "https://www.farnell.com/search?st=ATMEGA328P-PU"
      }
    ],
    "status": "new",
    "meta": {
      "comment": "Срочный заказ"
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "ok": false,
  "error": "not_found",
  "message": "Order not found"
}
```

**Error Response (400 Bad Request - Invalid ID):**
```json
{
  "ok": false,
  "error": "invalid_id",
  "message": "Order ID must be a valid UUID"
}
```

---

### PATCH /api/admin/orders/:id

**Description:** Update order status

**Path Parameters:**
- `id`: Order UUID

**Request Headers:**
```
Content-Type: application/json
Authorization: Basic <credentials>
```

**Request Body:**
```json
{
  "status": "new" | "in_progress" | "done" | "cancelled"
}
```

**Status Transitions:**
```
new → in_progress → done
new → cancelled
in_progress → cancelled
in_progress → done
```

**Example Request:**
```bash
PATCH /api/admin/orders/550e8400-e29b-41d4-a716-446655440000
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
Content-Type: application/json

{
  "status": "in_progress"
}
```

**Success Response (200 OK):**
```json
{
  "ok": true,
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "updated_at": 1696208400000
}
```

**Error Response (400 Bad Request - Validation):**
```json
{
  "ok": false,
  "error": "validation_error",
  "errors": [
    {
      "field": "status",
      "message": "must be equal to one of the allowed values",
      "params": {
        "allowedValues": ["new", "in_progress", "done", "cancelled"]
      }
    }
  ]
}
```

---

## Metrics Endpoint

### GET /api/metrics

**Description:** Prometheus-compatible metrics endpoint

**Authentication:** Optional (can be protected by Nginx Basic Auth)

**Response Format:** Prometheus text-based format

**Example Request:**
```bash
GET /api/metrics
```

**Example Response:**
```
# HELP orders_total Total number of order requests
# TYPE orders_total counter
orders_total{status="accepted",app="deep-aggregator",version="3.0.0"} 127
orders_total{status="rejected",app="deep-aggregator",version="3.0.0"} 8

# HELP orders_by_status Current number of orders in each status
# TYPE orders_by_status gauge
orders_by_status{status="new",app="deep-aggregator",version="3.0.0"} 23
orders_by_status{status="in_progress",app="deep-aggregator",version="3.0.0"} 12
orders_by_status{status="done",app="deep-aggregator",version="3.0.0"} 87
orders_by_status{status="cancelled",app="deep-aggregator",version="3.0.0"} 5

# HELP order_create_duration_seconds Duration of order creation in seconds
# TYPE order_create_duration_seconds histogram
order_create_duration_seconds_bucket{le="0.01"} 15
order_create_duration_seconds_bucket{le="0.05"} 98
order_create_duration_seconds_bucket{le="0.1"} 125
order_create_duration_seconds_bucket{le="+Inf"} 127
order_create_duration_seconds_sum 8.432
order_create_duration_seconds_count 127
```

---

## Error Responses

### Standard Error Format
```json
{
  "ok": false,
  "error": "error_code",
  "message": "Human-readable message"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `validation_error` | 400 | Request body failed JSON Schema validation |
| `invalid_id` | 400 | Invalid order ID format (not a UUID) |
| `rate_limit` | 429 | Too many requests, rate limit exceeded |
| `not_found` | 404 | Order not found by ID |
| `configuration_error` | 500 | Server configuration issue (e.g., missing pricing policy) |

### Validation Error Details

Validation errors include an `errors` array with detailed information:

```json
{
  "ok": false,
  "error": "validation_error",
  "errors": [
    {
      "field": "customer.contact",
      "message": "At least one contact method is required",
      "params": {}
    }
  ]
}
```

**Common Validation Fields:**
- `customer.name`: String length (2-128 chars)
- `customer.contact.email`: RFC 5322 email format
- `customer.contact.phone`: E.164 phone format (+countrycode...)
- `customer.contact.telegram`: Must start with `@` (5-32 chars)
- `item.mpn`: String (1-64 chars)
- `item.manufacturer`: String (1-128 chars)
- `item.qty`: Integer >= 1
- `meta.comment`: String (max 500 chars)

---

## Testing Examples

### Create Order (curl)
```bash
curl -X POST http://5.129.228.88:9201/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Test User",
      "contact": {"email": "test@example.com"}
    },
    "item": {
      "mpn": "ATMEGA328P-PU",
      "manufacturer": "Microchip",
      "qty": 5
    }
  }'
```

### List Orders (curl with auth)
```bash
curl -u admin:password \
  "http://5.129.228.88:9201/api/admin/orders?status=new&limit=5"
```

### Update Order Status (curl)
```bash
curl -X PATCH \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' \
  http://5.129.228.88:9201/api/admin/orders/550e8400-e29b-41d4-a716-446655440000
```

### JavaScript (Fetch API)
```javascript
// Create order
const response = await fetch('http://5.129.228.88:9201/api/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customer: {
      name: 'Иван Петров',
      contact: { email: 'ivan@example.com' }
    },
    item: {
      mpn: 'ATMEGA328P-PU',
      manufacturer: 'Microchip',
      qty: 10
    }
  })
});

const data = await response.json();
console.log('Order ID:', data.orderId);
```

---

**API Version:** 3.0  
**Last Updated:** 2025-10-02  
**Maintainer:** Backend Team
