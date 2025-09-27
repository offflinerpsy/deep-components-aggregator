// content-orchestrator.js - оркестратор контента из всех источников
import { parseChipDipFast } from '../adapters/ru/chipdip-fast.js';
import { parsePromelec } from '../adapters/ru/promelec.js';
import { parseElectronshik } from '../adapters/ru/electronshik.js';
import { parseElitan } from '../adapters/ru/elitan.js';
import { parseCompel } from '../adapters/ru/compel.js';
import { parsePlatan } from '../adapters/ru/platan.js';
import { searchOEMsTrade } from '../../adapters/oemstrade.js';
import { convertToRub } from '../currency.js';
import { searchTokenizer } from './search-tokenizer.js';
import { createDb, queryDb } from '../search/db.js';

// Функциональные адаптеры
const adapters = {
  chipdip: parseChipDipFast,
  promelec: parsePromelec,
  compel: parseCompel,
  electronshik: parseElectronshik,
  elitan: parseElitan,
  platan: parsePlatan
};

// Приоритет источников
const SOURCE_PRIORITY = ['chipdip', 'promelec', 'compel', 'electronshik', 'elitan', 'platan'];

// Лимиты для троттлинга
const NETWORK_LIMITS = {
  timeout: 12000,
  minDelay: 600,
  maxDelay: 1200,
  maxConcurrent: 3
};

export class ContentOrchestrator {
  constructor() {
    this.oramaDb = null;
  }

  // Инициализация Orama DB с данными
  async initOramaDb(docs = []) {
    if (!this.oramaDb) {
      this.oramaDb = await createDb(docs);
      console.log(`🔍 Orama DB initialized with ${docs.length} documents`);
    }
    return this.oramaDb;
  }

  // Поиск по всем источникам с приоритетом Orama
  async searchAll(query) {
    const results = [];

    // Сначала пробуем Orama (быстрый локальный поиск с MPN-бустингом)
    if (this.oramaDb) {
      const oramaResults = await queryDb(this.oramaDb, query);
      if (oramaResults.hits && oramaResults.hits.length > 0) {
        results.push(...oramaResults.hits.map(hit => hit.document));
        console.log(`🔍 Orama found ${oramaResults.hits.length} results for "${query}"`);
      }
    }

    // Если Orama не дала результатов, идём к OEMsTrade
    if (results.length === 0) {
      const oemsResults = await this.searchOEMsTrade(query);
      results.push(...oemsResults);
      console.log(`🔍 OEMsTrade found ${oemsResults.length} results for "${query}"`);
    }

    return this.deduplicateAndSort(results, query);
  }

