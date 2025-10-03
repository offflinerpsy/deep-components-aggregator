#!/bin/bash
# test-auth-flow.sh - Test Auth & Orders flow on production
set -euo pipefail

SERVER="5.129.228.88"
BASE_URL="http://localhost:9201"

echo "=== Auth & Orders Flow Test ==="
echo ""

# 1) Register
echo "[1/6] Register new user..."
EMAIL="test$(date +%s)@example.com"
PASS="TestPass123"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"confirmPassword\":\"$PASS\",\"name\":\"Test User\"}")

echo "Response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q '"ok":true'; then
  echo "✓ Registration successful"
else
  echo "✗ Registration failed"
  exit 1
fi

# 2) Login
echo ""
echo "[2/6] Login..."
LOGIN_RESPONSE=$(curl -s -c /tmp/cookies.txt -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

echo "Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"ok":true'; then
  echo "✓ Login successful"
else
  echo "✗ Login failed"
  exit 1
fi

# 3) Verify session
echo ""
echo "[3/6] Verify session (/auth/me)..."
ME_RESPONSE=$(curl -s -b /tmp/cookies.txt "$BASE_URL/auth/me")
echo "Response: $ME_RESPONSE"

if echo "$ME_RESPONSE" | grep -q "$EMAIL"; then
  echo "✓ Session verified"
else
  echo "✗ Session verification failed"
  exit 1
fi

# 4) Check active sessions
echo ""
echo "[4/6] Check active sessions in DB..."
cd /opt/deep-agg
SESSIONS_COUNT=$(node -e "const db = require('better-sqlite3')('var/db/deepagg.sqlite'); console.log(db.prepare('SELECT COUNT(*) as cnt FROM sessions').get().cnt);")
echo "Active sessions: $SESSIONS_COUNT"

if [ "$SESSIONS_COUNT" -gt 0 ]; then
  echo "✓ Sessions exist in DB"
else
  echo "⚠ No active sessions (may have expired)"
fi

# 5) Create order
echo ""
echo "[5/6] Create order..."
ORDER_RESPONSE=$(curl -s -b /tmp/cookies.txt -X POST "$BASE_URL/api/order" \
  -H 'Content-Type: application/json' \
  -d "{\"customer\":{\"name\":\"Test User\",\"contact\":{\"email\":\"$EMAIL\"}},\"item\":{\"mpn\":\"LM317\",\"manufacturer\":\"Texas Instruments\",\"qty\":100},\"meta\":{\"comment\":\"Test order from automated flow\"}}")

echo "Response: $ORDER_RESPONSE"

if echo "$ORDER_RESPONSE" | grep -q '"ok":true\|"id"'; then
  echo "✓ Order created"
else
  echo "✗ Order creation failed"
  exit 1
fi

# 6) Verify order in DB
echo ""
echo "[6/6] Verify order in DB..."
ORDER_DATA=$(node -e "const db = require('better-sqlite3')('var/db/deepagg.sqlite'); const order = db.prepare('SELECT o.id, o.mpn, o.qty, o.status, u.email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 1').get(); console.log(JSON.stringify(order, null, 2));")

echo "$ORDER_DATA"

if echo "$ORDER_DATA" | grep -q "LM317"; then
  echo "✓ Order found in DB"
else
  echo "✗ Order not found in DB"
  exit 1
fi

echo ""
echo "=== All tests passed! ==="
