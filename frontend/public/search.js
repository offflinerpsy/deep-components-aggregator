// Получаем параметр q из URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Показываем/скрываем прелоадер
function showPreloader() {
    document.getElementById('preloader').classList.add('show');
}

function hidePreloader() {
    document.getElementById('preloader').classList.remove('show');
}

// Создаем таблицу результатов
function createResultsTable(results) {
    if (!results || results.length === 0) {
        return '<p>Результаты не найдены</p>';
    }
    
    let tableHTML = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>MPN</th>
                    <th>Название</th>
                    <th>Производитель</th>
                    <th>Цена (₽)</th>
                    <th>Наличие</th>
                    <th>Источник</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    results.forEach(item => {
        tableHTML += `
            <tr>
                <td><a href="product.html?mpn=${encodeURIComponent(item.mpn)}">${item.mpn}</a></td>
                <td>${item.title || '—'}</td>
                <td>${item.manufacturer || '—'}</td>
                <td>${item.price_min_rub ? item.price_min_rub.toLocaleString() + ' ₽' : '—'}</td>
                <td>${item.stock_total || 0}</td>
                <td>${item.source || '—'}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    return tableHTML;
}

// Основная функция поиска
async function performSearch(query) {
    showPreloader();
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Показываем результаты
        document.getElementById('results-container').style.display = 'block';
        document.getElementById('results-title').textContent = `Результаты поиска для "${query}" (${data.length} найдено)`;
        document.getElementById('results-content').innerHTML = createResultsTable(data);
        
        // Заполняем поле поиска
        document.getElementById('searchInput').value = query;
        
    } catch (error) {
        console.error('Ошибка поиска:', error);
        document.getElementById('results-container').style.display = 'block';
        document.getElementById('results-title').textContent = 'Ошибка поиска';
        document.getElementById('results-content').innerHTML = `<p style="color: #ef4444;">Ошибка: ${error.message}</p>`;
    } finally {
        hidePreloader();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const query = getQueryParam('q');
    
    if (query) {
        performSearch(query);
    }
});
