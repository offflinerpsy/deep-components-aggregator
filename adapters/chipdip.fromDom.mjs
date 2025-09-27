import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

function extractTitle(dom) {
  const h1 = dom.window.document.querySelector('h1');
  if (!h1) return '';
  return h1.textContent.trim();
}

function extractManufacturer(dom) {
  const brandLink = dom.window.document.querySelector('a[href*="/brand/"]');
  if (!brandLink) return '';
  return brandLink.textContent.trim();
}

function extractMpn(dom) {
  const mpnElement = dom.window.document.querySelector('.product-code, .article, [data-mpn]');
  if (!mpnElement) return '';
  return mpnElement.textContent.trim();
}

function extractImage(dom) {
  const img = dom.window.document.querySelector('.product-image img, .gallery img, .main-image img');
  if (!img) return '';
  
  const src = img.src || img.getAttribute('data-src');
  if (!src) return '';
  
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('/')) return `https://www.chipdip.by${src}`;
  return src;
}

function extractPrice(dom) {
  const priceElement = dom.window.document.querySelector('.price, .product-price, .current-price');
  if (!priceElement) return { price_raw: 0, currency: '' };
  
  const priceText = priceElement.textContent.trim();
  const priceMatch = priceText.match(/[\d\s,]+/);
  if (!priceMatch) return { price_raw: 0, currency: '' };
  
  const price = parseFloat(priceMatch[0].replace(/[\s,]/g, ''));
  const currency = priceText.includes('₽') ? 'RUB' : 
                   priceText.includes('$') ? 'USD' : 
                   priceText.includes('€') ? 'EUR' : 'RUB';
  
  return { price_raw: price || 0, currency };
}

function extractStock(dom) {
  const stockElement = dom.window.document.querySelector('.stock, .availability, .in-stock');
  if (!stockElement) return '';
  
  const stockText = stockElement.textContent.toLowerCase();
  if (stockText.includes('в наличии') || stockText.includes('есть')) return 'in_stock';
  if (stockText.includes('под заказ') || stockText.includes('заказ')) return 'on_order';
  if (stockText.includes('нет') || stockText.includes('отсутствует')) return 'out_of_stock';
  
  return '';
}

function extractSpecs(dom) {
  const specs = {};
  const specRows = dom.window.document.querySelectorAll('.specs tr, .characteristics tr, .params tr');
  
  for (const row of specRows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim();
      const value = cells[1].textContent.trim();
      if (key && value) {
        specs[key] = value;
      }
    }
  }
  
  return specs;
}

function extractUrl(filename) {
  const match = filename.match(/.*__(.*)\.html$/);
  if (!match) return '';
  
  const sanitized = match[1];
  const url = sanitized.replace(/_/g, '/');
  return `https://www.chipdip.by${url}`;
}

export function parseChipdipDom(html, filename) {
  const dom = new JSDOM(html);
  
  const product = {
    title: extractTitle(dom),
    manufacturer: extractManufacturer(dom),
    mpn: extractMpn(dom),
    image: extractImage(dom),
    url: extractUrl(filename),
    stock: extractStock(dom),
    specs: extractSpecs(dom),
    source: 'chipdip'
  };
  
  const priceData = extractPrice(dom);
  product.price_raw = priceData.price_raw;
  product.currency = priceData.currency;
  
  return product;
}

export function parseChipdipFile(filepath) {
  if (!fs.existsSync(filepath)) {
    return null;
  }
  
  const html = fs.readFileSync(filepath, 'utf8');
  const filename = path.basename(filepath);
  
  return parseChipdipDom(html, filename);
}
