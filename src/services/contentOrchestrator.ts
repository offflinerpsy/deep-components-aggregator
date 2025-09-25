// contentOrchestrator.ts - оркестратор контента из всех источников
import { SearchRow, ProductCanon, ParseResult, Source } from '../types/canon';
import { SOURCE_PRIORITY, NETWORK_LIMITS } from '../config/parsers.ru';
import { ChipDipAdapter } from '../adapters/ru/chipdip';
import { PromelecAdapter } from '../adapters/ru/promelec';
import { CompelAdapter } from '../adapters/ru/compel';
import { ElectronshikAdapter } from '../adapters/ru/electronshik';
import { ElitanAdapter } from '../adapters/ru/elitan';
import { searchOEMsTrade } from '../../adapters/oemstrade';
import { convertToRub } from '../currency';

// Инициализация адаптеров
const adapters = {
  chipdip: new ChipDipAdapter(),
  promelec: new PromelecAdapter(),
  compel: new CompelAdapter(),
  electronshik: new ElectronshikAdapter(),
  elitan: new ElitanAdapter()
};

export class ContentOrchestrator {
  // Поиск по всем источникам
  async searchAll(query: string): Promise<SearchRow[]> {
    const results: SearchRow[] = [];
    const promises: Promise<void>[] = [];
    
    // Параллельный запрос к RU-источникам
    for (const source of SOURCE_PRIORITY) {
      const adapter = adapters[source];
      if (!adapter) continue;
      
      const promise = adapter.fetchSearch(query).then(async (result) => {
        if (result.status === 'OK' && result.data) {
          // Конвертируем цены в рубли
          for (const item of result.data) {
            if (item.min_currency && item.min_currency !== 'RUB' && item.min_price_rub === null) {
              const rate = await convertToRub(item.min_currency);
              if (rate && item.min_price_rub !== null) {
                item.min_price_rub = Math.round(item.min_price_rub * rate);
              }
            }
          }
          results.push(...result.data);
        }
      }).catch(err => {
        console.log(`[${source}] Search error:`, err.message);
      });
      
      promises.push(promise);
      
      // Ограничиваем параллелизм
      if (promises.length >= NETWORK_LIMITS.maxConcurrent) {
        await Promise.race(promises);
      }
    }
    
    // Добавляем OEMsTrade
    const oemsPromise = this.searchOEMsTrade(query).then(items => {
      results.push(...items);
    }).catch(err => {
      console.log('[oemstrade] Search error:', err.message);
    });
    
    promises.push(oemsPromise);
    
    // Ждём все результаты
    await Promise.allSettled(promises);
    
    // Дедупликация и сортировка
    return this.deduplicateAndSort(results, query);
  }
  
  // Поиск в OEMsTrade
  private async searchOEMsTrade(query: string): Promise<SearchRow[]> {
    const oemsResults = await searchOEMsTrade(query);
    const results: SearchRow[] = [];
    
    if (Array.isArray(oemsResults)) {
      for (const item of oemsResults) {
        let priceRub = 0;
        if (item.price_min > 0 && item.price_min_currency) {
          if (item.price_min_currency === 'RUB') {
            priceRub = item.price_min;
          } else {
            const rate = await convertToRub(item.price_min_currency);
            if (rate) {
              priceRub = Math.round(item.price_min * rate);
            }
          }
        }
        
        results.push({
          mpn: item.mpn || query,
          title: item.title || item.mpn || query,
          manufacturer: item.manufacturer || '',
          description_short: this.truncateText(item.description || '', 200),
          package: item.package || '',
          packaging: item.packaging || '',
          regions: item.regions || ['RU'],
          stock: item.stock_total || null,
          min_price_rub: priceRub || null,
          min_currency: item.price_min_currency as any || null,
          image_url: item.image || null,
          product_url: item.url || '',
          source: 'oemstrade'
        });
      }
    }
    
    return results;
  }
  
  // Получение карточки товара
  async fetchProduct(mpn: string): Promise<ProductCanon | null> {
    // Пробуем RU-источники по приоритету
    for (const source of SOURCE_PRIORITY) {
      const adapter = adapters[source];
      if (!adapter) continue;
      
      const result = await adapter.fetchProduct(mpn);
      if (result.status === 'OK' && result.data) {
        // Конвертируем цену если нужно
        const product = result.data;
        if (product.order.min_currency && product.order.min_currency !== 'RUB' && !product.order.min_price_rub) {
          const rate = await convertToRub(product.order.min_currency);
          if (rate && product.order.min_price_rub !== null) {
            product.order.min_price_rub = Math.round(product.order.min_price_rub * rate);
          }
        }
        
        // Дополняем частичные данные из других источников
        await this.enrichProduct(product, mpn);
        
        return product;
      }
    }
    
    // Fallback на OEMsTrade
    return this.fetchFromOEMsTrade(mpn);
  }
  
