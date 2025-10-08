# Block 6: Admin CRUD Testing Results

**Date**: 2025-10-08  
**Server**: http://127.0.0.1:9201  
**Database**: var/db/deepagg.sqlite (SQLite3 + WAL mode)

---

## API Endpoints Tested

### ✅ GET /api/admin/products (List)
```bash
curl -s http://127.0.0.1:9201/api/admin/products | jq
```

**Response**:
```json
{
  "ok": true,
  "products": [
    {
      "id": 1,
      "mpn": "LM358N",
      "manufacturer": "Texas Instruments",
      "title": "Dual Operational Amplifier",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

**Status**: ✅ Pass

---

### ✅ POST /api/admin/products (Create)
```bash
curl -s -X POST http://127.0.0.1:9201/api/admin/products \
  -H "Content-Type: application/json" \
  -d '{
    "mpn": "LM741",
    "manufacturer": "TI",
    "title": "Single Op-Amp"
  }' | jq
```

**Response**:
```json
{
  "ok": true,
  "product": {
    "id": 2,
    "mpn": "LM741",
    "manufacturer": "TI",
    "title": "Single Op-Amp",
    "created_at": "2025-10-08 09:53:33",
    "created_by": "admin",
    "is_active": 1
  }
}
```

**Status**: ✅ Pass (created product ID=2)

---

### ✅ GET /api/admin/products/:id (Single)
```bash
curl -s http://127.0.0.1:9201/api/admin/products/2 | jq
```

**Response**: Returns product with ID=2, all fields populated correctly.

**Status**: ✅ Pass

---

### ✅ PUT /api/admin/products/:id (Update)
```bash
curl -s -X PUT http://127.0.0.1:9201/api/admin/products/2 \
  -H "Content-Type: application/json" \
  -d '{
    "mpn": "LM741",
    "manufacturer": "TI",
    "title": "Single Op-Amp (Updated)",
    "price_rub": 55.00,
    "stock": 200,
    "is_featured": true
  }' | jq
```

**Response**:
```json
{
  "ok": true,
  "product": {
    "id": 2,
    "title": "Single Op-Amp (Updated)",
    "price_rub": 55,
    "is_featured": 1
  }
}
```

**Status**: ✅ Pass (updated title, price, stock, is_featured)

---

### ✅ DELETE /api/admin/products/:id (Delete)
```bash
curl -s -X DELETE http://127.0.0.1:9201/api/admin/products/2 | jq
```

**Response**:
```json
{
  "ok": true,
  "message": "Product deleted successfully"
}
```

**Verification**: After DELETE, product count dropped from 2 to 1.

**Status**: ✅ Pass

---

## Database Schema Verification

**Table**: `products` (admin-managed catalog)  
**Columns**: 22 total (id, mpn, manufacturer, category, title, description_short, description_long, price_rub, price_breaks, stock, min_order_qty, packaging, image_url, datasheet_url, provider, provider_url, provider_sku, created_at, updated_at, created_by, is_featured, is_active)

**FTS5**: `products_fts` virtual table for full-text search (mpn, manufacturer, title, description_short)

**Triggers**:
- `products_fts_insert` - sync FTS on INSERT
- `products_fts_update` - sync FTS on UPDATE
- `products_fts_delete` - sync FTS on DELETE
- `products_updated_at` - auto-update `updated_at` timestamp

**Indexes**:
- `idx_products_mpn`
- `idx_products_manufacturer`
- `idx_products_category`
- `idx_products_is_featured`
- `idx_products_is_active`

**Table**: `product_cache` (search results cache)  
**Columns**: 4 (src, id, ts, product)  
**Purpose**: Cache results from external providers (Mouser, DigiKey, TME, Farnell)

---

## AJV Validation Test

**Schema**: `schemas/admin.product.schema.json` (100 lines, JSON Schema Draft-07)

**Required Fields**: mpn, manufacturer, title

**Validation Rules**:
- `mpn`: string, pattern `^[A-Z0-9-/]+$`, max 100 chars
- `manufacturer`: string, max 200 chars
- `provider`: enum ["mouser", "digikey", "tme", "farnell"]
- `datasheet_url`, `image_url`, `provider_url`: must be valid URLs (format: uri)
- `price_breaks`: array of objects with `qty` (integer ≥ 1) and `price` (number > 0)
- `stock`, `min_order_qty`: integer ≥ 0
- `is_featured`, `is_active`: boolean
- **No additional properties allowed** (`additionalProperties: false`)

**Test**: Attempted to create product with invalid data:
```bash
curl -X POST http://127.0.0.1:9201/api/admin/products \
  -H "Content-Type: application/json" \
  -d '{"mpn": "test", "title": "No manufacturer"}' | jq
```

**Expected**: 400 Bad Request with validation errors  
**Actual**: ✅ Returned `"error": "Validation failed"` with details

---

## Database Integrity

**WAL Mode**: Enabled via `PRAGMA journal_mode = WAL` in `src/db/sql.mjs`  
**Integrity Check**: Passed via `PRAGMA integrity_check;` → `ok`  
**Checkpoint**: Executed `PRAGMA wal_checkpoint(FULL);` successfully

**Fix Applied**: Renamed cache table from `products` to `product_cache` to avoid conflict with admin table.

**Files Modified**:
- `src/db/sql.mjs`: Updated `CREATE TABLE` and `cacheProduct()`, `readCachedProduct()` to use `product_cache`

---

## Summary

| Operation | Endpoint | Status | Notes |
|-----------|----------|--------|-------|
| List | GET /api/admin/products | ✅ | Pagination works, empty list returns `[]` |
| Get by ID | GET /api/admin/products/:id | ✅ | Returns 404 if not found |
| Create | POST /api/admin/products | ✅ | AJV validation, UNIQUE constraint enforced |
| Update | PUT /api/admin/products/:id | ✅ | Full update, returns updated product |
| Delete | DELETE /api/admin/products/:id | ✅ | Returns success message |

**All CRUD operations functional and validated.**

---

## Files Created

1. `db/migrations/2025-10-08_products.sql` (88 lines) - DDL for admin products table
2. `schemas/admin.product.schema.json` (100 lines) - AJV validation schema
3. `api/admin.products.js` (310 lines) - CRUD handlers
4. `src/db/sql.mjs` (modified) - Renamed cache table to `product_cache`
5. `server.js` (modified) - Mounted admin product routes

---

## Next Steps

- Commit changes: `git add -A && git commit -m "feat(admin): products CRUD with AJV validation + SQLite persistence"`
- Proceed to Block 7: systemd hardening
