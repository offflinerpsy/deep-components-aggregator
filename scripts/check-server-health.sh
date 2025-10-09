#!/bin/bash
# Server Health Check - All Projects
# Checks status of all projects on shared server

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 Server Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Add PM2 to PATH
export PATH="/usr/local/bin:$PATH"

# 1. PM2 Process Status
echo "📊 PM2 Process Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 status
echo ""

# 2. Port Check
echo "🔌 Port Allocation:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Checking reserved ports..."
echo ""

# Deep-Agg (9201)
if ss -tulpn | grep -q ':9201'; then
  echo "✅ Deep-Agg (9201): LISTENING"
else
  echo "❌ Deep-Agg (9201): NOT LISTENING"
fi

# Investment (3000)
if ss -tulpn | grep -q ':3000'; then
  echo "✅ Investment (3000): LISTENING"
else
  echo "❌ Investment (3000): NOT LISTENING"
fi

echo ""

# 3. HTTP Health Check
echo "🌐 HTTP Accessibility:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Deep-Agg
DEEP_AGG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9201 2>/dev/null || echo "000")
if [ "$DEEP_AGG_STATUS" = "200" ] || [ "$DEEP_AGG_STATUS" = "302" ]; then
  echo "✅ Deep-Agg: HTTP $DEEP_AGG_STATUS"
else
  echo "❌ Deep-Agg: HTTP $DEEP_AGG_STATUS (FAILED)"
fi

# Investment
INV_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$INV_STATUS" = "200" ] || [ "$INV_STATUS" = "302" ]; then
  echo "✅ Investment: HTTP $INV_STATUS"
else
  echo "❌ Investment: HTTP $INV_STATUS (FAILED)"
fi

# Deep-Agg-Next
NEXT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null || echo "000")
if [ "$NEXT_STATUS" = "200" ] || [ "$NEXT_STATUS" = "302" ]; then
  echo "✅ Deep-Agg-Next: HTTP $NEXT_STATUS"
else
  echo "❌ Deep-Agg-Next: HTTP $NEXT_STATUS (FAILED)"
fi

echo ""

# 4. Resource Usage
echo "💾 Resource Usage:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Memory
echo "Memory:"
free -h | grep Mem

echo ""
echo "Disk:"
df -h / | tail -n 1

echo ""

# 5. Port Conflicts Check
echo "⚠️  Port Conflict Check:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PORTS_IN_USE=$(ss -tulpn | grep -E ':(3000|9201)' | wc -l)
if [ "$PORTS_IN_USE" -eq 2 ]; then
  echo "✅ No port conflicts detected"
  echo "   - Port 3000: Investment"
  echo "   - Port 9201: Deep-Agg"
else
  echo "⚠️  Unexpected port configuration!"
  echo "   Expected: 2 ports (3000, 9201)"
  echo "   Found: $PORTS_IN_USE ports"
  echo ""
  echo "   Active ports:"
  ss -tulpn | grep -E ':(3000|9201)'
fi

echo ""

# 6. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ALL_OK=true

if [ "$DEEP_AGG_STATUS" != "200" ] && [ "$DEEP_AGG_STATUS" != "302" ]; then
  ALL_OK=false
fi

if [ "$INV_STATUS" != "200" ] && [ "$INV_STATUS" != "302" ]; then
  ALL_OK=false
fi

if [ "$ALL_OK" = true ]; then
  echo "✅ All systems operational"
  echo ""
  echo "Access URLs:"
  echo "  - Deep-Agg:   http://5.129.228.88:9201"
  echo "  - Investment: http://5.129.228.88:3000
  - Deep-Agg-Next: http://5.129.228.88:3001"
else
  echo "❌ Some services are down - check logs:"
  echo "   pm2 logs deep-agg"
  echo "   pm2 logs investment"
fi

echo ""
echo "Registry: /opt/deep-agg/SERVER-PROJECTS.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
