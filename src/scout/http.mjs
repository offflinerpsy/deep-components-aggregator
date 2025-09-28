import { fetch, setGlobalDispatcher, ProxyAgent } from "undici";
import { load } from "cheerio";
import iconv from "iconv-lite";

// Set up proxy agent if HTTPS_PROXY or HTTP_PROXY is defined
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  const dispatcher = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(dispatcher);
}

const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
    'Cache-Control': 'max-age=0',
    'Referer': 'https://www.google.com/',
    'Sec-Ch-Ua': '"Chromium";v="128", "Not?A_Brand";v="8", "Google Chrome";v="128"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
};

/**
 * Fetches a URL, handles character encoding, and returns a Cheerio instance.
 * @param {string} url The URL to fetch.
 * @returns {Promise<{ok: boolean, status?: number, reason?: string, $?: cheerio.CheerioAPI, html?: string}>}
 */
export async function fetchHtml(url) {

  const response = await fetch(url, { headers: defaultHeaders }).catch(err => {
    // This catches DNS errors, etc.
    return { ok: false, status: 503, reason: `undici fetch error: ${err.message}`, headers: new Map() };
  });

  if (!response.ok) {
    return { ok: false, status: response.status, reason: `HTTP error ${response.status}`, headers: response.headers };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";

  let html;
  // Use regex to find charset in meta tags as a fallback
  let encoding = 'utf-8';
  if (contentType.includes("1251")) {
    encoding = "win1251";
  } else {
    const htmlHead = buffer.slice(0, 1024).toString();
    const match = htmlHead.match(/<meta.*?charset=["']?([^"']+)["']?/i);
    if (match && match[1].toLowerCase().includes('1251')) {
        encoding = 'win1251';
    }
  }

  html = iconv.decode(buffer, encoding);

  // Anti-bot detection
  if (html.includes('check_human') || html.includes('ddg-blocked')) {
      return { ok: false, status: 403, reason: 'DDoS protection detected (check_human, ddg-blocked)', html };
  }

  const $ = load(html);

  return { ok: true, status: response.status, $, html };
}
