/**
 * Mouser Website Scraper - вытаскивает ВСЕ характеристики с сайта
 * Используется как fallback если API дает мало данных
 */

import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Scrape Mouser product page for specifications
 * @param {string} mpn - Manufacturer Part Number
 * @returns {Promise<Object>} - { ok, specs, images, description, manufacturer }
 */
export async function scrapeMouserProduct(mpn) {
  try {
    // Mouser product URL format
    const searchUrl = `https://www.mouser.com/c/?q=${encodeURIComponent(mpn)}`;
    
    console.log(`[Mouser Scraper] Searching: ${mpn}`);
    
    // 1. Search for product
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!searchResponse.ok) {
      console.log(`[Mouser Scraper] Search failed: ${searchResponse.status}`);
      return { ok: false, error: `HTTP ${searchResponse.status}` };
    }
    
    const searchHtml = await searchResponse.text();
    const $search = cheerio.load(searchHtml);
    
    // Find first product link
    let productUrl = null;
    
    // Try different selectors for product links
    const linkSelectors = [
      '.search-result-link',
      'a[href*="/ProductDetail/"]',
      'a[href*="_/"]',
      '.grid-item a',
      '.part-number-link'
    ];
    
    for (const selector of linkSelectors) {
      const link = $search(selector).first();
      if (link.length > 0) {
        const href = link.attr('href');
        if (href) {
          productUrl = href.startsWith('http') ? href : `https://www.mouser.com${href}`;
          break;
        }
      }
    }
    
    if (!productUrl) {
      console.log(`[Mouser Scraper] Product link not found in search results`);
      return { ok: false, error: 'Product not found' };
    }
    
    console.log(`[Mouser Scraper] Product URL: ${productUrl}`);
    
    // 2. Get product page
    const productResponse = await fetch(productUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': searchUrl
      }
    });
    
    if (!productResponse.ok) {
      console.log(`[Mouser Scraper] Product page failed: ${productResponse.status}`);
      return { ok: false, error: `HTTP ${productResponse.status}` };
    }
    
    const productHtml = await productResponse.text();
    const $ = cheerio.load(productHtml);
    
    // 3. Extract ALL specifications
    const specs = {};
    
    // Main specifications table
    $('.specs-table tr, .pdp-product-specs tr, #specs-table tr, table.specs tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td, th');
      
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim().replace(/:$/, '');
        const value = $(cells[1]).text().trim();
        
        if (key && value && value !== '-' && value !== 'N/A') {
          specs[key] = value;
        }
      }
    });
    
    // Alternative: dl/dt/dd structure
    $('.specs dl, .specifications dl, .product-specs dl').each((i, dl) => {
      $(dl).find('dt').each((j, dt) => {
        const key = $(dt).text().trim().replace(/:$/, '');
        const dd = $(dt).next('dd');
        const value = dd.text().trim();
        
        if (key && value && value !== '-' && value !== 'N/A') {
          specs[key] = value;
        }
      });
    });
    
    // Alternative: div.spec-item structure
    $('.spec-item, .specification-item, .attr-item').each((i, item) => {
      const $item = $(item);
      const key = $item.find('.spec-name, .attr-name, .label').text().trim().replace(/:$/, '');
      const value = $item.find('.spec-value, .attr-value, .value').text().trim();
      
      if (key && value && value !== '-' && value !== 'N/A') {
        specs[key] = value;
      }
    });
    
    // 4. Extract metadata
    const description = $('.pdp-product-name, .product-name, h1.page-title').first().text().trim();
    const manufacturer = $('.manufacturer-name, .brand-name, .mfr-name').first().text().trim();
    
    // 5. Extract images
    const images = [];
    $('img[src*="cloudfront"], img[src*="mouser.com/images"], .product-image img, .pdp-image img').each((i, img) => {
      const src = $(img).attr('src');
      if (src && !src.includes('spacer') && !src.includes('placeholder')) {
        const fullSrc = src.startsWith('http') ? src : `https:${src}`;
        if (!images.includes(fullSrc)) {
          images.push(fullSrc);
        }
      }
    });
    
    const specsCount = Object.keys(specs).length;
    console.log(`[Mouser Scraper] ✅ Extracted ${specsCount} specs, ${images.length} images`);
    
    if (specsCount > 0) {
      console.log(`[Mouser Scraper] Sample specs:`, Object.keys(specs).slice(0, 5));
    }
    
    return {
      ok: true,
      specs,
      images,
      description,
      manufacturer,
      url: productUrl
    };
    
  } catch (error) {
    console.log(`[Mouser Scraper] ❌ Error: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

// Для тестирования
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
  const testMPN = process.argv[2] || 'M83513/19-E01NW';
  console.log(`Testing scraper with: ${testMPN}\n`);
  
  scrapeMouserProduct(testMPN).then(result => {
    console.log('\nResult:', JSON.stringify(result, null, 2));
  });
}
