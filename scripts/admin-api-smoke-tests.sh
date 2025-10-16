#!/bin/bash
# Admin API Smoke Tests
# Tests basic functionality of the admin API endpoints

# Configuration
API_BASE="http://localhost:9201"
# For production with Basic Auth, use:
# API_BASE="https://prosnab.tech"
# AUTH="-u admin:your_password"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
  local name="$1"
  local command="$2"
  local expected_status="$3"
  
  echo -e "\n${YELLOW}Running test: ${name}${NC}"
  echo "Command: $command"
  
  # Run the command and capture output and status code
  output=$(eval $command 2>&1)
  status=$?
  
  # Check if curl returned the expected HTTP status
  if echo "$output" | grep -q "HTTP/1.1 $expected_status"; then
    echo -e "${GREEN}✓ Test passed: Got expected status $expected_status${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ Test failed: Expected status $expected_status${NC}"
    echo "Output: $output"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  
  # Return the output for further processing if needed
  echo "$output"
}

echo "=== Admin API Smoke Tests ==="
echo "API Base: $API_BASE"
echo "Starting tests..."

# Test 1: List Orders
run_test "List Orders" "curl -sI $AUTH $API_BASE/api/admin/orders" "200"

# Test 2: Get Order by ID
# First, get an order ID from the list
order_id=$(curl -s $AUTH $API_BASE/api/admin/orders | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$order_id" ]; then
  run_test "Get Order by ID" "curl -sI $AUTH $API_BASE/api/admin/orders/$order_id" "200"
else
  echo -e "${YELLOW}Skipping 'Get Order by ID' test: No orders found${NC}"
fi

# Test 3: List Static Pages
run_test "List Static Pages" "curl -sI $AUTH $API_BASE/api/admin/pages" "200"

# Test 4: Create Static Page
page_data='{"slug":"test-page","title":"Test Page","content":"This is a test page","meta_description":"Test page for smoke tests","is_published":true,"position":"footer","sort_order":999}'
create_output=$(run_test "Create Static Page" "curl -sI $AUTH -X POST -H 'Content-Type: application/json' -d '$page_data' $API_BASE/api/admin/pages" "200")

# Extract page ID from create response
page_id=$(echo "$create_output" | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -n "$page_id" ]; then
  # Test 5: Get Static Page by ID
  run_test "Get Static Page by ID" "curl -sI $AUTH $API_BASE/api/admin/pages/$page_id" "200"
  
  # Test 6: Update Static Page
  update_data='{"title":"Updated Test Page","content":"This content has been updated"}'
  run_test "Update Static Page" "curl -sI $AUTH -X PATCH -H 'Content-Type: application/json' -d '$update_data' $API_BASE/api/admin/pages/$page_id" "200"
  
  # Test 7: Delete Static Page
  run_test "Delete Static Page" "curl -sI $AUTH -X DELETE $API_BASE/api/admin/pages/$page_id" "200"
else
  echo -e "${YELLOW}Skipping page tests: Failed to create test page${NC}"
fi

# Test 8: Get Public Static Pages
run_test "Get Public Static Pages" "curl -sI $API_BASE/api/static-pages" "200"

# Test 9: Get Header Pages
run_test "Get Header Pages" "curl -sI $API_BASE/api/static-pages/header" "200"

# Test 10: Get Footer Pages
run_test "Get Footer Pages" "curl -sI $API_BASE/api/static-pages/footer" "200"

# Print summary
echo -e "\n=== Test Summary ==="
echo -e "Total tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}Some tests failed!${NC}"
  exit 1
fi
