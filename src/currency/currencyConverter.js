// Currency Conversion System
// Integrates with Central Bank of Russia API for real-time exchange rates
// Pure JavaScript implementation with guard clause error handling

class CurrencyConverter {
    constructor() {
        this.rates = new Map();
        this.cacheExpiry = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        this.lastUpdate = null;
        this.baseUrl = 'https://www.cbr-xml-daily.ru/daily_json.js';
        this.fallbackRates = new Map([
            ['USD', 95.50],
            ['EUR', 104.20],
            ['GBP', 121.80],
            ['CNY', 13.45]
        ]);
    }
    
    // Initialize converter and load cached rates
    async init() {
        if (!this.validateEnvironment()) {
            console.warn('Currency converter: fetch API not available, using fallback rates');
            this.loadFallbackRates();
            return false;
        }
        
        const cached = this.loadCachedRates();
        if (cached && this.isCacheValid()) {
            console.info('Currency converter: using cached rates');
            return true;
        }
        
        return await this.updateRates();
    }
    
    validateEnvironment() {
        return typeof fetch !== 'undefined' && typeof localStorage !== 'undefined';
    }
    
    // Fetch fresh exchange rates from CBR API
    async updateRates() {
        if (!this.validateEnvironment()) {
            this.loadFallbackRates();
            return false;
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9500); // 9.5s timeout (WARP proxy limit)
        
        const response = await fetch(this.baseUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.warn(`CBR API error: ${response.status}`);
            this.loadFallbackRates();
            return false;
        }
        
        const data = await response.json();
        if (!this.validateCbrData(data)) {
            console.warn('Invalid CBR API response format');
            this.loadFallbackRates();
            return false;
        }
        
        this.processCbrData(data);
        this.saveCachedRates();
        
        console.info(`Currency rates updated: ${Object.keys(data.Valute).length} currencies`);
        return true;
    }
    