  // Поиск в OEMsTrade
  async searchOEMsTrade(query) {
    // Преобразуем русские запросы в английские для OEMsTrade
    const transformedQuery = this.transformQueryForOEMsTrade(query);
    console.log(`🔄 Transformed query "${query}" → "${transformedQuery}"`);

    const oemsResults = await searchOEMsTrade(transformedQuery);
    const results = [];

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
          description: this.truncateText(item.description || '', 200),
          package: item.package || '',
          packaging: item.packaging || '',
          regions: item.regions || [],
          stock_total: item.stock_total || 0,
          price_min_rub: priceRub || 0,
          image: item.image || "/ui/placeholder.svg",
          product_url: item.product_url || '',
          source: 'oemstrade'
        });
      }
    }

    return results;
  }

  // Получение карточки товара
  async fetchProduct(mpn) {
    console.log(`📄 Fetching product for MPN: ${mpn}`);

    // Начинаем с OEMsTrade данных
    const baseProduct = await this.fetchFromOEMsTrade(mpn);

    // Обогащаем данными из RU-источников
    const enrichedProduct = await this.enrichProductFromRU(baseProduct, mpn);

    return enrichedProduct;
  }

  // Обогащение продукта данными из RU-источников
  async enrichProductFromRU(baseProduct, mpn) {
    if (!baseProduct) return null;

    const ruData = {
      images: [],
      docs: [],
      specs: {},
      description: '',
      sources: []
    };

    // Пробуем получить данные из каждого RU-источника
    for (const source of SOURCE_PRIORITY.slice(0, 3)) { // Ограничиваем 3 источниками
      const adapter = adapters[source];
      if (!adapter) continue;

      console.log(`🔍 Trying RU source: ${source} for ${mpn}`);

      const result = await adapter(mpn).catch(err => {
        console.log(`❌ ${source} failed:`, err.message);
        return { ok: false };
      });

      if (result.ok && result.data) {
        const data = result.data;
        ruData.sources.push(source);

        // Собираем изображения
        if (data.images && data.images.length > 0) {
          ruData.images.push(...data.images.slice(0, 3));
        }

        // Собираем документы
        if (data.datasheets && data.datasheets.length > 0) {
          ruData.docs.push(...data.datasheets.slice(0, 2));
        }

        // Собираем спецификации
        if (data.technical_specs && Object.keys(data.technical_specs).length > 0) {
          Object.assign(ruData.specs, data.technical_specs);
        }

        // Берем описание из первого источника
        if (!ruData.description && data.description) {
          ruData.description = data.description;
        }

        console.log(`✅ ${source} provided: ${data.images?.length || 0} images, ${data.datasheets?.length || 0} docs, ${Object.keys(data.technical_specs || {}).length} specs`);
      }

      // Добавляем задержку между запросами
      await new Promise(resolve => setTimeout(resolve, NETWORK_LIMITS.minDelay));
    }

    // Объединяем базовые данные с RU-контентом
    const enrichedProduct = {
      ...baseProduct,
      gallery: ruData.images.slice(0, 5).map(url => ({ image_url: url })),
      docs: ruData.docs.slice(0, 3).map(url => ({ doc_url: url, title: 'Datasheet' })),
      specs: Object.entries(ruData.specs).slice(0, 10).map(([key, value]) => ({ key, value })),
      description_html: ruData.description || baseProduct.description || '',
      sources: [...(baseProduct.sources || ['oemstrade']), ...ruData.sources]
    };

    console.log(`🎯 Product enriched with ${ruData.sources.length} RU sources: ${enrichedProduct.gallery.length} images, ${enrichedProduct.docs.length} docs, ${enrichedProduct.specs.length} specs`);

    return enrichedProduct;
  }

  // Преобразование запроса для OEMsTrade (RU -> EN)
  transformQueryForOEMsTrade(query) {
    // Если запрос содержит только латиницу и цифры, возвращаем как есть
    if (!/[а-яё]/i.test(query)) {
      return query;
    }

    // Нормализуем и получаем синонимы
    const normalized = searchTokenizer.normalize(query);
    const tokens = searchTokenizer.tokenize(normalized);

    // Преобразуем токены в английские эквиваленты
    const transformedTokens = tokens.map(token => {
      // Проверяем словарь синонимов
      const synonyms = searchTokenizer.getSynonyms(token);
      if (synonyms.length > 0) {
        // Берем первый английский синоним
        const englishSynonym = synonyms.find(syn => /^[a-z]+$/i.test(syn));
        if (englishSynonym) {
          return englishSynonym;
        }
      }

      // Если нет синонимов, используем транслитерацию
      return searchTokenizer.transliterate(token);
    });

    return transformedTokens.join(' ');
  }

  // Обогащение карточки из других источников
  async enrichProduct(product, mpn) {
    const enrichPromises = [];

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
  async fetchFromOEMsTrade(mpn) {
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
        : (item.image && item.image !== '/ui/placeholder.svg' ? [{ image_url: item.image }] : []),
      meta: {
        package: item.package || '',
        packaging: item.packaging || ''
      },
      order: {
        regions: item.regions || ['RU'],
        stock: item.stock_total || null,
        min_price_rub: priceRub || null,
        min_currency: item.price_min_currency || null
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
  deduplicateAndSort(results, query) {
    // Группируем по MPN + manufacturer + package
    const grouped = new Map();

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
  isBetterResult(a, b) {
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

  truncateText(text, maxLength) {
    if (!text) return '';
    const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
  }
}

// Экспорт синглтона
export const contentOrchestrator = new ContentOrchestrator();
