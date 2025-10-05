/**
 * Search Integration with Russian Normalization
 * 
 * Integrates Russian search normalization into the main search pipeline
 * Enhances existing search with transliteration and morphological analysis
 */

import { normalizeRussianQuery } from './russianNormalization.mjs';

/**
 * Enhanced search query processor
 * Processes queries with Russian normalization before provider searches
 * 
 * @param {string} originalQuery - Raw user query
 * @returns {Object} Enhanced search parameters
 */
export function processSearchQuery(originalQuery) {
  // Basic validation
  if (!originalQuery || typeof originalQuery !== 'string') {
    return {
      success: false,
      error: 'Invalid query',
      queries: [],
      mpns: [],
      metadata: {}
    };
  }
  
  const trimmed = originalQuery.trim();
  if (trimmed.length === 0) {
    return {
      success: false,
      error: 'Empty query',
      queries: [],
      mpns: [],
      metadata: {}
    };
  }
  
  // Apply Russian normalization
  const normalized = normalizeRussianQuery(trimmed);
  
  if (!normalized.success) {
    return {
      success: false,
      error: normalized.error,
      queries: [trimmed],
      mpns: [],
      metadata: { fallback: true }
    };
  }
  
  // Build search query variants
  const queries = [];
  
  // 1. Original query (always include)
  queries.push(trimmed);
  
  // 2. Normalized/transliterated query (if different)
  if (normalized.normalized !== trimmed.toLowerCase()) {
    queries.push(normalized.normalized);
  }
  
  // 3. Token-based query (semantic search)
  if (normalized.tokens.length > 0) {
    const tokenQuery = normalized.tokens.join(' ');
    if (!queries.includes(tokenQuery)) {
      queries.push(tokenQuery);
    }
  }
  
  // 4. MPN-focused queries (if MPNs detected)
  const mpnQueries = normalized.mpns.filter(mpn => 
    !queries.some(q => q.includes(mpn))
  );
  queries.push(...mpnQueries);
  
  return {
    success: true,
    originalQuery: trimmed,
    queries: [...new Set(queries)],  // Deduplicate
    mpns: normalized.mpns,
    metadata: {
      hasCyrillic: normalized.hasCyrillic,
      transliterated: normalized.transliterated,
      tokenCount: normalized.tokens.length,
      processingSteps: normalized.metadata?.processingSteps || []
    }
  };
}

/**
 * Search strategy selector
 * Determines optimal search strategy based on query analysis
 * 
 * @param {Object} processedQuery - Result from processSearchQuery
 * @returns {Object} Search strategy configuration
 */
export function selectSearchStrategy(processedQuery) {
  if (!processedQuery.success) {
    return {
      strategy: 'fallback',
      primaryQuery: processedQuery.queries[0] || '',
      alternativeQueries: [],
      mpnFirst: false
    };
  }
  
  const hasMultipleQueries = processedQuery.queries.length > 1;
  const hasMPNs = processedQuery.mpns.length > 0;
  const hasCyrillic = processedQuery.metadata.hasCyrillic;
  
  // Strategy 1: MPN-first (when MPNs detected)
  if (hasMPNs) {
    return {
      strategy: 'mpn-first',
      primaryQuery: processedQuery.mpns[0],  // Use first MPN
      alternativeQueries: processedQuery.queries,
      mpnFirst: true,
      reasoning: 'MPNs detected - searching by part number first'
    };
  }
  
  // Strategy 2: Russian-enhanced (Cyrillic detected)
  if (hasCyrillic && hasMultipleQueries) {
    return {
      strategy: 'russian-enhanced',
      primaryQuery: processedQuery.queries[1] || processedQuery.queries[0],  // Use normalized
      alternativeQueries: processedQuery.queries,
      mpnFirst: false,
      reasoning: 'Cyrillic detected - using transliterated query'
    };
  }
  
  // Strategy 3: Multi-variant (multiple query variants)
  if (hasMultipleQueries) {
    return {
      strategy: 'multi-variant',
      primaryQuery: processedQuery.queries[0],
      alternativeQueries: processedQuery.queries.slice(1),
      mpnFirst: false,
      reasoning: 'Multiple variants available - trying all'
    };
  }
  
  // Strategy 4: Direct (single query, no enhancements)
  return {
    strategy: 'direct',
    primaryQuery: processedQuery.queries[0],
    alternativeQueries: [],
    mpnFirst: false,
    reasoning: 'Single query - direct search'
  };
}

/**
 * Enhanced search execution wrapper
 * Wraps provider searches with Russian normalization support
 * 
 * @param {string} originalQuery - User query
 * @param {Function} searchFunction - Provider search function
 * @returns {Promise<Object>} Enhanced search result
 */
export async function executeEnhancedSearch(originalQuery, searchFunction) {
  const startTime = Date.now();
  
  // Process query with Russian normalization
  const processed = processSearchQuery(originalQuery);
  const strategy = selectSearchStrategy(processed);
  
  console.log(`🔍 Enhanced Search: "${originalQuery}"`);
  console.log(`   Strategy: ${strategy.strategy} - ${strategy.reasoning}`);
  console.log(`   Primary: "${strategy.primaryQuery}"`);
  if (strategy.alternativeQueries.length > 0) {
    console.log(`   Alternatives: ${strategy.alternativeQueries.length}`);
  }
  
  let result = null;
  let usedQuery = '';
  let attempts = 0;
  
  // Try primary query first
  if (strategy.primaryQuery) {
    attempts++;
    console.log(`   → Attempt ${attempts}: "${strategy.primaryQuery}"`);
    
    result = await searchFunction(strategy.primaryQuery);
    usedQuery = strategy.primaryQuery;
    
    // Check if result has data
    const hasResults = result?.data?.SearchResults?.Parts?.length > 0 ||
                      result?.data?.Products?.length > 0 ||
                      result?.data?.ProductList?.length > 0 ||
                      result?.data?.products?.length > 0;
    
    if (hasResults) {
      console.log(`   ✅ Primary query successful`);
    } else {
      console.log(`   ⚠️ Primary query returned no results`);
      result = null;
    }
  }
  
  // Try alternatives if primary failed
  if (!result && strategy.alternativeQueries.length > 0) {
    for (const altQuery of strategy.alternativeQueries) {
      if (altQuery === strategy.primaryQuery) continue;  // Skip duplicate
      
      attempts++;
      console.log(`   → Attempt ${attempts}: "${altQuery}"`);
      
      const altResult = await searchFunction(altQuery);
      
      const hasResults = altResult?.data?.SearchResults?.Parts?.length > 0 ||
                        altResult?.data?.Products?.length > 0 ||
                        altResult?.data?.ProductList?.length > 0 ||
                        altResult?.data?.products?.length > 0;
      
      if (hasResults) {
        result = altResult;
        usedQuery = altQuery;
        console.log(`   ✅ Alternative query successful`);
        break;
      } else {
        console.log(`   ⚠️ Alternative query returned no results`);
      }
    }
  }
  
  const elapsed = Date.now() - startTime;
  
  return {
    result,
    metadata: {
      originalQuery,
      usedQuery,
      strategy: strategy.strategy,
      attempts,
      elapsed,
      processed,
      hasResults: !!result
    }
  };
}

export default {
  processSearchQuery,
  selectSearchStrategy,
  executeEnhancedSearch
};