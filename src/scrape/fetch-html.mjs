import { fetchViaScraperAPI } from './providers/scraperapi.mjs';
import { fetchViaScrapingBee } from './providers/scrapingbee.mjs';

export function fetchHtmlRotating({ url, timeout = 9500, session = 0, primary = 'scraperapi', keys = {} }) {
  const a = () => fetchViaScraperAPI({ key: keys.scraperapi || '', url, timeout, country: 'ru', session, render: false });
  const b = () => fetchViaScrapingBee({ key: (keys.scrapingbee || '').split(',')[0] || '', url, timeout, render: false });

  const chain = primary === 'scraperapi' ? [a, b] : [b, a];
  return chain[0]().then(res => res && res.ok ? res : chain[1]());
}



