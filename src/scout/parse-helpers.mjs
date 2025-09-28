/**
 * Safely gets trimmed text from a Cheerio element.
 * @param {import('cheerio').CheerioAPI} $ The Cheerio instance.
 * @param {string} selector The CSS selector.
 * @returns {string} The trimmed text or an empty string.
 */
export const text = ($, selector) => {
  return $(selector).first().text().trim();
};

/**
 * Resolves a relative URL against a base URL.
 * @param {string} base The base URL.
 * @param {string} href The relative or absolute URL.
 * @returns {string} The absolute URL.
 */
export const abs = (base, href) => {
  if (!href) return "";
  try {
    return new URL(href, base).toString();
  } catch (e) {
    return "";
  }
};

/**
 * Extracts a numeric price from a string.
 * @param {string} str The string containing the price.
 * @returns {number} The parsed price or 0.
 */
export const pickPrice = (str) => {
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9,.]/g, '').replace(',', '.');
  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : price;
};

/**
 * Detects currency from a string.
 * @param {string} str The string containing the currency symbol or code.
 * @returns {string} The detected currency ('RUB', 'USD', 'EUR') or an empty string.
 */
export const detectCurrency = (str) => {
  if (!str) return "";
  const s = str.toLowerCase();
  if (s.includes('₽') || s.includes('руб')) return 'RUB';
  if (s.includes('$') || s.includes('usd')) return 'USD';
  if (s.includes('€') || s.includes('eur')) return 'EUR';
  return "";
};

/**
 * Checks for common captcha signatures in HTML content.
 * @param {string} html The raw HTML content.
 * @returns {boolean} True if a captcha signature is found.
 */
export const hasCaptcha = (html) => {
  if (!html) return false;
  const s = html.toLowerCase();
  return s.includes('recaptcha') || s.includes('cloudflare') || s.includes('captcha');
};

