/**
 * Mouser.com Web Scraper (via ScrapingBee with Premium Proxy)
 * Goal: Get ALL 20+ specifications (not just 1 from API)
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

export async function scrapeMouserProduct(mpn) {
  console.log(`[Mouser Scraper] Searching: ${mpn}`);
  
  try {
    // Step 1: Search to find product URL
    const searchUrl = `https://www.mouser.com/c/?q=${encodeURIComponent(mpn)}`;
    const key = getNextKey();
    
    console.log(`[Mouser Scraper] Search URL: ${searchUrl}`);
    
    const searchResult = await fetchViaScrapingBee({
      key,
      url: searchUrl,
      timeout: 45000,
      render: true,
      premium: true,
      stealth: true,
      wait: 5000
    });

    if (!searchResult.ok) {
      console.log(`[Mouser Scraper] ❌ Search failed: ${searchResult.status}`);
      return { specs: {}, image: null };
    }

    const searchHtml = searchResult.text;
    const $search = cheerio.load(searchHtml);
    
    console.log(`[Mouser Scraper] Search HTML length: ${searchHtml.length}`);
    
    // Find product detail link
    let productUrl = null;
    const productLinks = $search('a[href*="/ProductDetail/"]');
    
    if (productLinks.length > 0) {
      const href = productLinks.first().attr('href');
      productUrl = href?.startsWith('http') ? href : `https://www.mouser.com${href}`;
      console.log(`[Mouser Scraper] Found product URL: ${productUrl}`);
    } else {
      console.log('[Mouser Scraper] ❌ No product link found in search results');
      return { specs: {}, image: null };
    }
    
    // Step 2: Fetch product page
    const key2 = getNextKey();
    const result = await fetchViaScrapingBee({
      key: key2,
      url: productUrl,
      timeout: 60000,  // 60 seconds
      render: true,
      premium: true,
      stealth: true,
      wait: 3000       // Reduced wait time
    });

    if (!result.ok) {
      console.log(`[Mouser Scraper] ❌ Product page failed: ${result.status}`);
      return { specs: {}, image: null };
    }

    const html = result.text;
    const $ = cheerio.load(html);
    
    console.log(`[Mouser Scraper] Product page HTML length: ${html.length}`);

    // Extract specifications table
    const specs = {};
    
    // Method 1: Product Attributes table
    $('.pdp-product-specs table tr').each((i, row) => {
      const $row = $(row);
      const label = $row.find('td:first-child').text().trim();
      const value = $row.find('td:last-child').text().trim();
      if (label && value) {
        specs[label] = value;
      }
    });

    // Method 2: Specifications section
    $('.specifications-table tr, .spec-table tr, table.attributes tr').each((i, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();
        if (label && value && !label.includes('Attribute') && !label.includes('Select')) {
          specs[label] = value;
        }
      }
    });

    // Method 3: Attribute divs
    $('.pdp-attribute-item, .attribute-item').each((i, item) => {
      const $item = $(item);
      const label = $item.find('.attribute-label, .attr-label, dt').text().trim();
      const value = $item.find('.attribute-value, .attr-value, dd').text().trim();
      if (label && value) {
        specs[label] = value;
      }
    });

    // Extract high-res image
    let image = null;
    const mainImg = $('.pdp-product-image img, .product-image img, #product-image').first();
    if (mainImg.length) {
      image = mainImg.attr('src') || mainImg.attr('data-src') || mainImg.attr('data-lazy');
      if (image && image.startsWith('//')) {
        image = 'https:' + image;
      } else if (image && image.startsWith('/')) {
        image = 'https://www.mouser.com' + image;
      }
    }

    return { specs, image };
  } catch (error) {
    console.error('[MOUSER SCRAPER] Error:', error.message);
    return { specs: {}, image: null };
  }
}
