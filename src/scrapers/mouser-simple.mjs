/**
 * Mouser Website Scraper - БЕЗ cheerio (только regexp)
 * Вытаскивает ВСЕ характеристики с сайта
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Scrape Mouser product page for specifications
 * @param {string} mpn - Manufacturer Part Number
 * @returns {Promise<Object>} - { ok, specs, images, description, manufacturer }
 */
export async function scrapeMouserProduct(mpn) {
  try {
    const searchUrl = `https://www.mouser.com/c/?q=${encodeURIComponent(mpn)}`;
    
    console.log(`[Mouser Scraper] Searching: ${mpn}`);
    
    // 1. Search - find product link
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    if (!searchResponse.ok) {
      console.log(`[Mouser Scraper] Search failed: ${searchResponse.status}`);
      return { ok: false, error: `HTTP ${searchResponse.status}` };
    }
    
    const searchHtml = await searchResponse.text();
    
    // Find product link - multiple patterns
    let productUrl = null;
    const linkPatterns = [
      /href="(\/ProductDetail\/[^"]+)"/i,
      /href="(https:\/\/www\.mouser\.com\/ProductDetail\/[^"]+)"/i,
      /href="([^"]*_\/[^"]+)"/i
    ];
    
    for (const pattern of linkPatterns) {
      const match = searchHtml.match(pattern);
      if (match) {
        productUrl = match[1].startsWith('http') ? match[1] : `https://www.mouser.com${match[1]}`;
        break;
      }
    }
    
    if (!productUrl) {
      console.log(`[Mouser Scraper] Product link not found`);
      return { ok: false, error: 'Product not found' };
    }
    
    console.log(`[Mouser Scraper] Product URL: ${productUrl}`);
    
    // 2. Get product page
    const productResponse = await fetch(productUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': searchUrl
      }
    });
    
    if (!productResponse.ok) {
      console.log(`[Mouser Scraper] Product page failed: ${productResponse.status}`);
      return { ok: false, error: `HTTP ${productResponse.status}` };
    }
    
    const html = await productResponse.text();
    
    // 3. Extract specifications using regexp
    const specs = {};
    
    // Pattern 1: <tr><td>Key</td><td>Value</td></tr>
    const tablePattern = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/gi;
    let match;
    while ((match = tablePattern.exec(html)) !== null) {
      const key = match[1].trim().replace(/:$/, '').replace(/&nbsp;/g, ' ');
      const value = match[2].trim().replace(/&nbsp;/g, ' ');
      
      if (key && value && value !== '-' && value !== 'N/A' && key.length > 1 && value.length > 0) {
        specs[key] = value;
      }
    }
    
    // Pattern 2: <dt>Key</dt><dd>Value</dd>
    const dlPattern = /<dt[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/gi;
    while ((match = dlPattern.exec(html)) !== null) {
      const key = match[1].trim().replace(/:$/, '').replace(/&nbsp;/g, ' ');
      const value = match[2].trim().replace(/&nbsp;/g, ' ');
      
      if (key && value && value !== '-' && value !== 'N/A' && !specs[key]) {
        specs[key] = value;
      }
    }
    
    // Pattern 3: <div class="spec-*"><span>Key</span><span>Value</span></div>
    const divPattern = /<div[^>]*class="[^"]*spec[^"]*"[^>]*>\s*<[^>]+>([^<]+)<\/[^>]+>\s*<[^>]+>([^<]+)<\/[^>]+>/gi;
    while ((match = divPattern.exec(html)) !== null) {
      const key = match[1].trim().replace(/:$/, '').replace(/&nbsp;/g, ' ');
      const value = match[2].trim().replace(/&nbsp;/g, ' ');
      
      if (key && value && value !== '-' && value !== 'N/A' && !specs[key]) {
        specs[key] = value;
      }
    }
    
    // 4. Extract metadata
    const titleMatch = html.match(/<h1[^>]*class="[^"]*product-name[^"]*"[^>]*>([^<]+)<\/h1>/i) || 
                       html.match(/<title>([^<]+)<\/title>/i);
    const description = titleMatch ? titleMatch[1].trim().replace(/&nbsp;/g, ' ') : '';
    
    const mfrMatch = html.match(/<span[^>]*class="[^"]*manufacturer[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                     html.match(/<div[^>]*class="[^"]*brand[^"]*"[^>]*>([^<]+)<\/div>/i);
    const manufacturer = mfrMatch ? mfrMatch[1].trim() : '';
    
    // 5. Extract images
    const images = [];
    const imgPattern = /<img[^>]+src="([^"]+)"[^>]*>/gi;
    while ((match = imgPattern.exec(html)) !== null) {
      const src = match[1];
      if (src.includes('cloudfront') || src.includes('mouser.com/images')) {
        if (!src.includes('spacer') && !src.includes('placeholder')) {
          const fullSrc = src.startsWith('http') ? src : `https:${src}`;
          if (!images.includes(fullSrc)) {
            images.push(fullSrc);
          }
        }
      }
    }
    
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

// Test code (only if run directly)
if (typeof process !== 'undefined' && process.argv && process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const testMPN = process.argv[2] || 'M83513/19-E01NW';
  console.log(`Testing scraper with: ${testMPN}\n`);
  
  scrapeMouserProduct(testMPN).then(result => {
    console.log('\nResult:', JSON.stringify(result, null, 2));
  });
}
