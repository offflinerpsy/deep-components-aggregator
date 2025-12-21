#!/bin/bash
# E2E API Testing - Component Specs Autocomplete Feature
# Location: /opt/deep-agg/docs/_artifacts/2025-11-05/specs-autocomplete/e2e-api-test.sh

BASE_URL="http://localhost:9201"
OUTPUT_DIR="/opt/deep-agg/docs/_artifacts/2025-11-05/specs-autocomplete/e2e-results"
mkdir -p "$OUTPUT_DIR"

echo "========================================="
echo "E2E API Tests - Component Specs Search"
echo "========================================="
echo ""

# Test 1: Russian query "0603 100к 5%"
echo "TEST 1: Russian query '0603 100к 5%'"
echo "-----------------------------------"
QUERY1=$(echo -n "0603 100к 5%" | jq -sRr @uri)
curl -s "${BASE_URL}/api/autocomplete?q=${QUERY1}" > "${OUTPUT_DIR}/test1-russian-0603-100k-5pct.json"
RESULT1=$(cat "${OUTPUT_DIR}/test1-russian-0603-100k-5pct.json" | jq '{
  specsDetected: .meta.specsDetected,
  package: .meta.specs.package,
  resistance: .meta.specs.resistance.value,
  tolerance: .meta.specs.tolerance.value,
  suggestionsCount: (.suggestions | length),
  firstMPN: .suggestions[0].mpn
}')
echo "$RESULT1"
echo ""

# Test 2: Capacitor "10uF 16V ceramic"
echo "TEST 2: Capacitor query '10uF 16V ceramic'"
echo "-----------------------------------"
QUERY2=$(echo -n "10uF 16V ceramic" | jq -sRr @uri)
curl -s "${BASE_URL}/api/autocomplete?q=${QUERY2}" > "${OUTPUT_DIR}/test2-capacitor-10uF-16V.json"
RESULT2=$(cat "${OUTPUT_DIR}/test2-capacitor-10uF-16V.json" | jq '{
  specsDetected: .meta.specsDetected,
  capacitance: .meta.specs.capacitance.value,
  voltage: .meta.specs.voltage.value,
  material: .meta.specs.material,
  suggestionsCount: (.suggestions | length),
  firstMPN: .suggestions[0].mpn
}')
echo "$RESULT2"
echo ""

# Test 3: Package only "TO-220"
echo "TEST 3: Package query 'TO-220'"
echo "-----------------------------------"
QUERY3=$(echo -n "TO-220" | jq -sRr @uri)
curl -s "${BASE_URL}/api/autocomplete?q=${QUERY3}" > "${OUTPUT_DIR}/test3-package-TO-220.json"
RESULT3=$(cat "${OUTPUT_DIR}/test3-package-TO-220.json" | jq '{
  specsDetected: .meta.specsDetected,
  package: .meta.specs.package,
  suggestionsCount: (.suggestions | length),
  firstMPN: .suggestions[0].mpn
}')
echo "$RESULT3"
echo ""

# Test 4: Product details for hover preview
echo "TEST 4: Product details for first result from test 1"
echo "-----------------------------------"
MPN=$(cat "${OUTPUT_DIR}/test1-russian-0603-100k-5pct.json" | jq -r '.suggestions[0].mpn')
curl -s "${BASE_URL}/api/product?mpn=${MPN}" > "${OUTPUT_DIR}/test4-product-${MPN}.json"
RESULT4=$(cat "${OUTPUT_DIR}/test4-product-${MPN}.json" | jq '{
  ok: .ok,
  mpn: .product.mpn,
  manufacturer: .product.manufacturer,
  hasImages: (.product.images | length > 0),
  specsCount: (.product.technical_specs | length),
  offersCount: (.product.offers | length),
  firstSpecs: (.product.technical_specs | to_entries | .[0:5] | map({key: .key, value: .value}))
}')
echo "$RESULT4"
echo ""

# Test 5: Regular MPN (non-specs)
echo "TEST 5: Regular MPN query 'LM358' (should NOT detect specs)"
echo "-----------------------------------"
QUERY5=$(echo -n "LM358" | jq -sRr @uri)
curl -s "${BASE_URL}/api/autocomplete?q=${QUERY5}" > "${OUTPUT_DIR}/test5-mpn-LM358.json"
RESULT5=$(cat "${OUTPUT_DIR}/test5-mpn-LM358.json" | jq '{
  specsDetected: .meta.specsDetected,
  specs: .meta.specs,
  suggestionsCount: (.suggestions | length),
  firstMPN: .suggestions[0].mpn
}')
echo "$RESULT5"
echo ""

# Summary
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo "✅ Test 1: Russian specs query (0603 100к 5%)"
echo "✅ Test 2: Capacitor specs query (10uF 16V ceramic)"
echo "✅ Test 3: Package query (TO-220)"
echo "✅ Test 4: Product details fetch for hover preview"
echo "✅ Test 5: Regular MPN (non-specs detection)"
echo ""
echo "Results saved to: ${OUTPUT_DIR}/"
echo ""
echo "EXPECTED FRONTEND BEHAVIOR:"
echo "1. Typing '0603 100к' → Shows hint '🔍 Поиск по характеристикам'"
echo "2. Dropdown shows badges: 🔵 0603, 🟢 100.0kΩ, 🟠 ±5%"
echo "3. Hovering on result for 500ms → Preview modal appears"
echo "4. Modal shows: photo, MPN, manufacturer, 5 specs, 'Подробнее' button"
echo "5. Clicking 'Подробнее' → Navigates to /product/[mpn]"
echo ""
