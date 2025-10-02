/**
 * LCSC.com Web Scraper (via ScrapingBee)
 * https://lcsc.com/
 * 
 * Strategy:
 * 1. Search: https://lcsc.com/search?q={mpn}
 * 2. Parse product cards from search results
 * 3. Extract specs from product page
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
 * Search products on LCSC
 * @param {string} query - Search query (part number or keyword)
 * @returns {Promise<Object>}
 */
export async function lcscSearch(query) {
  const searchUrl = `https://www.lcsc.com/search?q=${encodeURIComponent(query)}`;
  
  console.log(`[LCSC Scraper] Searching: ${query}`);
  console.log(`[LCSC Scraper] URL: ${searchUrl}`);
  
  try {
    const key = getNextKey();
    const result = await fetchViaScrapingBee({
      key,
      url: searchUrl,
      timeout: 30000,
      render: true,
      premium: true,  // Use residential proxy
      wait: 3000
    });
    
    if (!result.ok) {
      throw new Error(`ScrapingBee failed: ${result.status}`);
    }
    
    const html = result.text;
    const $ = cheerio.load(html);
    
    console.log(`[LCSC Scraper] HTML length: ${html.length}`);
    
    // Parse search results
    const products = [];
    
    // LCSC uses various selectors for product cards
    const selectors = [
      '.product-item',
      '.goods-item',
      '[class*="ProductItem"]',
      'div[class*="product"]',
      'a[href*="/product-detail/"]'
    ];
    
    let productElements = [];
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`[LCSC Scraper] Found ${elements.length} products with selector: ${selector}`);
        productElements = elements;
        break;
      }
    }
    
    // If no products found with selectors, try to find product links
    if (productElements.length === 0) {
      console.log('[LCSC Scraper] No products with selectors, searching for links...');
      const links = $('a[href*="/product-detail/"]');
      if (links.length > 0) {
        console.log(`[LCSC Scraper] Found ${links.length} product links`);
        productElements = links;
      }
    }
    
    // Extract product info
    productElements.slice(0, 10).each((i, el) => {
      const $el = $(el);
      
      const product = {
        url: '',
        productCode: '',
        model: '',
        manufacturer: '',
        description: '',
        price: '',
        stock: '',
        specs: {}
      };
      
      // Get URL
      const link = $el.is('a') ? $el.attr('href') : $el.find('a[href*="/product-detail/"]').attr('href');
      if (link) {
        product.url = link.startsWith('http') ? link : `https://www.lcsc.com${link}`;
        
        // Extract product code from URL: /product-detail/C123456.html
        const codeMatch = link.match(/C\d+/);
        if (codeMatch) {
          product.productCode = codeMatch[0];
        }
      }
      
      // Get model/part number
      const model = $el.find('[class*="model"], [class*="mpn"]').text().trim() ||
                   $el.find('.product-model').text().trim();
      if (model) product.model = model;
      
      // Get manufacturer
      const mfr = $el.find('[class*="manufacturer"], [class*="brand"]').text().trim() ||
                  $el.find('.product-brand').text().trim();
      if (mfr) product.manufacturer = mfr;
      
      // Get description
      const desc = $el.find('[class*="description"], [class*="intro"]').text().trim() ||
                   $el.find('.product-intro').text().trim();
      if (desc) product.description = desc.substring(0, 200);
      
      // Get price
      const price = $el.find('[class*="price"]').first().text().trim();
      if (price) product.price = price;
      
      // Get stock
      const stock = $el.find('[class*="stock"]').text().trim();
      if (stock) product.stock = stock;
      
      if (product.url) {
        products.push(product);
      }
    });
    
    console.log(`[LCSC Scraper] Extracted ${products.length} products`);
    
    // If we have products, fetch details for the first one
    if (products.length > 0 && products[0].url) {
      console.log(`[LCSC Scraper] Fetching details for: ${products[0].url}`);
      const details = await lcscGetProduct(products[0].url);
      if (details) {
        products[0].specs = details.specs || {};
      }
    }
    
    return {
      ok: true,
      query,
      count: products.length,
      products
    };
    
  } catch (error) {
    console.error(`[LCSC Scraper] Error:`, error.message);
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
 * Get product details from LCSC product page
 * @param {string} url - Product page URL
 * @returns {Promise<Object|null>}
 */
export async function lcscGetProduct(url) {
  console.log(`[LCSC Scraper] Fetching product: ${url}`);
  
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
      specs: {}
    };
    
    // Extract specifications
    // LCSC shows specs in table format
    const specSelectors = [
      'table.parameter-table',
      'table[class*="spec"]',
      'table[class*="param"]',
      '.product-parameters table',
      '.specifications table'
    ];
    
    for (const selector of specSelectors) {
      const specTable = $(selector);
      if (specTable.length > 0) {
        console.log(`[LCSC Scraper] Found specs with: ${selector}`);
        
        specTable.find('tr').each((i, row) => {
          const $row = $(row);
          const cells = $row.find('td, th');
          
          if (cells.length >= 2) {
            const name = $(cells[0]).text().trim();
            const value = $(cells[1]).text().trim();
            
            if (name && value && !name.toLowerCase().includes('parameter')) {
              product.specs[name] = value;
            }
          }
        });
        
        if (Object.keys(product.specs).length > 0) break;
      }
    }
    
    // Try dl/dt/dd format
    if (Object.keys(product.specs).length === 0) {
      $('.product-parameters dl, .specifications dl').each((i, dl) => {
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
    
    console.log(`[LCSC Scraper] Extracted ${Object.keys(product.specs).length} specs`);
    
    return product;
    
  } catch (error) {
    console.error(`[LCSC Scraper] Error fetching product:`, error.message);
    return null;
  }
}

/**
 * Search by exact part number
 * @param {string} mpn - Manufacturer Part Number
 * @returns {Promise<Object>}
 */
export async function lcscSearchByMPN(mpn) {
  return lcscSearch(mpn);
}