    validateCbrData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.Valute || typeof data.Valute !== 'object') return false;
        if (!data.Date || typeof data.Date !== 'string') return false;
        
        const requiredCurrencies = ['USD', 'EUR', 'GBP'];
        return requiredCurrencies.every(curr => 
            data.Valute[curr] && typeof data.Valute[curr].Value === 'number'
        );
    }
    
    processCbrData(data) {
        this.rates.clear();
        this.lastUpdate = new Date();
        
        // Process each currency from CBR response
        Object.entries(data.Valute).forEach(([code, info]) => {
            if (!info || typeof info.Value !== 'number' || typeof info.Nominal !== 'number') {
                return;
            }
            
            // CBR provides rate per nominal units, normalize to per 1 unit
            const ratePerUnit = info.Value / info.Nominal;
            this.rates.set(code, ratePerUnit);
        });
        
        // Add RUB as base currency
        this.rates.set('RUB', 1.0);
    }
    
    loadFallbackRates() {
        this.rates.clear();
        this.fallbackRates.forEach((rate, currency) => {
            this.rates.set(currency, rate);
        });
        this.rates.set('RUB', 1.0);
        this.lastUpdate = new Date();
        
        console.info('Using fallback exchange rates');
    }
    
    // Convert amount from one currency to another
    convert(amount, fromCurrency, toCurrency = 'RUB') {
        if (!this.validateConversionInput(amount, fromCurrency, toCurrency)) {
            return { error: 'Invalid conversion parameters', value: null };
        }
        
        const fromRate = this.rates.get(fromCurrency.toUpperCase());
        const toRate = this.rates.get(toCurrency.toUpperCase());
        
        if (!fromRate || !toRate) {
            return { 
                error: `Exchange rate not available for ${fromCurrency} → ${toCurrency}`, 
                value: null 
            };
        }
        
        // Convert: amount * (fromRate / toRate)
        const convertedAmount = amount * (fromRate / toRate);
        
        return {
            error: null,
            value: convertedAmount,
            fromCurrency: fromCurrency.toUpperCase(),
            toCurrency: toCurrency.toUpperCase(),
            fromRate,
            toRate,
            timestamp: this.lastUpdate
        };
    }
    
    validateConversionInput(amount, fromCurrency, toCurrency) {
        if (typeof amount !== 'number' || isNaN(amount) || amount < 0) return false;
        if (!fromCurrency || typeof fromCurrency !== 'string') return false;
        if (!toCurrency || typeof toCurrency !== 'string') return false;
        return true;
    }
    
    // Convert price range (e.g., "10.50-20.30") from currency to rubles
    convertPriceRange(priceRange, fromCurrency) {
        if (!priceRange || typeof priceRange !== 'string') {
            return { error: 'Invalid price range format', value: null };
        }
        
        const prices = priceRange.split('-').map(p => parseFloat(p.trim()));
        if (prices.length !== 2 || prices.some(p => isNaN(p))) {
            return { error: 'Price range must be in format "min-max"', value: null };
        }
        
        const [minPrice, maxPrice] = prices;
        
        const minConverted = this.convert(minPrice, fromCurrency, 'RUB');
        const maxConverted = this.convert(maxPrice, fromCurrency, 'RUB');
        
        if (minConverted.error || maxConverted.error) {
            return { 
                error: minConverted.error || maxConverted.error, 
                value: null 
            };
        }
        
        return {
            error: null,
            value: {
                min: minConverted.value,
                max: maxConverted.value,
                formatted: this.formatRubleRange(minConverted.value, maxConverted.value)
            },
            fromCurrency: fromCurrency.toUpperCase(),
            originalRange: priceRange
        };
    }
    
    formatRubleRange(min, max) {
        const formatRub = (amount) => {
            return new Intl.NumberFormat('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount) + ' ₽';
        };
        
        if (Math.abs(min - max) < 0.01) {
            return formatRub(min);
        }
        
        return `${formatRub(min)} — ${formatRub(max)}`;
    }
    
    // Get available currencies
    getAvailableCurrencies() {
        return Array.from(this.rates.keys()).sort();
    }
    
    // Get exchange rate for specific currency
    getRate(currency) {
        if (!currency || typeof currency !== 'string') {
            return { error: 'Invalid currency code', rate: null };
        }
        
        const rate = this.rates.get(currency.toUpperCase());
        if (!rate) {
            return { error: `Rate not available for ${currency}`, rate: null };
        }
        
        return {
            error: null,
            rate,
            currency: currency.toUpperCase(),
            lastUpdate: this.lastUpdate
        };
    }
    
    // Cache management
    isCacheValid() {
        if (!this.lastUpdate) return false;
        return (Date.now() - this.lastUpdate.getTime()) < this.cacheExpiry;
    }
    
    saveCachedRates() {
        if (typeof localStorage === 'undefined') return;
        
        const cacheData = {
            rates: Array.from(this.rates.entries()),
            lastUpdate: this.lastUpdate.toISOString(),
            version: '1.0'
        };
        
        localStorage.setItem('currencyRates', JSON.stringify(cacheData));
    }
    
    loadCachedRates() {
        if (typeof localStorage === 'undefined') return false;
        
        const cached = localStorage.getItem('currencyRates');
        if (!cached) return false;
        
        const cacheData = JSON.parse(cached);
        if (!cacheData || !Array.isArray(cacheData.rates)) return false;
        
        this.rates.clear();
        cacheData.rates.forEach(([currency, rate]) => {
            this.rates.set(currency, rate);
        });
        
        this.lastUpdate = new Date(cacheData.lastUpdate);
        return true;
    }
    
    clearCache() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('currencyRates');
        }
        this.rates.clear();
        this.lastUpdate = null;
    }
    
    // Get converter status
    getStatus() {
        return {
            initialized: this.rates.size > 0,
            lastUpdate: this.lastUpdate,
            cacheValid: this.isCacheValid(),
            currencyCount: this.rates.size,
            availableCurrencies: this.getAvailableCurrencies()
        };
    }
}

// Singleton instance for global use
const currencyConverter = new CurrencyConverter();

// Initialize converter when module loads
currencyConverter.init().then(result => {
    if (!result) {
        console.warn('Currency converter initialization failed');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CurrencyConverter, currencyConverter };
}

// Global API for HTML usage
window.currencyConverter = currencyConverter;