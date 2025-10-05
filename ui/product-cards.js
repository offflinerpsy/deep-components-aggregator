// Product Cards Comparison Widget
// Pure JavaScript implementation with guard clause error handling

const ComparisonWidget = {
    selectedProducts: new Map(),
    maxProducts: 5,
    
    init() {
        if (!this.validateDOM()) {
            console.warn('Comparison widget DOM elements not found');
            return false;
        }
        
        this.setupEventListeners();
        this.loadSavedProducts();
        return true;
    },
    
    validateDOM() {
        const requiredElements = ['comparisonWidget', 'comparisonCards', 'comparisonCount'];
        return requiredElements.every(id => document.getElementById(id) !== null);
    },
    
    setupEventListeners() {
        // Drag and drop for reordering
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
        
        // Keyboard accessibility
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
        
        // Auto-save on unload
        window.addEventListener('beforeunload', this.saveProducts.bind(this));
    },
    
    addProduct(productData) {
        if (!this.validateProductData(productData)) {
            console.warn('Invalid product data provided');
            return false;
        }
        
        if (this.selectedProducts.size >= this.maxProducts) {
            this.showMaxProductsWarning();
            return false;
        }
        
        if (this.selectedProducts.has(productData.mpn)) {
            console.info(`Product ${productData.mpn} already in comparison`);
            return false;
        }
        
        this.selectedProducts.set(productData.mpn, productData);
        this.renderComparisonCards();
        this.updateWidgetVisibility();
        this.saveProducts();
        
        return true;
    },
    
    removeProduct(mpn) {
        if (!mpn || typeof mpn !== 'string') {
            console.warn('Invalid MPN provided for removal');
            return false;
        }
        
        const removed = this.selectedProducts.delete(mpn);
        if (removed) {
            this.renderComparisonCards();
            this.updateWidgetVisibility();
            this.saveProducts();
        }
        
        return removed;
    },
    
    clearAll() {
        this.selectedProducts.clear();
        this.renderComparisonCards();
        this.updateWidgetVisibility();
        this.saveProducts();
        
        // Reset all product item states
        document.querySelectorAll('.product-item.selected').forEach(item => {
            item.classList.remove('selected');
            const button = item.querySelector('.add-to-comparison');
            if (button) {
                button.textContent = 'Сравнить';
                button.classList.remove('added');
            }
        });
    },
    
    validateProductData(data) {
        if (!data || typeof data !== 'object') return false;
        
        const requiredFields = ['mpn', 'manufacturer', 'price'];
        return requiredFields.every(field => 
            data[field] && typeof data[field] === 'string'
        );
    },
    
    renderComparisonCards() {
        const container = document.getElementById('comparisonCards');
        if (!container) return;
        
        if (this.selectedProducts.size === 0) {
            container.innerHTML = `
                <div class="empty-comparison">
                    <div class="empty-comparison-icon">📦</div>
                    <div>Добавьте товары для сравнения</div>
                </div>
            `;
            return;
        }
        
        const cards = Array.from(this.selectedProducts.values())
            .map(product => this.createProductCard(product))
            .join('');
            
        container.innerHTML = cards;
        
        // Update counter
        const counter = document.getElementById('comparisonCount');
        if (counter) {
            counter.textContent = this.selectedProducts.size;
        }
    },
    
    createProductCard(product) {
        const regions = this.parseRegions(product.region);
        const regionBadges = regions.map(region => 
            `<span class="region-badge">${this.escapeHtml(region)}</span>`
        ).join(' ');
        
        return `
            <div class="comparison-card new" draggable="true" data-mpn="${this.escapeHtml(product.mpn)}" role="listitem" tabindex="0">
                <button class="card-remove" onclick="ComparisonWidget.removeProduct('${this.escapeHtml(product.mpn)}')" aria-label="Удалить ${this.escapeHtml(product.mpn)} из сравнения">×</button>
                <div class="card-mpn">${this.escapeHtml(product.mpn)}</div>
                <div class="card-manufacturer">${this.escapeHtml(product.manufacturer)}</div>
                <div class="card-price">${this.formatPrice(product.price)}</div>
                <div class="card-region" aria-label="Доступные регионы">${regionBadges}</div>
            </div>
        `;
    },
    
    parseRegions(regionString) {
        if (!regionString || typeof regionString !== 'string') return [];
        return regionString.split(',').map(r => r.trim()).filter(r => r.length > 0);
    },
    
    formatPrice(priceRange) {
        if (!priceRange || typeof priceRange !== 'string') return 'N/A';
        
        const [min, max] = priceRange.split('-').map(p => p.trim());
        if (!min) return 'N/A';
        
        const formatRub = (price) => {
            const num = parseFloat(price);
            if (isNaN(num)) return price;
            return new Intl.NumberFormat('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num) + ' ₽';
        };
        
        if (!max || min === max) {
            return formatRub(min);
        }
        
        return `${formatRub(min)} — ${formatRub(max)}`;
    },
    
    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    updateWidgetVisibility() {
        const widget = document.getElementById('comparisonWidget');
        if (!widget) return;
        
        if (this.selectedProducts.size > 0) {
            widget.classList.remove('hidden');
        } else {
            widget.classList.add('hidden');
        }
    },
    
    showMaxProductsWarning() {
        // Create accessible warning instead of alert
        const warning = document.createElement('div');
        warning.className = 'max-products-warning';
        warning.setAttribute('role', 'alert');
        warning.setAttribute('aria-live', 'polite');
        warning.textContent = `Максимальное количество товаров для сравнения: ${this.maxProducts}`;
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fef2f2;
            color: #dc2626;
            padding: 12px 16px;
            border-radius: 6px;
            border: 1px solid #fecaca;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 1001;
            font-size: 14px;
        `;
        
        document.body.appendChild(warning);
        
        setTimeout(() => {
            if (warning.parentNode) {
                warning.parentNode.removeChild(warning);
            }
        }, 3000);
    },
    
    // Drag and Drop handlers
    handleDragStart(e) {
        if (!e.target.classList.contains('comparison-card')) return;
        
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.dataset.mpn);
    },
    
    handleDragOver(e) {
        e.preventDefault();
    },
    
    handleDrop(e) {
        e.preventDefault();
        
        const draggedMpn = e.dataTransfer.getData('text/plain');
        const dropZone = e.target.closest('.comparison-card');
        
        if (!dropZone || !draggedMpn) return;
        
        // Simple reordering logic - could be enhanced
        console.info(`Reordering: ${draggedMpn}`);
        
        // Remove dragging state
        document.querySelectorAll('.comparison-card.dragging').forEach(card => {
            card.classList.remove('dragging');
        });
    },
    
    // Keyboard accessibility
    handleKeyboard(e) {
        if (e.key === 'Escape') {
            // Close comparison widget or clear selection
            if (this.selectedProducts.size > 0) {
                const confirmClear = confirm('Очистить все выбранные товары?');
                if (confirmClear) {
                    this.clearAll();
                }
            }
        }
    },
    
    // Persistence
    saveProducts() {
        if (typeof localStorage === 'undefined') return;
        
        const productsArray = Array.from(this.selectedProducts.entries());
        localStorage.setItem('comparisonProducts', JSON.stringify(productsArray));
    },
    
    loadSavedProducts() {
        if (typeof localStorage === 'undefined') return;
        
        const saved = localStorage.getItem('comparisonProducts');
        if (!saved) return;
        
        const productsArray = JSON.parse(saved);
        if (!Array.isArray(productsArray)) return;
        
        this.selectedProducts.clear();
        productsArray.forEach(([mpn, productData]) => {
            if (this.validateProductData(productData)) {
                this.selectedProducts.set(mpn, productData);
            }
        });
        
        this.renderComparisonCards();
        this.updateWidgetVisibility();
    },
    
    // Public API for external usage
    getSelectedProducts() {
        return Array.from(this.selectedProducts.values());
    },
    
    getSelectedCount() {
        return this.selectedProducts.size;
    },
    
    hasProduct(mpn) {
        return this.selectedProducts.has(mpn);
    }
};

// Global functions for HTML onclick handlers
function addToComparison(buttonElement) {
    if (!buttonElement) return;
    
    const productItem = buttonElement.closest('.product-item');
    if (!productItem) return;
    
    const productData = {
        mpn: productItem.dataset.mpn,
        manufacturer: productItem.dataset.manufacturer,
        price: productItem.dataset.price,
        region: productItem.dataset.region || ''
    };
    
    if (ComparisonWidget.hasProduct(productData.mpn)) {
        // Remove from comparison
        const removed = ComparisonWidget.removeProduct(productData.mpn);
        if (removed) {
            buttonElement.textContent = 'Сравнить';
            buttonElement.classList.remove('added');
            productItem.classList.remove('selected');
        }
    } else {
        // Add to comparison
        const added = ComparisonWidget.addProduct(productData);
        if (added) {
            buttonElement.textContent = 'Убрать';
            buttonElement.classList.add('added');
            productItem.classList.add('selected');
        }
    }
}

function clearAllComparisons() {
    ComparisonWidget.clearAll();
}

function showComparisonModal() {
    const products = ComparisonWidget.getSelectedProducts();
    if (products.length === 0) {
        alert('Добавьте товары для сравнения');
        return;
    }
    
    // This would open a detailed comparison modal
    console.info('Opening comparison modal with products:', products);
    alert(`Сравнение ${products.length} товаров:\n${products.map(p => p.mpn).join(', ')}`);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    ComparisonWidget.init();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComparisonWidget;
}