  // Обогащение карточки из других источников
  private async enrichProduct(product: ProductCanon, mpn: string): Promise<void> {
    const enrichPromises: Promise<void>[] = [];
    
    // Если не хватает изображений, документов или спеков
    const needImages = product.gallery.length === 0 || !product.gallery[0].image_url;
    const needDocs = product.docs.length === 0;
    const needSpecs = product.specs.length < 5;
    const needDescription = !product.description_html;
    
    if (needImages || needDocs || needSpecs || needDescription) {
      for (const source of SOURCE_PRIORITY) {
        if (product.sources.some(s => s.source === source)) continue;
        
        const adapter = adapters[source];
        if (!adapter) continue;
        
        const promise = adapter.fetchProduct(mpn).then(result => {
          if (result.status !== 'OK' || !result.data) return;
          
          const data = result.data;
          
          // Дополняем изображения
          if (needImages && data.gallery.length > 0) {
            for (const img of data.gallery) {
              if (img.image_url && !product.gallery.some(g => g.image_url === img.image_url)) {
                product.gallery.push(img);
              }
            }
          }
          
          // Дополняем документы
          if (needDocs && data.docs.length > 0) {
            for (const doc of data.docs) {
              if (!product.docs.some(d => d.url === doc.url)) {
                product.docs.push(doc);
              }
            }
          }
          
          // Дополняем спеки
          if (needSpecs && data.specs.length > 0) {
            for (const spec of data.specs) {
              if (!product.specs.some(s => s.name === spec.name)) {
                product.specs.push(spec);
              }
            }
          }
          
          // Дополняем описание
          if (needDescription && data.description_html) {
            product.description_html = data.description_html;
          }
          
          // Добавляем источник
          product.sources.push({
            source: source,
            product_url: data.sources[0]?.product_url || ''
          });
        }).catch(err => {
          console.log(`[${source}] Enrich error:`, err.message);
        });
        
        enrichPromises.push(promise);
        
        if (enrichPromises.length >= NETWORK_LIMITS.maxConcurrent) {
          await Promise.race(enrichPromises);
        }
      }
      
      await Promise.allSettled(enrichPromises);
    }
  }
  
  // Получение из OEMsTrade
  private async fetchFromOEMsTrade(mpn: string): Promise<ProductCanon | null> {
    const results = await searchOEMsTrade(mpn);
    if (!Array.isArray(results) || results.length === 0) return null;
    
    const item = results.find(r => r.mpn === mpn) || results[0];
    
    let priceRub = 0;
    if (item.price_min > 0 && item.price_min_currency) {
      if (item.price_min_currency === 'RUB') {
        priceRub = item.price_min;
      } else {
        const rate = await convertToRub(item.price_min_currency);
        if (rate) {
          priceRub = Math.round(item.price_min * rate);
        }
      }
    }
    
    return {
      mpn: item.mpn || mpn,
      title: item.title || item.mpn || mpn,
      manufacturer: item.manufacturer || '',
      gallery: item.images?.length > 0 
        ? item.images.map(url => ({ image_url: url }))
        : [{ image_url: item.image || '' }],
      meta: {
        package: item.package || '',
        packaging: item.packaging || ''
      },
      order: {
        regions: item.regions || ['RU'],
        stock: item.stock_total || null,
        min_price_rub: priceRub || null,
        min_currency: item.price_min_currency as any || null
      },
      description_html: item.description || '',
      docs: item.datasheets?.map(url => ({
        label: 'Datasheet',
        url
      })) || [],
      specs: [],
      sources: [{
        source: 'oemstrade',
        product_url: item.url || ''
      }]
    };
  }
  
  // Дедупликация и сортировка результатов поиска
  private deduplicateAndSort(results: SearchRow[], query: string): SearchRow[] {
    // Группируем по MPN + manufacturer + package
    const grouped = new Map<string, SearchRow>();
    
    for (const item of results) {
      const key = `${item.mpn}|${item.manufacturer}|${item.package}`;
      const existing = grouped.get(key);
      
      if (!existing || this.isBetterResult(item, existing)) {
        grouped.set(key, item);
      }
    }
    
    // Преобразуем обратно в массив
    const deduplicated = Array.from(grouped.values());
    
    // Сортировка
    deduplicated.sort((a, b) => {
      // Точное совпадение MPN
      const aExact = a.mpn.toUpperCase() === query.toUpperCase();
      const bExact = b.mpn.toUpperCase() === query.toUpperCase();
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Наличие на складе
      const aHasStock = (a.stock || 0) > 0;
      const bHasStock = (b.stock || 0) > 0;
      if (aHasStock && !bHasStock) return -1;
      if (!aHasStock && bHasStock) return 1;
      
      // Минимальная цена
      const aPrice = a.min_price_rub || Number.MAX_VALUE;
      const bPrice = b.min_price_rub || Number.MAX_VALUE;
      return aPrice - bPrice;
    });
    
    // Ограничиваем до 40 результатов
    return deduplicated.slice(0, 40);
  }
  
  // Определение лучшего результата
  private isBetterResult(a: SearchRow, b: SearchRow): boolean {
    // Приоритет RU-источников
    const aIsRu = a.source !== 'oemstrade';
    const bIsRu = b.source !== 'oemstrade';
    if (aIsRu && !bIsRu) return true;
    if (!aIsRu && bIsRu) return false;
    
    // Больше информации
    const aInfo = (a.description_short ? 1 : 0) + 
                  (a.image_url ? 1 : 0) + 
                  (a.manufacturer ? 1 : 0);
    const bInfo = (b.description_short ? 1 : 0) + 
                  (b.image_url ? 1 : 0) + 
                  (b.manufacturer ? 1 : 0);
    if (aInfo > bInfo) return true;
    if (aInfo < bInfo) return false;
    
    // Наличие и цена
    const aHasStock = (a.stock || 0) > 0;
    const bHasStock = (b.stock || 0) > 0;
    if (aHasStock && !bHasStock) return true;
    if (!aHasStock && bHasStock) return false;
    
    const aPrice = a.min_price_rub || Number.MAX_VALUE;
    const bPrice = b.min_price_rub || Number.MAX_VALUE;
    return aPrice < bPrice;
  }
  
  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
  }
}

// Экспорт синглтона
export const contentOrchestrator = new ContentOrchestrator();
