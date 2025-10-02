// ДИПОНИКА Diagnostics Script

// Initialize theme
function initTheme() {
  const html = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') html.classList.add('dark');
  
  toggle.addEventListener('click', () => {
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// Initialize search
function initSearch() {
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  const resetBtn = document.getElementById('resetBtn');
  
  if (!form || !input) return;
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (query) window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
  });
  
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      input.value = '';
      input.focus();
    });
  }
}

// Create diagnostic card
function createCard(test) {
  const icons = {
    loading: '⏳',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };
  
  const details = test.details ? `
    <div class="card-details">
      ${Object.entries(test.details).map(([key, value]) => `
        <div class="detail-row">
          <span><strong>${key}:</strong></span>
          <span>${value}</span>
        </div>
      `).join('')}
    </div>
  ` : '';
  
  return `
    <div class="diag-card ${test.status}">
      <div class="card-header">
        <div class="card-icon ${test.status}">${icons[test.status] || '❓'}</div>
        <div class="card-title">${test.name}</div>
      </div>
      <div class="card-body">
        ${test.message}
        ${details}
      </div>
    </div>
  `;
}

// Run diagnostics
async function runDiagnostics() {
  const grid = document.getElementById('diagGrid');
  const timestamp = document.getElementById('timestamp');
  
  // Show loading state
  const tests = [
    { name: 'API Health', status: 'loading', message: 'Проверка...' },
    { name: 'Страницы', status: 'loading', message: 'Проверка...' },
    { name: 'CSS/JS файлы', status: 'loading', message: 'Проверка...' },
    { name: 'База данных', status: 'loading', message: 'Проверка...' },
    { name: 'API источники', status: 'loading', message: 'Проверка...' },
    { name: 'Поиск', status: 'loading', message: 'Проверка...' }
  ];
  
  grid.innerHTML = tests.map(createCard).join('');
  
  try {
    // Fetch diagnostics from server
    const response = await fetch('/api/diagnostics');
    const data = await response.json();
    
    if (!data.ok) throw new Error('Diagnostics API failed');
    
    // Update cards with results
    grid.innerHTML = data.tests.map(createCard).join('');
    
    // Update timestamp
    const now = new Date();
    timestamp.textContent = `Последняя проверка: ${now.toLocaleString('ru-RU')}`;
    
  } catch (error) {
    console.error('Diagnostics error:', error);
    grid.innerHTML = `
      <div class="diag-card error">
        <div class="card-header">
          <div class="card-icon error">❌</div>
          <div class="card-title">Ошибка диагностики</div>
        </div>
        <div class="card-body">
          Не удалось выполнить диагностику: ${error.message}
        </div>
      </div>
    `;
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  runDiagnostics();
});
