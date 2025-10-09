/* Dashboard Layout Component */

class DashboardLayout {
  constructor() {
    this.currentPage = window.location.pathname.split('/').pop() || 'index.html';
    this.sidebarOpen = false;
    this.init();
  }

  init() {
    this.renderLayout();
    this.bindEvents();
    this.updateActiveNavItem();
  }

  renderLayout() {
    const body = document.body;
    body.className = 'dashboard-layout';
    
    const existingContent = body.innerHTML;
    
    body.innerHTML = `
      ${this.renderHeader()}
      <div style="display: flex;">
        ${this.renderSidebar()}
        <main class="dashboard-main" id="main-content">
          ${existingContent}
        </main>
      </div>
    `;
  }

  renderHeader() {
    return `
      <header class="dashboard-header">
        <div class="flex items-center gap-4">
          <button class="btn btn-ghost btn-icon mobile-menu-btn" id="mobile-menu-btn">
            <svg class="icon" viewBox="0 0 24 24">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
          <h1 style="font-size: 18px; font-weight: 600;">Deep Aggregator</h1>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Search bar -->
          <div style="position: relative; width: 300px;">
            <svg class="icon" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: hsl(var(--muted-foreground));" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              placeholder="Поиск компонентов..." 
              class="input" 
              style="padding-left: 40px;"
              id="header-search"
            />
          </div>
          
          <!-- Notifications -->
          <button class="btn btn-ghost btn-icon" id="notifications-btn">
            <svg class="icon" viewBox="0 0 24 24">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
          </button>
          
          <!-- User menu -->
          <div style="position: relative;">
            <button class="btn btn-ghost" id="user-menu-btn" style="padding: 8px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); display: flex; items-center: center; justify-content: center; font-weight: 600; font-size: 14px;">
                U
              </div>
            </button>
          </div>
        </div>
      </header>
    `;
  }

  renderSidebar() {
    const navigation = [
      { href: 'index.html', label: 'Обзор', icon: this.renderIcon('home') },
      { href: 'search.html', label: 'Поиск', icon: this.renderIcon('search') },
      { href: 'products.html', label: 'Каталог', icon: this.renderIcon('package') },
      { href: 'orders.html', label: 'Заказы', icon: this.renderIcon('shopping-cart') },
      { type: 'separator' },
      { href: 'analytics.html', label: 'Аналитика', icon: this.renderIcon('bar-chart') },
      { href: 'providers.html', label: 'Поставщики', icon: this.renderIcon('truck') },
      { type: 'separator' },
      { href: 'settings.html', label: 'Настройки', icon: this.renderIcon('settings') },
      { href: 'admin.html', label: 'Админ', icon: this.renderIcon('shield') }
    ];

    const navItems = navigation.map(item => {
      if (item.type === 'separator') {
        return `<div style="height: 1px; background-color: hsl(var(--border)); margin: 8px 0;"></div>`;
      }
      
      const isActive = this.currentPage === item.href || 
                      (this.currentPage === '' && item.href === 'index.html');
      
      return `
        <a href="${item.href}" class="sidebar-nav-item ${isActive ? 'active' : ''}">
          ${item.icon}
          ${item.label}
        </a>
      `;
    }).join('');

    return `
      <aside class="dashboard-sidebar" id="sidebar">
        <nav class="sidebar-nav">
          ${navItems}
        </nav>
      </aside>
    `;
  }

  renderIcon(name) {
    const icons = {
      'home': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>',
      'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
      'package': '<path d="M16.5 9.4 7.55 4.24"/><path d="M7.45 4.26 2 6.26l5.5 2 5.5-2-5.5-2z"/><path d="m6.93 13.45-5.5-2v6.5l5.5 2v-6.5z"/><path d="m13.07 13.45 5.5-2v6.5l-5.5 2v-6.5z"/>',
      'shopping-cart': '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
      'bar-chart': '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-6"/>',
      'truck': '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
      'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
      'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
    };
    
    return `<svg class="icon" viewBox="0 0 24 24">${icons[name] || ''}</svg>`;
  }

  bindEvents() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        this.sidebarOpen = !this.sidebarOpen;
        sidebar.classList.toggle('mobile-open', this.sidebarOpen);
      });
    }

    // Header search functionality
    const headerSearch = document.getElementById('header-search');
    if (headerSearch) {
      headerSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = e.target.value.trim();
          if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
          }
        }
      });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && this.sidebarOpen) {
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        
        if (sidebar && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
          this.sidebarOpen = false;
          sidebar.classList.remove('mobile-open');
        }
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.sidebarOpen = false;
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });
  }

  updateActiveNavItem() {
    const navItems = document.querySelectorAll('.sidebar-nav-item');
    navItems.forEach(item => {
      const href = item.getAttribute('href');
      const isActive = this.currentPage === href || 
                      (this.currentPage === '' && href === 'index.html');
      
      item.classList.toggle('active', isActive);
    });
  }
}

// Auto-initialize layout when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DashboardLayout();
});