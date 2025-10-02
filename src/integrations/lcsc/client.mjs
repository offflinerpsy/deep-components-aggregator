/**
 * LCSC (Shenzhen Lichuang E-Commerce Co., Ltd.) API Client
 * https://lcsc.com/
 * 
 * Unofficial API - no authentication required
 * Base: https://wwwapi.lcsc.com/
 */

import { request } from 'undici';

const BASE = 'https://www.lcsc.com/api';

/**
 * Search products by keyword
 * @param {Object} params
 * @param {string} params.query - Search query (part number or keyword)
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.pageSize - Results per page (default: 20)
 * @returns {Promise<Object>}
 */
export async function lcscSearch({ query, page = 1, pageSize = 20 }) {
  const url = `${BASE}/v1/search/index`;
  
  console.log(`[LCSC] Searching: ${query}`);
  
  try {
    const response = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        keyword: query,
        currentPage: page,
        pageSize: pageSize,
        searchSource: 'search'
      })
    });
    
    const data = await response.body.json();
    
    if (data.code === 200 && data.result) {
      console.log(`[LCSC] ✅ Found ${data.result.total || 0} products`);
      return {
        ok: true,
        total: data.result.total || 0,
        products: data.result.productList || [],
        raw: data
      };
    } else {
      console.log(`[LCSC] ❌ Error: ${data.msg || 'Unknown error'}`);
      return {
        ok: false,
        error: data.msg || 'Search failed',
        total: 0,
        products: []
      };
    }
  } catch (error) {
    console.error(`[LCSC] ❌ Request failed:`, error.message);
    return {
      ok: false,
      error: error.message,
      total: 0,
      products: []
    };
  }
}

/**
 * Get product details by product code
 * @param {Object} params
 * @param {string} params.productCode - LCSC product code (e.g. C123456)
 * @returns {Promise<Object>}
 */
export async function lcscGetProduct({ productCode }) {
  const url = `${BASE}/v1/products/detail`;
  
  console.log(`[LCSC] Getting product: ${productCode}`);
  
  try {
    const response = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        productCode: productCode
      })
    });
    
    const data = await response.body.json();
    
    if (data.code === 200 && data.result) {
      console.log(`[LCSC] ✅ Product found`);
      return {
        ok: true,
        product: data.result,
        raw: data
      };
    } else {
      console.log(`[LCSC] ❌ Error: ${data.msg || 'Not found'}`);
      return {
        ok: false,
        error: data.msg || 'Product not found'
      };
    }
  } catch (error) {
    console.error(`[LCSC] ❌ Request failed:`, error.message);
    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Search by manufacturer part number
 * @param {Object} params
 * @param {string} params.mpn - Manufacturer Part Number
 * @returns {Promise<Object>}
 */
export async function lcscSearchByMPN({ mpn }) {
  return lcscSearch({ query: mpn, pageSize: 10 });
}
