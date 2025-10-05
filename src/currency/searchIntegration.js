// Currency Conversion Integration for Search Results
// Integrates the currency converter with the enhanced search interface

class SearchCurrencyIntegration {
    constructor() {
        this.converter = null;
        this.defaultSourceCurrencies = new Map([
            ['mouser', 'USD'],
            ['digikey', 'USD'],
            ['farnell', 'EUR'],
            ['tme', 'EUR'],
            ['lcsc', 'USD'],
            ['onlinecomponents', 'USD']
        ]);
    }
    
    async init() {
        if (typeof currencyConverter === 'undefined') {
            console.warn('Currency converter not available');
            return false;
        }
        
        this.converter = currencyConverter;
        
        // Wait for converter initialization
        let attempts = 0;
        while (!this.converter.getStatus().initialized && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        if (!this.converter.getStatus().initialized) {
            console.warn('Currency converter failed to initialize');
            return false;
        }
        
        console.info('Search currency integration ready');
        return true;
    }
    
    // Convert product price data to rubles
    convertProductPrice(product) {
        if (!this.validateProductInput(product)) {
            return { error: 'Invalid product data', product: null };
        }
        
        if (!this.converter) {
            return { error: 'Currency converter not available', product: null };
        }
        
        const sourceCurrency = this.detectSourceCurrency(product);
        if (!sourceCurrency) {
            return { error: 'Cannot detect source currency', product: null };
        }
        
        const convertedProduct = { ...product };
        
        // Convert price range
        if (product.priceRange) {
            const conversion = this.converter.convertPriceRange(product.priceRange, sourceCurrency);
            if (conversion.error) {
                console.warn(`Price conversion failed for ${product.mpn}: ${conversion.error}`);
                convertedProduct.priceRub = null;
                convertedProduct.conversionError = conversion.error;
            } else {
                convertedProduct.priceRub = conversion.value.formatted;
                convertedProduct.priceRubMin = conversion.value.min;
                convertedProduct.priceRubMax = conversion.value.max;
                convertedProduct.sourceCurrency = sourceCurrency;
            }
        }
        
        // Convert individual price if available
        if (product.price && typeof product.price === 'number') {
            const conversion = this.converter.convert(product.price, sourceCurrency, 'RUB');
            if (!conversion.error) {
                convertedProduct.singlePriceRub = conversion.value;
                convertedProduct.singlePriceRubFormatted = this.formatSinglePrice(conversion.value);
            }
        }
        
        return { error: null, product: convertedProduct };
    }
    
    validateProductInput(product) {
        if (!product || typeof product !== 'object') return false;
        if (!product.mpn || typeof product.mpn !== 'string') return false;
        return true;
    }
    
    detectSourceCurrency(product) {
        // Try to detect from explicit currency field
        if (product.currency && typeof product.currency === 'string') {
            return product.currency.toUpperCase();
        }
        
        // Try to detect from source/provider
        if (product.source && typeof product.source === 'string') {
            const sourceCurrency = this.defaultSourceCurrencies.get(product.source.toLowerCase());
            if (sourceCurrency) return sourceCurrency;
        }
        
        // Try to detect from provider field  
        if (product.provider && typeof product.provider === 'string') {
            const providerCurrency = this.defaultSourceCurrencies.get(product.provider.toLowerCase());
            if (providerCurrency) return providerCurrency;
        }
        
        // Try to detect from URL patterns
        if (product.url && typeof product.url === 'string') {
            if (product.url.includes('mouser.') || product.url.includes('digikey.')) {
                return 'USD';
            }
            if (product.url.includes('farnell.') || product.url.includes('tme.')) {
                return 'EUR';
            }
        }
        
        // Default fallback
        return 'USD';
    }
    
    formatSinglePrice(amount) {
        return new Intl.NumberFormat('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount) + ' ₽';
    }
    
    // Process entire search results array
    async convertSearchResults(results) {
        if (!Array.isArray(results)) {
            return { error: 'Results must be an array', results: null };
        }
        
        if (!this.converter) {
            await this.init();
        }
        
        const convertedResults = [];
        const errors = [];
        
        for (const product of results) {
            const conversion = this.convertProductPrice(product);
            if (conversion.error) {
                errors.push({
                    mpn: product.mpn || 'unknown',
                    error: conversion.error
                });
                convertedResults.push(product); // Keep original if conversion fails
            } else {
                convertedResults.push(conversion.product);
            }
        }
        
        return {
            error: errors.length > 0 ? `${errors.length} conversion errors` : null,
            results: convertedResults,
            errors,
            totalProducts: results.length,
            convertedProducts: convertedResults.filter(p => p.priceRub).length
        };
    }
    
    // Get currency status for UI display
    getCurrencyStatus() {
        if (!this.converter) {
            return {
                available: false,
                error: 'Converter not initialized'
            };
        }
        
        const status = this.converter.getStatus();
        return {
            available: status.initialized,
            lastUpdate: status.lastUpdate,
            cacheValid: status.cacheValid,
            currencyCount: status.currencyCount,
            error: null
        };
    }
    
    // Force refresh exchange rates
    async refreshRates() {
        if (!this.converter) {
            return { error: 'Converter not available', success: false };
        }
        
        const success = await this.converter.updateRates();
        return {
            error: success ? null : 'Failed to update rates',
            success,
            status: this.converter.getStatus()
        };
    }
    
    // Get supported currencies for UI
    getSupportedCurrencies() {
        if (!this.converter) return [];
        return this.converter.getAvailableCurrencies();
    }
    
    // Manual currency conversion for user input
    convertUserAmount(amount, fromCurrency) {
        if (!this.converter) {
            return { error: 'Converter not available', value: null };
        }
        
        return this.converter.convert(amount, fromCurrency, 'RUB');
    }
}

// Create singleton instance
const searchCurrencyIntegration = new SearchCurrencyIntegration();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    await searchCurrencyIntegration.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SearchCurrencyIntegration, searchCurrencyIntegration };
}

// Global API
window.searchCurrencyIntegration = searchCurrencyIntegration;