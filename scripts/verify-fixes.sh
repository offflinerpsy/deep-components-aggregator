#!/bin/bash
# Финальная проверка исправлений

echo "===== ФИНАЛЬНАЯ ПРОВЕРКА ИСПРАВЛЕНИЙ ====="
echo ""

# Test 1: Главная страница
echo "1️⃣ Проверка главной страницы..."
HOMEPAGE=$(curl -s 'http://localhost:3000/' | grep -o 'Deep Components Aggregator')
if [ "$HOMEPAGE" == "Deep Components Aggregator" ]; then
  echo "   ✅ Главная загружается"
else
  echo "   ❌ Главная НЕ загружается"
fi
echo ""

# Test 2: API витрины
echo "2️⃣ Проверка API витрины..."
API_OK=$(curl -s 'http://localhost:3000/api/vitrine/list?limit=3' | jq -r '.ok')
API_COUNT=$(curl -s 'http://localhost:3000/api/vitrine/list?limit=3' | jq -r '.rows | length')
if [ "$API_OK" == "true" ] && [ "$API_COUNT" == "3" ]; then
  echo "   ✅ API возвращает $API_COUNT компонентов"
else
  echo "   ❌ API не работает (ok=$API_OK, count=$API_COUNT)"
fi
echo ""

# Test 3: FTS5 escaping (дефисы)
echo "3️⃣ Проверка FTS5 escaping (RS1G-13-F)..."
FTS_OK=$(curl -s 'http://127.0.0.1:9201/api/vitrine/list?q=RS1G-13-F' | jq -r '.ok')
if [ "$FTS_OK" == "true" ]; then
  echo "   ✅ Запросы с дефисом работают (FTS5 escaping)"
else
  echo "   ❌ FTS5 escaping НЕ работает"
fi
echo ""

# Test 4: Русский поиск
echo "4️⃣ Проверка русского поиска (транзистор)..."
RU_OK=$(curl -s 'http://127.0.0.1:9201/api/vitrine/list?q=транзистор&limit=1' | jq -r '.ok')
RU_NORM=$(curl -s 'http://127.0.0.1:9201/api/vitrine/list?q=транзистор&limit=1' | jq -r '.meta.queryNorm.normalized')
if [ "$RU_OK" == "true" ] && [ "$RU_NORM" == "transistor" ]; then
  echo "   ✅ Русский поиск нормализуется (транзистор → transistor)"
else
  echo "   ❌ Русская нормализация НЕ работает"
fi
echo ""

# Test 5: Backend живой
echo "5️⃣ Проверка бэкенда..."
BACKEND_OK=$(curl -s 'http://127.0.0.1:9201/api/vitrine/list?limit=1' | jq -r '.ok')
if [ "$BACKEND_OK" == "true" ]; then
  echo "   ✅ Бэкенд работает"
else
  echo "   ❌ Бэкенд НЕ отвечает"
fi
echo ""

echo "===== ИТОГ ====="
echo ""
echo "✅ Исправления применены!"
echo ""
echo "🌐 ТЕПЕРЬ ТЕСТИРУЙ В БРАУЗЕРЕ:"
echo ""
echo "   1. Главная: http://5.129.228.88:3000/"
echo "   2. Поиск (пустой кэш): http://5.129.228.88:3000/search?q=TEST-999"
echo "      → Должен автоматом включиться Live Search (SSE)"
echo ""
echo "   3. Поиск (с результатами): http://5.129.228.88:3000/search?q=FT232RL-REEL"
echo "      → Показать результаты из кэша"
echo ""
echo "   4. Русский поиск: http://5.129.228.88:3000/search?q=транзистор"
echo "      → Нормализация: «Показано по: transistor»"
echo ""
echo "   5. Поиск с дефисом: http://5.129.228.88:3000/search?q=RS1G-13-F"
echo "      → НЕ должно быть ошибки"
echo ""
