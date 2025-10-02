/**
 * Octopart Web Scraper (via ScrapingBee)
 * https://octopart.com/
 * 
 * Scraping Strategy:
 * 1. Search page: https://octopart.com/search?q={query}
 * 2. Extract product links from search results
 * 3. Parse product page for specifications
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
 * Search products on Octopart
 * @param {string} query - Search query (part number or keyword)
 * @returns {Promise<Object>}
 */
export async function octopartSearch(query) {
  const searchUrl = `https://octopart.com/search?q=${encodeURIComponent(query)}`;
  
  console.log(`[Octopart Scraper] Searching: ${query}`);
  console.log(`[Octopart Scraper] URL: ${searchUrl}`);
  
  try {
    const key = getNextKey();
    const result = await fetchViaScrapingBee({
      key,
      url: searchUrl,
      timeout: 45000,
      render: true,      // JS rendering
      premium: true,     // Residential proxy
      stealth: true,     // Anti-bot detection
      wait: 3000         // Wait 3s for page load
    });
    
    if (!result.ok) {
      throw new Error(`ScrapingBee failed: ${result.status}`);
    }
    
    const html = result.text;
    const $ = cheerio.load(html);
    
    // Parse search results
    const products = [];
    
    // Octopart search results structure:
    // - Product cards with class "search-result" or similar
    // - Each card contains: MPN, manufacturer, description, specs, price
    
    // Try multiple selectors for product cards
    const selectors = [
      '.search-result',
      '[data-testid="search-result"]',
      '.product-card',
      'div[class*="SearchResult"]',
      'a[href*="/part/"]'
    ];
    
    let productLinks = [];
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`[Octopart Scraper] Found ${elements.length} products with selector: ${selector}`);
        elements.each((i, el) => {
          const $el = $(el);
          const link = $el.is('a') ? $el.attr('href') : $el.find('a[href*="/part/"]').attr('href');
          if (link) {
            productLinks.push(link.startsWith('http') ? link : `https://octopart.com${link}`);
          }
        });
        break;
      }
    }
    
    // If no products found, try extracting from raw HTML
    if (productLinks.length === 0) {
      console.log('[Octopart Scraper] No products with selectors, trying regex...');
      const linkMatches = html.matchAll(/href="(\/part\/[^"]+)"/g);
      for (const match of linkMatches) {
        productLinks.push(`https://octopart.com${match[1]}`);
      }
      productLinks = [...new Set(productLinks)]; // Deduplicate
    }
    
    console.log(`[Octopart Scraper] Found ${productLinks.length} product links`);
    
    // For each product link, extract basic info from search page
    for (let i = 0; i < Math.min(productLinks.length, 5); i++) {
      const link = productLinks[i];
      
      // Try to extract info from search page first
      const productData = {
        url: link,
        mpn: '',
        manufacturer: '',
        description: '',
        specs: {},
        distributors: []
      };
      
      // Extract MPN from URL: /part/Manufacturer/MPN
      const urlMatch = link.match(/\/part\/([^\/]+)\/([^\/\?]+)/);
      if (urlMatch) {
        productData.manufacturer = decodeURIComponent(urlMatch[1]);
        productData.mpn = decodeURIComponent(urlMatch[2]);
      }
      
      products.push(productData);
    }
    
    // If we have products, scrape first product details
    if (products.length > 0 && productLinks[0]) {
      console.log(`[Octopart Scraper] Fetching details for first product: ${productLinks[0]}`);
      const details = await octopartGetProduct(productLinks[0]);
      if (details) {
        products[0] = { ...products[0], ...details };
      }
    }
    
    return {
      ok: true,
      query,
      count: products.length,
      products
    };
    
  } catch (error) {
    console.error(`[Octopart Scraper] Error:`, error.message);
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
 * Get product details from Octopart product page
 * @param {string} url - Product page URL
 * @returns {Promise<Object|null>}
 */
export async function octopartGetProduct(url) {
  console.log(`[Octopart Scraper] Fetching product: ${url}`);
  
  try {
    const key = getNextKey();
    const result = await fetchViaScrapingBee({
      key,
      url,
      timeout: 45000,
      render: true,
      premium: true,
      stealth: true,
      wait: 3000
    });
    
    if (!result.ok) {
      throw new Error(`ScrapingBee failed: ${result.status}`);
    }
    
    const html = result.text;
    const $ = cheerio.load(html);
    
    const product = {
      specs: {},
      distributors: []
    };
    
    // Extract specifications
    // Octopart shows specs in table or list format
    const specSelectors = [
      'table[class*="spec"]',
      'table[class*="attribute"]',
      'table[class*="parameter"]',
      'div[class*="Specifications"]',
      '[data-testid="specifications"]'
    ];
    
    for (const selector of specSelectors) {
      const specTable = $(selector);
      if (specTable.length > 0) {
        console.log(`[Octopart Scraper] Found specs with: ${selector}`);
        
        specTable.find('tr').each((i, row) => {
          const $row = $(row);
          const cells = $row.find('td, th');
          if (cells.length >= 2) {
            const name = $(cells[0]).text().trim();
            const value = $(cells[1]).text().trim();
            if (name && value) {
              product.specs[name] = value;
            }
          }
        });
        break;
      }
    }
    
    // If table not found, try dl/dt/dd format
    if (Object.keys(product.specs).length === 0) {
      $('dl').each((i, dl) => {
        const $dl = $(dl);
        const dts = $dl.find('dt');
        const dds = $dl.find('dd');
        
        dts.each((i, dt) => {
          const name = $(dt).text().trim();
          const value = $(dds[i]).text().trim();
          if (name && value) {
            product.specs[name] = value;
          }
        });
      });
    }
    
    // Extract distributor info
    const distRows = $('tr[class*="distributor"], div[class*="offer"], [data-testid*="offer"]');
    distRows.each((i, row) => {
      const $row = $(row);
      const dist = {
        name: $row.find('[class*="distributor-name"], [class*="seller"]').text().trim(),
        stock: $row.find('[class*="stock"], [class*="availability"]').text().trim(),
        price: $row.find('[class*="price"]').text().trim()
      };
      if (dist.name) {
        product.distributors.push(dist);
      }
    });
    
    console.log(`[Octopart Scraper] Extracted ${Object.keys(product.specs).length} specs, ${product.distributors.length} distributors`);
    
    return product;
    
  } catch (error) {
    console.error(`[Octopart Scraper] Error fetching product:`, error.message);
    return null;
  }
}

/**
 * Search by exact part number
 * @param {string} mpn - Manufacturer Part Number
 * @returns {Promise<Object>}
 */
export async function octopartSearchByMPN(mpn) {
  return octopartSearch(mpn);
}
