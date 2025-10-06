/**
 * Translation Cache (LRU)
 * 
 * In-memory cache for RU→EN translations
 * - Max 10,000 entries
 * - 30-day TTL
 * - LRU eviction policy
 * 
 * Cache Key: Normalized Russian query (lowercase, trimmed)
 * Cache Value: { translated, coverage, timestamp }
 */

const MAX_ENTRIES = 10000;
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * LRU Cache Implementation
 */
class TranslationCache {
  constructor(maxSize = MAX_ENTRIES, ttl = TTL_MS) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0
    };
  }
  
  /**
   * Normalize cache key
   * @param {string} query - Russian query
   * @returns {string} Normalized key
   */
  _normalizeKey(query) {
    return query.toLowerCase().trim();
  }
  
  /**
   * Check if entry is expired
   * @param {Object} entry - Cache entry
   * @returns {boolean} True if expired
   */
  _isExpired(entry) {
    return (Date.now() - entry.timestamp) > this.ttl;
  }
  
  /**
   * Get translation from cache
   * @param {string} query - Russian query
   * @returns {Object|null} Cached translation or null
   */
  get(query) {
    const key = this._normalizeKey(query);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    if (this._isExpired(entry)) {
      this.cache.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return null;
    }
    
    // Move to end (LRU update)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    
    return {
      translated: entry.translated,
      coverage: entry.coverage,
      missingWords: entry.missingWords,
      cached: true,
      cacheAge: Date.now() - entry.timestamp
    };
  }
  
  /**
   * Store translation in cache
   * @param {string} query - Russian query
   * @param {Object} translation - Translation result
   */
  set(query, translation) {
    const key = this._normalizeKey(query);
    
    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }
    
    this.cache.set(key, {
      translated: translation.translated,
      coverage: translation.stages?.glossaryCoverage || 0,
      missingWords: translation.stages?.missingWords || [],
      timestamp: Date.now()
    });
  }
  
  /**
   * Check if query exists in cache (without updating LRU)
   * @param {string} query - Russian query
   * @returns {boolean} True if cached and not expired
   */
  has(query) {
    const key = this._normalizeKey(query);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (this._isExpired(entry)) {
      this.cache.delete(key);
      this.stats.expirations++;
      return false;
    }
    
    return true;
  }
  
  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0
    };
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
      totalRequests
    };
  }
  
  /**
   * Get all cache entries (for debugging)
   * @returns {Array} Array of cache entries
   */
  entries() {
    return Array.from(this.cache.entries()).map(([key, value]) => ({
      query: key,
      translated: value.translated,
      coverage: value.coverage,
      age: Math.floor((Date.now() - value.timestamp) / 1000), // seconds
      expiresIn: Math.floor((this.ttl - (Date.now() - value.timestamp)) / 1000)
    }));
  }
}

// Singleton instance
const translationCache = new TranslationCache();

export {
  TranslationCache,
  translationCache as default
};
