/**
 * Search Integration with RU→EN Translation
 * 
 * Integrates Russian-to-English translation into the main search pipeline
 * Enhances existing search with intelligent glossary-based translation
 * 
 * Pipeline: Detect Russian → Translate with glossary → Search providers → Cache
 */

import { translateRuToEn, containsRussian } from '../i18n/ru-en-translator.mjs';

/**
 * Enhanced search query processor
 * Processes queries with RU→EN translation before provider searches
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
  
  // Check if Russian translation needed
  const hasRussian = containsRussian(trimmed);
  
  if (!hasRussian) {
    // Non-Russian query: pass through
    return {
      success: true,
      originalQuery: trimmed,
      queries: [trimmed],
      mpns: [],
      metadata: {
        hasCyrillic: false,
        translationUsed: false
      }
    };
  }
  
  // Apply RU→EN translation (synchronous with local glossary)
  const translation = translateRuToEn(trimmed);
  
  if (!translation.translated || translation.translated === trimmed) {
    // Translation failed or returned same: fallback to original
    return {
      success: true,
      originalQuery: trimmed,
      queries: [trimmed],
      mpns: translation.stages?.mpnsExtracted || [],
      metadata: {
        hasCyrillic: true,
        translationUsed: false,
        translationFailed: true,
        coverage: translation.stages?.glossaryCoverage || 0
      }
    };
  }
  
  // Build search query variants
  const queries = [];
  
  // 1. Translated query (primary for Russian)
  queries.push(translation.translated);
  
  // 2. Original query (fallback)
  if (translation.translated !== trimmed) {
    queries.push(trimmed);
  }
  
  // Extract MPNs from translation stages
  const mpns = translation.stages?.mpnsExtracted || [];
  
  return {
    success: true,
    originalQuery: trimmed,
    queries: [...new Set(queries)],  // Deduplicate
    mpns,
    metadata: {
      hasCyrillic: true,
      translationUsed: true,
      coverage: translation.stages?.glossaryCoverage || 0,
      missingWords: translation.stages?.missingWords || [],
      translationStages: Object.keys(translation.stages || {})
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
  const hasRussian = processedQuery.metadata.hasCyrillic;
  const translationUsed = processedQuery.metadata.translationUsed;
  
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
  
  // Strategy 2: RU→EN translation (Russian detected and translated)
  if (hasRussian && translationUsed && hasMultipleQueries) {
    return {
      strategy: 'ru-en-translation',
      primaryQuery: processedQuery.queries[0],  // Translated query first
      alternativeQueries: processedQuery.queries.slice(1),
      mpnFirst: false,
      reasoning: `Russian detected - using translated query (${processedQuery.metadata.coverage}% coverage)`
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