/**
 * OnlineComponents.com Web Scraper (via ScrapingBee)
 * https://onlinecomponents.com/
 * 
 * This is an aggregator that shows data from multiple distributors
 * Should be easier to parse than individual sites
 * 
 * Strategy:
 * 1. Search: https://onlinecomponents.com/en/search?searchterm={mpn}
 * 2. Get product detail page
 * 3. Parse specifications
 */

import { fetchViaScrapingBee } from '../../scrape/providers/scrapingbee.mjs';
import * as cheerio from 'cheerio';

const SCRAPINGBEE_KEYS = [
  'ZINO11YL3C43ZKPK6DZM9KUNASN5HSYWNAM3EXYV8FR2OKSUCCOW1NS0BF8PCEFY2H7WZGNBOURSYSLZ',
  '1KYSOEVR8THW8U46DCJRVN23D1BUXT7YO7AGH4GCFDLOFJV7U9UCI8S6W2DXIZ1L50IT9QN0VBZBJK0A'
];

let keyIndex = 0;

function getNextKey() {
  const key = SCRAPINGBEE_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % SCRAPINGBEE_KEYS.length;
  return key;
}

/**
 * Search products on OnlineComponents
 * @param {string} query - Search query (part number)
 * @returns {Promise<Object>}
 */
export async function onlineComponentsSearch(query) {
  const searchUrl = `https://www.onlinecomponents.com/en/search?searchterm=${encodeURIComponent(query)}`;
  
  console.log(`[OnlineComponents] Searching: ${query}`);
  console.log(`[OnlineComponents] URL: ${searchUrl}`);
  
  try {
    const key = getNextKey();
    const result = await fetchViaScrapingBee({
      key,
      url: searchUrl,
      timeout: 30000,
      render: true,
      premium: true,
      wait: 3000
    });
    
    if (!result.ok) {
      throw new Error(`ScrapingBee failed: ${result.status}`);
    }
    
    const html = result.text;
    const $ = cheerio.load(html);
    
    console.log(`[OnlineComponents] HTML length: ${html.length}`);
    
    // Find product detail links
    const products = [];
    const productLinks = $('a[href*="/productdetail/"]');
    
    console.log(`[OnlineComponents] Found ${productLinks.length} product links`);
    
    if (productLinks.length > 0) {
      const firstLink = productLinks.first().attr('href');
      const fullUrl = firstLink?.startsWith('http') ? firstLink : `https://www.onlinecomponents.com${firstLink}`;
      
      console.log(`[OnlineComponents] Fetching product: ${fullUrl}`);
      const details = await onlineComponentsGetProduct(fullUrl);
      
      if (details) {
        products.push({
          url: fullUrl,
          ...details
        });
      }
    }
    
    return {
      ok: true,
      query,
      count: products.length,
      products
    };
    
  } catch (error) {
    console.error(`[OnlineComponents] Error:`, error.message);
    return {
      ok: false,
      query,
      error: error.message,
      count: 0,
      products: []
    };
  }
}

/**
 * Get product details from OnlineComponents product page
 * @param {string} url - Product page URL
 * @returns {Promise<Object|null>}
 */
export async function onlineComponentsGetProduct(url) {
  console.log(`[OnlineComponents] Fetching product: ${url}`);
  
  try {
    const key = getNextKey();
    const result = await fetchViaScrapingBee({
      key,
      url,
      timeout: 30000,
      render: true,
      premium: true,
      wait: 3000
    });
    
    if (!result.ok) {
      throw new Error(`ScrapingBee failed: ${result.status}`);
    }
    
    const html = result.text;
    const $ = cheerio.load(html);
    
    const product = {
      mpn: '',
      manufacturer: '',
      description: '',
      datasheet: '',
      specs: {}
    };
    
    // Extract basic info
    product.mpn = $('.product-mpn, .mpn, [data-testid="mpn"]').text().trim();
    product.manufacturer = $('.product-manufacturer, .manufacturer, [data-testid="manufacturer"]').text().trim();
    product.description = $('.product-description, .description, [data-testid="description"]').first().text().trim();
    
    // Extract datasheet
    const datasheetLink = $('a[href*="datasheet"], a[href*=".pdf"]').first().attr('href');
    if (datasheetLink) {
      product.datasheet = datasheetLink.startsWith('http') ? datasheetLink : `https://www.onlinecomponents.com${datasheetLink}`;
    }
    
    // Extract specifications - OnlineComponents shows specs in table
    const specSelectors = [
      '.specifications table',
      '.product-specs table',
      'table.specs',
      '.spec-table',
      '[class*="specification"] table'
    ];
    
    for (const selector of specSelectors) {
      const specTable = $(selector);
      if (specTable.length > 0) {
        console.log(`[OnlineComponents] Found specs with: ${selector}`);
        
        specTable.find('tr').each((i, row) => {
          const $row = $(row);
          const cells = $row.find('td, th');
          
          if (cells.length >= 2) {
            const name = $(cells[0]).text().trim();
            const value = $(cells[1]).text().trim();
            
            if (name && value && !name.toLowerCase().includes('specification')) {
              product.specs[name] = value;
            }
          }
        });
        
        if (Object.keys(product.specs).length > 0) break;
      }
    }
    
    // Try dl/dt/dd format
    if (Object.keys(product.specs).length === 0) {
      $('.specifications dl, .product-specs dl').each((i, dl) => {
        const $dl = $(dl);
        const dts = $dl.find('dt');
        const dds = $dl.find('dd');
        
        dts.each((i, dt) => {
          const name = $(dt).text().trim();
          const value = $(dds[i])?.text().trim();
          if (name && value) {
            product.specs[name] = value;
          }
        });
      });
    }
    
    // Try div-based specs
    if (Object.keys(product.specs).length === 0) {
      $('.spec-row, .specification-row, .product-attribute').each((i, row) => {
        const $row = $(row);
        const name = $row.find('.spec-name, .spec-label, .attr-name').text().trim();
        const value = $row.find('.spec-value, .spec-data, .attr-value').text().trim();
        
        if (name && value) {
          product.specs[name] = value;
        }
      });
    }
    
    console.log(`[OnlineComponents] Extracted ${Object.keys(product.specs).length} specifications`);
    
    return product;
    
  } catch (error) {
    console.error(`[OnlineComponents] Error fetching product:`, error.message);
    return null;
  }
}

/**
 * Search by exact part number
 * @param {string} mpn - Manufacturer Part Number
 * @returns {Promise<Object>}
 */
export async function onlineComponentsSearchByMPN(mpn) {
  return onlineComponentsSearch(mpn);
}
