#!/bin/bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

cd /opt/deep-agg

echo "===== E2E TESTS START ====="
echo "Date: $(date)"
echo ""

npx playwright test \
  --config=playwright-e2e.config.ts \
  e2e/complete-flow.spec.ts \
  --project=chromium \
  --reporter=list

EXIT_CODE=$?

echo ""
echo "===== E2E TESTS END ====="
echo "Exit code: $EXIT_CODE"
echo "Date: $(date)"

exit $EXIT_CODE
