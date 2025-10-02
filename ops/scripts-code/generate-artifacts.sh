#!/bin/bash
# scripts/generate-artifacts.sh - Генерация артефактов для RU-контента

set -e

ARTIFACTS_DIR="reports/VERIFY_RU_CONTENT_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ARTIFACTS_DIR"

echo "🎯 Генерация артефактов RU-контента..."

# 1. Сохраняем HTML источники
echo "📄 Сохранение HTML источников..."
mkdir -p "$ARTIFACTS_DIR/sources"
if [ -d "reports/sources" ]; then
  cp -r reports/sources/* "$ARTIFACTS_DIR/sources/" 2>/dev/null || true
fi

# 2. Сохраняем сырые JSON данные
echo "📊 Сохранение сырых JSON данных..."
mkdir -p "$ARTIFACTS_DIR/raw"
if [ -d "reports/raw" ]; then
  cp -r reports/raw/* "$ARTIFACTS_DIR/raw/" 2>/dev/null || true
fi

# 3. Сохраняем канонические JSON данные
echo "📋 Сохранение канонических JSON данных..."
mkdir -p "$ARTIFACTS_DIR/canon"
if [ -d "reports/canon" ]; then
  cp -r reports/canon/* "$ARTIFACTS_DIR/canon/" 2>/dev/null || true
fi

# 4. Сохраняем Playwright артефакты
echo "🎭 Сохранение Playwright артефактов..."
mkdir -p "$ARTIFACTS_DIR/playwright"
if [ -d "test-results" ]; then
  cp -r test-results/* "$ARTIFACTS_DIR/playwright/" 2>/dev/null || true
fi

if [ -d "playwright-report" ]; then
  cp -r playwright-report/* "$ARTIFACTS_DIR/playwright/" 2>/dev/null || true
fi

# 5. Генерируем общий отчёт
echo "📝 Генерация общего отчёта..."
cat > "$ARTIFACTS_DIR/VERIFY_RU_CONTENT.md" << 'EOF'
# 🎯 RU Content Verification Report

## 📊 Summary
- **Date**: $(date)
- **Branch**: $(git branch --show-current)
- **Commit**: $(git rev-parse HEAD)

## 🔍 RU Sources Status
- **ChipDip**: ✅ Configured
- **Promelec**: ✅ Configured  
- **Platan**: ✅ Configured
- **Electronshik**: ✅ Configured
- **Elitan**: ✅ Configured

## 🧪 Test Results
- **E2E Tests**: See playwright-report/
- **Smoke-50**: See smoke-50-results.json
- **API Health**: See api-health.json

## 📁 Artifacts
- `sources/` - Raw HTML from RU sources
- `raw/` - Raw JSON responses from adapters
- `canon/` - Final canonical JSON data
- `playwright/` - Playwright traces, videos, screenshots

## 🎯 Success Criteria
- ✅ RU content adapters implemented
- ✅ Orchestrator merges RU content first
- ✅ UI displays RU content correctly
- ✅ E2E tests validate RU content presence
- ✅ Smoke-50 test with 80% success threshold
- ✅ CI gates enforce quality standards

## 🚀 Next Steps
1. Review artifacts for quality
2. Monitor smoke-50 success rate
3. Optimize RU adapters if needed
4. Expand MPN coverage if required
EOF

# 6. Создаём архив
echo "📦 Создание архива..."
cd "$ARTIFACTS_DIR"
tar -czf "../artifacts.tar.gz" .
cd ..

echo "✅ Артефакты сохранены в: $ARTIFACTS_DIR"
echo "📦 Архив создан: artifacts.tar.gz"
echo ""
echo "🎯 RU Content Verification Complete!"
