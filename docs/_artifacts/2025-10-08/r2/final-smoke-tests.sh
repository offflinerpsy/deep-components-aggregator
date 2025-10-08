#!/bin/bash
set -euo pipefail

echo "=== Final Smoke Tests After R2 Fixes ==="
echo

# 1. Admin products должен быть 401
echo "1. Testing /api/admin/products (should be 401)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:9201/api/admin/products")
if [ "$STATUS" = "401" ]; then
  echo "   ✅ Returns 401 Unauthorized (correct)"
else
  echo "   ❌ Returns $STATUS (expected 401)"
fi
echo

# 2. Guest order creation
echo "2. Testing POST /api/order (guest order)..."
RESPONSE=$(curl -s -X POST "http://127.0.0.1:9201/api/order" \
  -H "Content-Type: application/json" \
  -d '{"customer":{"name":"Smoke Test","contact":{"email":"smoke@test.local"}},"item":{"mpn":"TEST-PART","manufacturer":"TestCo","qty":1}}')

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
  ORDER_ID=$(echo "$RESPONSE" | jq -r '.orderId')
  echo "   ✅ Order created: $ORDER_ID"
else
  echo "   ❌ Order failed: $RESPONSE"
fi
echo

# 3. Currency rates
echo "3. Testing currency module..."
CURRENCY_TEST=$(node -e "
import('./src/currency.js').then(async (mod) => {
  const usd = await mod.convertToRub('USD', 1);
  const eur = await mod.convertToRub('EUR', 1);
  console.log(\`USD: \${usd}₽, EUR: \${eur}₽\`);
  if (usd > 0 && eur > 0) {
    console.log('✅ Currency conversion working');
  } else {
    console.log('❌ Currency conversion failed');
  }
});
" 2>&1)
echo "   $CURRENCY_TEST"
echo

echo "=== Smoke Tests Complete ===="
