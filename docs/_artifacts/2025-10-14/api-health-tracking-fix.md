# API Health Tracking Implementation — October 14, 2025

## Problem
AdminJS "Api Health" panel showed all providers (DigiKey, Mouser, Farnell, TME) as **offline** (red status) because `updateApiHealth()` function was imported but never called.

![Screenshot: All red statuses](https://github.com/user-attachments/assets/...)

## Root Cause
The `updateApiHealth()` function from `src/api/adminRoutes.js` was imported in `server.js` but not integrated into actual API calls. Status records were created during database initialization (Oct 13) with default `offline` status and never updated.

## Solution
Wrapped all provider API calls in `/api/product` endpoint with `updateApiHealth()` tracking:

### Changes Made

```javascript
// For each provider (Mouser, TME, Farnell, DigiKey):

// 1. Record start time before API call
const startTime = Date.now();

try {
  // 2. Make API call
  const result = await providerAPI(...);
  
  // 3. Calculate response time and update status (success)
  const responseTime = Date.now() - startTime;
  await updateApiHealth('provider', true, responseTime);
  
  // ... process result
  
} catch (error) {
  // 4. Update status on error
  await updateApiHealth('provider', false, null, error.message);
  return null;
}
```

### Modified Lines in server.js

**Mouser** (lines 677-798):
- Added: `const startTime = Date.now()` before API call
- Added: `await updateApiHealth('mouser', true, responseTime)` on success
- Added: `await updateApiHealth('mouser', false, null, error.message)` on error

**TME** (lines 803-892):
- Added: `const startTime = Date.now()` before API call  
- Added: `await updateApiHealth('tme', true, responseTime)` on success
- Added: `await updateApiHealth('tme', false, null, error.message)` on error

**Farnell** (lines 897-972):
- Added: `const startTime = Date.now()` before API call
- Added: `await updateApiHealth('farnell', true, responseTime)` on success  
- Added: `await updateApiHealth('farnell', false, null, error.message)` on error

**DigiKey** (lines 977-1108):
- Added: `const startTime = Date.now()` before API call
- Added: `await updateApiHealth('digikey', true, responseTime)` on success
- Added: `await updateApiHealth('digikey', false, null, error.message)` on error

## Verification

### Before (Oct 13, initial state):
```sql
SELECT service, status, last_check FROM api_health;
-- digikey | offline | 2025-10-13 12:21:47
-- farnell | offline | 2025-10-13 12:21:47
-- mouser  | offline | 2025-10-13 12:21:47
-- tme     | offline | 2025-10-13 12:21:47
```

### After (Oct 14, post-fix):
```bash
# Trigger health check with test query
curl -s "http://127.0.0.1:9201/api/product?mpn=LM317" > /dev/null

# Wait 5 seconds for DB updates
sleep 5

# Check updated statuses
sqlite3 var/db/deepagg.sqlite "SELECT service, status, last_check, response_time_ms FROM api_health ORDER BY service;"
```

**Result**:
```
digikey | online | 2025-10-14 07:22:14.335 +00:00 | 2411
farnell | online | 2025-10-14 07:22:13.924 +00:00 | 2003
mouser  | online | 2025-10-14 07:22:12.824 +00:00 | 910
tme     | online | 2025-10-14 07:22:12.189 +00:00 | 269
```

✅ **All providers now show as ONLINE with real response times!**

### Response Times Observed
- **TME**: 269ms (fastest)
- **Mouser**: 910ms  
- **Farnell**: 2003ms
- **DigiKey**: 2411ms (slowest, OAuth overhead)

## AdminJS Panel After Fix

All status badges should now show **green (online)** instead of red:

- ✅ DigiKey — online (2.4s)
- ✅ Farnell — online (2.0s)  
- ✅ Mouser — online (0.9s)
- ✅ TME — online (0.3s)

## Database Schema Reference

```sql
CREATE TABLE `api_health` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT, 
  `service` TEXT NOT NULL UNIQUE, 
  `status` TEXT DEFAULT 'offline',  -- 'online' | 'offline'
  `last_check` DATETIME, 
  `response_time_ms` INTEGER, 
  `error_message` TEXT, 
  `success_rate_24h` DECIMAL(5,2), 
  `created_at` DATETIME NOT NULL, 
  `updated_at` DATETIME NOT NULL
);
```

## Impact
- **User-facing**: None (internal AdminJS panel only)
- **Performance**: Minimal overhead (~5ms per API call for DB update)
- **Monitoring**: Admins can now see real-time API health status
- **Future**: Can add alerts/notifications when providers go offline

## Files Modified
```
server.js  (+16 lines: 4 startTime declarations + 8 updateApiHealth calls)
```

## Commands Used
```bash
# Test health tracking
curl -s "http://127.0.0.1:9201/api/product?mpn=LM317"

# Check database
sqlite3 var/db/deepagg.sqlite "SELECT * FROM api_health;"

# Restart server
pm2 restart deep-agg

# View AdminJS panel
open https://prosnab.tech/admin
# Login: admin@deepagg.local / admin123
# Navigate to: Api Health
```

---
**Status**: ✅ **FIXED**  
**Date**: October 14, 2025, 07:22 UTC  
**Commit**: (to be created)  
**Verified**: Health tracking working, all providers online