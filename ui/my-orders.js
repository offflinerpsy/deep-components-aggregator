// State
let currentPage = 1;
let currentStatus = '';
let currentLimit = 25;
let totalPages = 1;
let currentUser = null;

// Initialize page
async function init() {
  // Check auth status
  const authResponse = await fetch('/auth/me');
  if (!authResponse.ok) {
    window.location.href = '/ui/auth.html';
    return;
  }
  
  currentUser = await authResponse.json();
  
  // Display user info
  const userInfoEl = document.getElementById('user-info');
  userInfoEl.textContent = currentUser.name || currentUser.email;
  
  // Setup filters
  document.getElementById('status-filter').addEventListener('change', (e) => {
    currentStatus = e.target.value;
    currentPage = 1;
    loadOrders();
  });
  
  document.getElementById('limit-filter').addEventListener('change', (e) => {
    currentLimit = parseInt(e.target.value);
    currentPage = 1;
    loadOrders();
  });
  
  // Load orders
  await loadOrders();
}

// Load orders from API
async function loadOrders() {
  showLoading();
  
  // Build query params
  const params = new URLSearchParams({
    page: currentPage.toString(),
    limit: currentLimit.toString()
  });
  
  if (currentStatus) {
    params.append('status', currentStatus);
  }
  
  const response = await fetch(`/api/user/orders?${params}`);
  
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '/ui/auth.html';
      return;
    }
    showEmptyState();
    return;
  }
  
  const data = await response.json();
  
  if (!data.orders || data.orders.length === 0) {
    showEmptyState();
    return;
  }
  
  // Calculate total pages
  totalPages = Math.ceil(data.total / currentLimit);
  
  // Render orders
  renderOrders(data.orders);
  renderPagination();
}

// Render orders table
function renderOrders(orders) {
  const tbody = document.getElementById('orders-tbody');
  tbody.innerHTML = '';
  
  orders.forEach(order => {
    const row = document.createElement('tr');
    
    // Format date
    const createdAt = new Date(order.created_at);
    const dateStr = createdAt.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Status translation
    const statusMap = {
      'pending': 'В ожидании',
      'processing': 'В обработке',
      'completed': 'Завершён',
      'cancelled': 'Отменён'
    };
    
    row.innerHTML = `
      <td><span class="order-id" onclick="viewOrder('${order.id}')">${order.id.substring(0, 8)}</span></td>
      <td>${escapeHtml(order.part_number)}</td>
      <td>${order.quantity}</td>
      <td><span class="status-badge status-${order.status}">${statusMap[order.status] || order.status}</span></td>
      <td>${dateStr}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Show table
  document.getElementById('loading').style.display = 'none';
  document.getElementById('orders-table-wrapper').style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('pagination').style.display = 'flex';
}

// Render pagination controls
function renderPagination() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const pageInfo = document.getElementById('page-info');
  
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage >= totalPages;
  pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
}

// Show loading state
function showLoading() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('orders-table-wrapper').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('pagination').style.display = 'none';
}

// Show empty state
function showEmptyState() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('orders-table-wrapper').style.display = 'none';
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('pagination').style.display = 'none';
}

// Pagination handlers
function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    loadOrders();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadOrders();
  }
}

// View single order details
async function viewOrder(orderId) {
  const response = await fetch(`/api/user/orders/${orderId}`);
  
  if (!response.ok) {
    alert('Не удалось загрузить детали заказа');
    return;
  }
  
  const order = await response.json();
  
  // Simple alert for now - could be replaced with modal
  const details = `
Заказ: ${order.id}
Партномер: ${order.part_number}
Количество: ${order.quantity}
Статус: ${order.status}
Создан: ${new Date(order.created_at).toLocaleString('ru-RU')}
${order.updated_at ? `Обновлён: ${new Date(order.updated_at).toLocaleString('ru-RU')}` : ''}
${order.notes ? `\nЗаметки: ${order.notes}` : ''}
  `.trim();
  
  alert(details);
}

// Logout handler
async function logout() {
  const response = await fetch('/auth/logout', { method: 'POST' });
  
  if (response.ok) {
    window.location.href = '/ui/auth.html';
  } else {
    alert('Ошибка при выходе. Попробуйте обновить страницу.');
  }
}

// HTML escape helper
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on page load
init();
