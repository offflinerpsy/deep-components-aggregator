#!/bin/bash
# Pre-Deployment Conflict Check
# Run this BEFORE deploying a new project to check for conflicts

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <port_number>"
  echo "Example: $0 3001"
  exit 1
fi

NEW_PORT=$1

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Pre-Deployment Conflict Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checking port: $NEW_PORT"
echo ""

# 1. Port availability
echo "1️⃣  Checking port availability..."
if ss -tulpn | grep -q ":$NEW_PORT "; then
  echo "❌ CONFLICT: Port $NEW_PORT is already in use!"
  echo ""
  echo "Port details:"
  ss -tulpn | grep ":$NEW_PORT "
  echo ""
  echo "Choose a different port from available ranges:"
  echo "  - 3001-3099 (Next.js apps)"
  echo "  - 9202-9299 (Express apps)"
  echo "  - 8000-8099 (Python apps)"
  exit 1
else
  echo "✅ Port $NEW_PORT is available"
fi

echo ""

# 2. Check reserved ports
echo "2️⃣  Checking reserved ports..."
RESERVED_PORTS=("80" "443" "3000" "9201")

for port in "${RESERVED_PORTS[@]}"; do
  if [ "$NEW_PORT" -eq "$port" ]; then
    echo "❌ CONFLICT: Port $NEW_PORT is reserved!"
    echo ""
    echo "Reserved ports:"
    echo "  - 80, 443: NGINX/Reverse proxy"
    echo "  - 3000: Investment project"
    echo "  - 9201: Deep-Agg project"
    echo ""
    echo "See /opt/deep-agg/SERVER-PROJECTS.md for full registry"
    exit 1
  fi
done

echo "✅ Port $NEW_PORT is not reserved"
echo ""

# 3. PM2 processes check
echo "3️⃣  Checking PM2 processes..."
export PATH="/usr/local/bin:$PATH"

PROCESS_COUNT=$(pm2 list | grep -c "online" || echo "0")
echo "Current running processes: $PROCESS_COUNT"
pm2 status
echo ""

# 4. Resource check
echo "4️⃣  Checking system resources..."

# Memory
MEM_AVAILABLE=$(free -m | awk 'NR==2{print $7}')
echo "Available memory: ${MEM_AVAILABLE}MB"

if [ "$MEM_AVAILABLE" -lt 200 ]; then
  echo "⚠️  WARNING: Low memory (<200MB available)"
  echo "   Consider stopping unused services"
else
  echo "✅ Sufficient memory available"
fi

echo ""

# Disk
DISK_AVAILABLE=$(df -h / | awk 'NR==2{print $4}')
echo "Available disk space: $DISK_AVAILABLE"
echo "✅ Disk space check complete"

echo ""

# 5. Directory structure
echo "5️⃣  Checking directory structure..."

# Common deployment locations
LOCATIONS=("/opt" "/var/www" "/home")

echo "Available deployment locations:"
for loc in "${LOCATIONS[@]}"; do
  if [ -d "$loc" ]; then
    SPACE=$(df -h "$loc" | awk 'NR==2{print $4}')
    echo "  ✅ $loc (${SPACE} free)"
  else
    echo "  ❌ $loc (not available)"
  fi
done

echo ""

# 6. Final summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Pre-Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Port $NEW_PORT is available for deployment"
echo ""
echo "Next steps:"
echo "1. Deploy your project"
echo "2. Update /opt/deep-agg/SERVER-PROJECTS.md"
echo "3. Add to PM2 with unique name"
echo "4. Run health check: /opt/deep-agg/scripts/check-server-health.sh"
echo ""
echo "Deployment checklist:"
echo "  [ ] Port is unique ($NEW_PORT)"
echo "  [ ] Choose deployment directory"
echo "  [ ] Set unique PM2 process name"
echo "  [ ] Configure separate .env file"
echo "  [ ] Update SERVER-PROJECTS.md"
echo "  [ ] Test with curl http://localhost:$NEW_PORT"
echo "  [ ] Create deployment artifact"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
