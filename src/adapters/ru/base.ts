// base.ts - базовый класс для RU-адаптеров
import * as cheerio from 'cheerio';
import { request } from 'undici';
import { setTimeout as sleep } from 'node:timers/promises';
import iconv from 'iconv-lite';
import { SearchRow, ProductCanon, ParseResult, Region, Currency, Source } from '../../types/canon';
import { parsersConfig, REQUEST_HEADERS, NETWORK_LIMITS } from '../../config/parsers.ru';

export abstract class BaseAdapter {
  protected source: Source;
  protected config: typeof parsersConfig[keyof typeof parsersConfig];
  
  constructor(source: Source) {
    this.source = source;
    this.config = parsersConfig[source];
  }
  
  // Загрузка HTML с обработкой кодировок
  protected async loadHtml(url: string): Promise<cheerio.CheerioAPI | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NETWORK_LIMITS.timeout);
    
    try {
      const response = await request(url, {
        headers: REQUEST_HEADERS,
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.statusCode < 200 || response.statusCode >= 300) {
        console.log(`[${this.source}] HTTP ${response.statusCode} for ${url}`);
        return null;
      }
      
      const contentType = response.headers['content-type'] || '';
      let html: string;
      
      if (contentType.includes('windows-1251') || contentType.includes('cp1251')) {
        const buffer = await response.body.arrayBuffer();
        html = iconv.decode(Buffer.from(buffer), 'win1251');
      } else {
        html = await response.body.text();
      }
      
      return cheerio.load(html);
    } catch (error) {
      console.log(`[${this.source}] Failed to load ${url}:`, error.message || error);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
  
  // Троттлинг с джиттером
  protected async throttle(): Promise<void> {
    const delay = NETWORK_LIMITS.minDelay + 
      Math.random() * (NETWORK_LIMITS.maxDelay - NETWORK_LIMITS.minDelay);
    await sleep(delay);
  }
  
  // Нормализация MPN
  protected normalizeMpn(mpn: string): string {
    return mpn
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^\w\-\/]/g, '');
  }
  
  // Извлечение цены и валюты
  protected extractPrice(text: string): { price: number; currency: Currency } | null {
    if (!text) return null;
    
    // Убираем все кроме цифр и разделителей
    const cleanPrice = text.replace(/[^\d.,\s]/g, '').trim();
    const price = parseFloat(cleanPrice.replace(',', '.').replace(/\s/g, ''));
    
    if (isNaN(price) || price <= 0) return null;
    
    // Определяем валюту
    let currency: Currency = 'RUB';
    if (text.includes('$') || text.includes('USD')) currency = 'USD';
    else if (text.includes('€') || text.includes('EUR')) currency = 'EUR';
    else if (text.includes('₽') || text.includes('руб') || text.includes('RUB')) currency = 'RUB';
    
    return { price, currency };
  }
  
  // Извлечение наличия
  protected extractStock(text: string): number | null {
    if (!text) return null;
    
    const match = text.match(/(\d+)\s*(шт|pcs|pc|штук)?/i);
    if (match) {
      const stock = parseInt(match[1], 10);
      return isNaN(stock) ? null : stock;
    }
    
    if (text.includes('в наличии') || text.includes('есть') || text.includes('available')) {
      return 1; // Неизвестное количество, но есть
    }
    
    if (text.includes('нет') || text.includes('отсутствует') || text.includes('out of stock')) {
      return 0;
    }
    
    return null;
  }
  
  // Определение региона
  protected detectRegion($: cheerio.CheerioAPI): Region[] {
    const text = $.text().toLowerCase();
    const regions: Region[] = [];
    
    if (text.includes('россия') || text.includes('москва') || text.includes('спб')) {
      regions.push('RU');
    }
    if (text.includes('europe') || text.includes('eu') || text.includes('германия')) {
      regions.push('EU');
    }
    if (text.includes('usa') || text.includes('america') || text.includes('сша')) {
      regions.push('US');
    }
    if (text.includes('asia') || text.includes('china') || text.includes('азия')) {
      regions.push('ASIA');
    }
    
    return regions.length > 0 ? regions : ['RU']; // По умолчанию RU для русских сайтов
  }
  
  // Построение абсолютного URL
  protected makeAbsoluteUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return this.config.base + url;
    return this.config.base + '/' + url;
  }
  
  // Обрезка описания
  protected truncateDescription(text: string, maxLength: number = 200): string {
    if (!text) return '';
    const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
  }
  
  // Абстрактные методы для реализации в наследниках
  abstract fetchSearch(query: string): Promise<ParseResult<SearchRow[]>>;
  abstract fetchProduct(mpnOrUrl: string): Promise<ParseResult<ProductCanon>>;
}
