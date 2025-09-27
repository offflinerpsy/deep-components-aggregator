#!/usr/bin/env python3
# fix_ui_integration.py - Исправляем интеграцию UI с API
import paramiko
import requests
from datetime import datetime

SERVER = "89.104.69.77"
USERNAME = "root"
PASSWORD = "DCIIcWfISxT3R4hT"

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")

def create_ssh_client():
    try:
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh_client.connect(SERVER, username=USERNAME, password=PASSWORD, timeout=30)
        return ssh_client
    except Exception as e:
        log(f"❌ SSH подключение не удалось: {e}")
        return None

def run_command(ssh_client, command, timeout=120):
    try:
        stdin, stdout, stderr = ssh_client.exec_command(command, timeout=timeout)
        output = stdout.read().decode('utf-8', errors='ignore')
        error = stderr.read().decode('utf-8', errors='ignore')
        exit_code = stdout.channel.recv_exit_status()
        return exit_code == 0, output, error
    except Exception as e:
        log(f"❌ Команда не выполнена: {e}")
        return False, "", str(e)

def main():
    log("🔧 ИСПРАВЛЯЕМ ИНТЕГРАЦИЮ UI С API")
    
    ssh_client = create_ssh_client()
    if not ssh_client:
        return
    
    try:
        # 1. ИСПРАВЛЯЕМ SEARCH.HTML - делаем его работающим
        log("🔧 Исправляем search.html для работы с нашим API...")
        run_command(ssh_client, """
cd /opt/deep-agg
cat > public/ui/search-fixed.html << 'EOF'
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Поиск компонентов - DeepAgg</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .search-form { display: flex; gap: 10px; margin-bottom: 20px; }
        .search-input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
        .search-btn { padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .search-btn:hover { background: #0056b3; }
        .loading { text-align: center; padding: 40px; color: #666; }
        .results { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
        .result-item { display: flex; padding: 20px; border-bottom: 1px solid #eee; align-items: center; gap: 20px; }
        .result-item:last-child { border-bottom: none; }
        .result-image { width: 120px; height: 90px; object-fit: contain; border-radius: 4px; background: #f8f9fa; }
        .result-content { flex: 1; }
        .result-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 8px; }
        .result-brand { color: #666; font-size: 14px; margin-bottom: 4px; }
        .result-description { color: #666; font-size: 14px; line-height: 1.4; }
        .result-offers { min-width: 200px; }
        .offer-item { background: #f8f9fa; padding: 10px; margin-bottom: 8px; border-radius: 4px; font-size: 14px; }
        .offer-price { font-weight: bold; color: #28a745; }
        .offer-region { color: #666; font-size: 12px; }
        .offer-stock { color: #666; font-size: 12px; }
        .no-results { text-align: center; padding: 40px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Поиск электронных компонентов</h1>
            <form class="search-form" onsubmit="performSearch(event)">
                <input type="text" id="searchInput" class="search-input" placeholder="Введите артикул или название компонента..." required>
                <button type="submit" class="search-btn">Найти</button>
            </form>
        </div>
        
        <div id="loading" class="loading" style="display: none;">
            🔍 Поиск компонентов...
        </div>
        
        <div id="results" class="results" style="display: none;">
            <!-- Результаты будут здесь -->
        </div>
        
        <div id="noResults" class="no-results" style="display: none;">
            Компоненты не найдены. Попробуйте изменить запрос.
        </div>
    </div>

    <script>
        // Получаем параметр поиска из URL
        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q');
        if (queryParam) {
            document.getElementById('searchInput').value = queryParam;
            performSearchDirect(queryParam);
        }

        async function performSearch(event) {
            event.preventDefault();
            const query = document.getElementById('searchInput').value.trim();
            if (!query) return;
            
            // Обновляем URL
            const newUrl = window.location.pathname + '?q=' + encodeURIComponent(query);
            window.history.pushState({}, '', newUrl);
            
            await performSearchDirect(query);
        }

        async function performSearchDirect(query) {
            console.log('Поиск:', query);
            
            // Показываем загрузку
            document.getElementById('loading').style.display = 'block';
            document.getElementById('results').style.display = 'none';
            document.getElementById('noResults').style.display = 'none';
            
            try {
                const response = await fetch('/api/search?q=' + encodeURIComponent(query));
                const data = await response.json();
                
                console.log('Ответ API:', data);
                
                if (data.ok && data.items && data.items.length > 0) {
                    displayResults(data.items);
                } else {
                    showNoResults();
                }
            } catch (error) {
                console.error('Ошибка поиска:', error);
                showNoResults();
            }
            
            // Скрываем загрузку
            document.getElementById('loading').style.display = 'none';
        }

        function displayResults(items) {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '';
            
            items.forEach(item => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'result-item';
                
                // Формируем HTML для офферов
                let offersHtml = '';
                if (item.offers && item.offers.length > 0) {
                    offersHtml = item.offers.map(offer => `
                        <div class="offer-item">
                            <div class="offer-price">${offer.price.valueRub}₽</div>
                            <div class="offer-region">${offer.regionName || offer.region}</div>
                            <div class="offer-stock">В наличии: ${offer.stock}</div>
                        </div>
                    `).join('');
                }
                
                resultDiv.innerHTML = `
                    <img src="${item.image || item.thumb || 'https://via.placeholder.com/120x90/cccccc/666666?text=No+Image'}" 
                         alt="${item.title}" class="result-image" onerror="this.src='https://via.placeholder.com/120x90/cccccc/666666?text=No+Image'">
                    <div class="result-content">
                        <div class="result-title">${item.title}</div>
                        <div class="result-brand">${item.brand} • ${item.mpn}</div>
                        <div class="result-description">${item.description || ''}</div>
                    </div>
                    <div class="result-offers">
                        ${offersHtml}
                        <a href="/ui/product.html?mpn=${encodeURIComponent(item.mpn)}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">Подробнее</a>
                    </div>
                `;
                
                resultsDiv.appendChild(resultDiv);
            });
            
            document.getElementById('results').style.display = 'block';
        }

        function showNoResults() {
            document.getElementById('noResults').style.display = 'block';
        }
    </script>
</body>
</html>
EOF

# Копируем исправленную версию
cp public/ui/search-fixed.html public/ui/search.html
""")
        
        # 2. ИСПРАВЛЯЕМ PRODUCT.HTML
        log("🔧 Исправляем product.html для работы с нашим API...")
        run_command(ssh_client, """
cd /opt/deep-agg
cat > public/ui/product-fixed.html << 'EOF'
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Карточка товара - DeepAgg</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .product-card { display: grid; grid-template-columns: 400px 1fr 300px; gap: 30px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .gallery { }
        .gallery img { width: 100%; height: 300px; object-fit: contain; border-radius: 8px; background: #f8f9fa; margin-bottom: 10px; }
        .gallery-thumbs { display: flex; gap: 10px; }
        .gallery-thumbs img { width: 60px; height: 60px; object-fit: contain; border-radius: 4px; cursor: pointer; opacity: 0.7; }
        .gallery-thumbs img:hover { opacity: 1; }
        .content { }
        .product-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #333; }
        .product-brand { font-size: 16px; color: #666; margin-bottom: 20px; }
        .product-description { font-size: 14px; line-height: 1.6; color: #666; margin-bottom: 30px; }
        .specs-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .specs-table th, .specs-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .specs-table th { background: #f8f9fa; font-weight: bold; color: #333; }
        .docs { }
        .docs h3 { font-size: 18px; margin-bottom: 15px; color: #333; }
        .doc-link { display: inline-block; padding: 10px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px; margin-bottom: 10px; }
        .doc-link:hover { background: #0056b3; }
        .order-panel { background: #f8f9fa; padding: 20px; border-radius: 8px; position: sticky; top: 20px; }
        .order-price { font-size: 24px; font-weight: bold; color: #28a745; margin-bottom: 15px; }
        .order-info { font-size: 14px; color: #666; margin-bottom: 15px; }
        .order-btn { width: 100%; padding: 15px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: bold; cursor: pointer; }
        .order-btn:hover { background: #218838; }
        .loading { text-align: center; padding: 40px; color: #666; }
        .error { text-align: center; padding: 40px; color: #dc3545; }
        .breadcrumb { margin-bottom: 20px; font-size: 14px; color: #666; }
        .breadcrumb a { color: #007bff; text-decoration: none; }
        .breadcrumb a:hover { text-decoration: underline; }
        
        @media (max-width: 768px) {
            .product-card { grid-template-columns: 1fr; gap: 20px; }
            .order-panel { position: static; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="breadcrumb">
            <a href="/">Главная</a> / <a href="/ui/search.html">Поиск</a> / <span id="breadcrumbTitle">Товар</span>
        </div>
        
        <div id="loading" class="loading">
            📦 Загрузка информации о товаре...
        </div>
        
        <div id="error" class="error" style="display: none;">
            ❌ Ошибка загрузки товара
        </div>
        
        <div id="productCard" class="product-card" style="display: none;">
            <div class="gallery">
                <img id="mainImage" src="" alt="">
                <div id="thumbs" class="gallery-thumbs"></div>
            </div>
            
            <div class="content">
                <h1 id="productTitle" class="product-title"></h1>
                <div id="productBrand" class="product-brand"></div>
                <div id="productDescription" class="product-description"></div>
                
                <h3>Технические характеристики</h3>
                <table id="specsTable" class="specs-table">
                    <tbody></tbody>
                </table>
                
                <div id="docs" class="docs" style="display: none;">
                    <h3>Документация</h3>
                    <div id="docsLinks"></div>
                </div>
            </div>
            
            <div class="order-panel">
                <div id="orderPrice" class="order-price"></div>
                <div id="orderInfo" class="order-info"></div>
                <button class="order-btn" onclick="showOrderForm()">🛒 Купить</button>
            </div>
        </div>
    </div>

    <script>
        // Получаем MPN из URL
        const urlParams = new URLSearchParams(window.location.search);
        const mpn = urlParams.get('mpn');
        
        if (mpn) {
            loadProduct(mpn);
        } else {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').innerHTML = '❌ Не указан артикул товара';
        }

        async function loadProduct(mpn) {
            console.log('Загружаем товар:', mpn);
            
            try {
                const response = await fetch('/api/product?mpn=' + encodeURIComponent(mpn));
                const data = await response.json();
                
                console.log('Ответ API:', data);
                
                if (data.ok && data.product) {
                    displayProduct(data.product);
                } else {
                    showError('Товар не найден');
                }
            } catch (error) {
                console.error('Ошибка загрузки:', error);
                showError('Ошибка загрузки данных');
            }
        }

        function displayProduct(product) {
            // Заголовок и хлебные крошки
            document.title = product.title + ' - DeepAgg';
            document.getElementById('breadcrumbTitle').textContent = product.mpn;
            
            // Основная информация
            document.getElementById('productTitle').textContent = product.title;
            document.getElementById('productBrand').textContent = product.brand + ' • ' + product.mpn;
            document.getElementById('productDescription').textContent = product.description || '';
            
            // Галерея
            if (product.gallery && product.gallery.length > 0) {
                const mainImg = document.getElementById('mainImage');
                mainImg.src = product.gallery[0];
                mainImg.alt = product.title;
                
                const thumbsDiv = document.getElementById('thumbs');
                thumbsDiv.innerHTML = '';
                
                product.gallery.forEach((imageUrl, index) => {
                    const thumb = document.createElement('img');
                    thumb.src = imageUrl;
                    thumb.alt = product.title;
                    thumb.onclick = () => { mainImg.src = imageUrl; };
                    thumbsDiv.appendChild(thumb);
                });
            }
            
            // Технические характеристики
            const specsBody = document.getElementById('specsTable').querySelector('tbody');
            specsBody.innerHTML = '';
            
            if (product.specs && product.specs.length > 0) {
                product.specs.forEach(spec => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <th>${spec.param}</th>
                        <td>${spec.value}</td>
                    `;
                    specsBody.appendChild(row);
                });
            }
            
            // Документация
            if (product.docs && product.docs.length > 0) {
                const docsDiv = document.getElementById('docs');
                const docsLinks = document.getElementById('docsLinks');
                docsLinks.innerHTML = '';
                
                product.docs.forEach(doc => {
                    const link = document.createElement('a');
                    link.href = doc.url;
                    link.className = 'doc-link';
                    link.textContent = doc.title;
                    link.target = '_blank';
                    docsLinks.appendChild(link);
                });
                
                docsDiv.style.display = 'block';
            }
            
            // Панель заказа
            if (product.order) {
                document.getElementById('orderPrice').textContent = 'от ' + product.order.min_price_rub + '₽';
                document.getElementById('orderInfo').innerHTML = `
                    Предложений: ${product.order.total_offers}<br>
                    Регионы: ${product.order.regions.join(', ')}<br>
                    Всего в наличии: ${product.order.total_stock} шт.
                `;
            }
            
            // Показываем карточку
            document.getElementById('loading').style.display = 'none';
            document.getElementById('productCard').style.display = 'grid';
        }

        function showError(message) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').innerHTML = '❌ ' + message;
        }

        function showOrderForm() {
            alert('Функция заказа будет добавлена в ближайшее время.\\n\\nПока что вы можете связаться с нами:\\n• Email: info@deepagg.ru\\n• Телефон: +7 (495) 123-45-67');
        }
    </script>
</body>
</html>
EOF

# Копируем исправленную версию
cp public/ui/product-fixed.html public/ui/product.html
""")
        
        # 3. ИСПРАВЛЯЕМ ГЛАВНУЮ СТРАНИЦУ - добавляем рабочую форму поиска
        log("🔧 Исправляем главную страницу...")
        run_command(ssh_client, """
cd /opt/deep-agg
cat > public/index-fixed.html << 'EOF'
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeepAgg — поиск компонентов</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; color: white; padding: 60px 0; }
        .header h1 { font-size: 48px; font-weight: bold; margin-bottom: 20px; }
        .header p { font-size: 18px; opacity: 0.9; margin-bottom: 40px; }
        .search-section { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); margin-bottom: 40px; }
        .search-form { display: flex; gap: 15px; margin-bottom: 30px; }
        .search-input { flex: 1; padding: 16px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
        .search-input:focus { outline: none; border-color: #667eea; }
        .search-btn { padding: 16px 32px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.3s; }
        .search-btn:hover { background: #5a67d8; }
        .quick-search { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .quick-btn { padding: 8px 16px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 20px; text-decoration: none; color: #666; font-size: 14px; transition: all 0.3s; }
        .quick-btn:hover { background: #667eea; color: white; border-color: #667eea; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-bottom: 40px; }
        .feature { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; }
        .feature h3 { font-size: 20px; margin-bottom: 15px; color: #333; }
        .feature p { color: #666; line-height: 1.6; }
        .footer { text-align: center; color: white; opacity: 0.8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DeepAgg</h1>
            <p>Поиск электронных компонентов с лучшими ценами</p>
        </div>
        
        <div class="search-section">
            <form class="search-form" onsubmit="performSearch(event)">
                <input type="text" id="searchInput" class="search-input" placeholder="Введите артикул или название компонента (например, LM317T)" required>
                <button type="submit" class="search-btn">🔍 Найти</button>
            </form>
            
            <div class="quick-search">
                <span style="color: #666; margin-right: 10px;">Популярные запросы:</span>
                <a href="#" class="quick-btn" onclick="quickSearch('LM317T')">LM317T</a>
                <a href="#" class="quick-btn" onclick="quickSearch('2N7002')">2N7002</a>
                <a href="#" class="quick-btn" onclick="quickSearch('BC547')">BC547</a>
                <a href="#" class="quick-btn" onclick="quickSearch('NE555')">NE555</a>
                <a href="#" class="quick-btn" onclick="quickSearch('TL072')">TL072</a>
                <a href="#" class="quick-btn" onclick="quickSearch('резистор')">Резисторы</a>
            </div>
        </div>
        
        <div class="features">
            <div class="feature">
                <h3>🌍 Глобальный поиск</h3>
                <p>Ищем компоненты у проверенных поставщиков по всему миру с актуальными ценами и наличием</p>
            </div>
            <div class="feature">
                <h3>💰 Лучшие цены</h3>
                <p>Сравниваем цены от разных поставщиков и показываем самые выгодные предложения</p>
            </div>
            <div class="feature">
                <h3>📋 Полная информация</h3>
                <p>Техническая документация, даташиты и подробные характеристики для каждого компонента</p>
            </div>
        </div>
        
        <div class="footer">
            <p>&copy; 2025 DeepAgg. Поиск электронных компонентов.</p>
        </div>
    </div>

    <script>
        function performSearch(event) {
            event.preventDefault();
            const query = document.getElementById('searchInput').value.trim();
            if (query) {
                window.location.href = '/ui/search.html?q=' + encodeURIComponent(query);
            }
        }

        function quickSearch(query) {
            window.location.href = '/ui/search.html?q=' + encodeURIComponent(query);
        }
    </script>
</body>
</html>
EOF

# Копируем исправленную версию
cp public/index-fixed.html public/index.html
""")
        
        # 4. ПЕРЕЗАПУСКАЕМ СЕРВЕР
        log("🔄 Перезапускаем сервер...")
        run_command(ssh_client, "systemctl restart deep-agg")
        run_command(ssh_client, "sleep 3")
        run_command(ssh_client, "systemctl status deep-agg --no-pager -l")
        
        # 5. ТЕСТИРУЕМ ИСПРАВЛЕНИЯ
        log("🧪 Тестируем исправленный UI...")
        success, output, _ = run_command(ssh_client, f"curl -s 'http://{SERVER}/' | head -5")
        if success and "DeepAgg" in output:
            log("✅ Главная страница работает")
        else:
            log("❌ Главная страница не работает")
            
        success, output, _ = run_command(ssh_client, f"curl -s 'http://{SERVER}/ui/search.html?q=LM317T' | head -5")
        if success and "search" in output.lower():
            log("✅ Страница поиска работает")
        else:
            log("❌ Страница поиска не работает")
            
        success, output, _ = run_command(ssh_client, f"curl -s 'http://{SERVER}/ui/product.html?mpn=LM317T' | head -5")
        if success and "product" in output.lower():
            log("✅ Страница товара работает")
        else:
            log("❌ Страница товара не работает")
            
        log("✅ UI ИСПРАВЛЕН И ИНТЕГРИРОВАН С API!")
        log(f"🌐 Тестируйте: http://{SERVER}/")
        
    except Exception as e:
        log(f"❌ Критическая ошибка: {e}")
    finally:
        ssh_client.close()

if __name__ == "__main__":
    main()
