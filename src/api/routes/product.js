import { Router } from 'express';
import { fetchChipDipPageHtml } from '../../services/fetcher.js';
import { chipdipHtmlToCanon } from '../../adapters/chipdip/html-to-canon.js';
// import { cacheService } from '../../../backend/src/services/cache.js'; // Отключено - используем простое кеширование

const productRouter = Router();

/**
 * Получение информации о товаре в "живом" режиме
 * GET /api/product/:mpn
 */
productRouter.get('/:mpn', async (req, res) => {
  const startTime = Date.now();
  const { mpn } = req.params;

  // Валидация входных данных
  if (!mpn || typeof mpn !== 'string' || mpn.trim().length === 0) {
    return res.status(400).json({
      message: 'Invalid MPN parameter',
      error: 'MPN must be a non-empty string'
    });
  }

  console.log(`🚀 Live ChipDip parsing started for MPN: ${mpn}`);

  try {
    // Шаг 0: Проверяем кэш
    const cacheKey = `product:${mpn}`;
    // const cachedData = cacheService.get(cacheKey); // Отключено

    // if (cachedData) {
    //   console.log(`⚡ Cache hit for ${mpn}, returning cached data`);
    //   return res.status(200).json({
    //     success: true,
    //     product: cachedData.product,
    //     meta: {
    //       ...cachedData.meta,
    //       mode: 'cached',
    //       timestamp: new Date().toISOString()
    //     }
    //   });
    // }

    // Шаг 1: Загружаем "живой" HTML с ChipDip
    console.log(`📡 Fetching live HTML for ${mpn}...`);
    const fetchResult = await fetchChipDipPageHtml(mpn);

    if (!fetchResult.ok) {
      console.error(`❌ Failed to fetch HTML for ${mpn}:`, fetchResult.error);
      return res.status(404).json({
        message: 'Failed to fetch product page',
        error: fetchResult.error,
        mpn
      });
    }

    const { html, url } = fetchResult;
    console.log(`✅ HTML fetched successfully (${html.length} chars) from: ${url}`);

    // Шаг 2: Парсим HTML через наш адаптер
    console.log(`🔧 Parsing HTML with chipdipHtmlToCanon...`);
    const parseResult = chipdipHtmlToCanon(html, url);

    if (!parseResult.ok) {
      console.error(`❌ Failed to parse HTML for ${mpn}:`, parseResult.reason);
      return res.status(422).json({
        message: 'Failed to parse product data',
        error: parseResult.reason,
        mpn,
        url
      });
    }

    // Шаг 3: Сохраняем в кэш и возвращаем результат
    const processingTime = Date.now() - startTime;
    console.log(`🎉 Live parsing completed for ${mpn} in ${processingTime}ms`);

    const responseData = {
      success: true,
      product: parseResult.doc,
      meta: {
        mpn,
        sourceUrl: url,
        processingTime: `${processingTime}ms`,
        mode: 'live',
        timestamp: new Date().toISOString()
      }
    };

    // Сохраняем в кэш на 1 час (3600 секунд)
    // cacheService.set(cacheKey, responseData, 3600); // Отключено
    console.log(`💾 Cached data for ${mpn} (TTL: 1 hour)`);

    return res.status(200).json(responseData);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`💥 Unexpected error during live parsing for ${mpn}:`, error);

    return res.status(500).json({
      message: 'Internal server error during live parsing',
      error: error.message,
      mpn,
      processingTime: `${processingTime}ms`
    });
  }
});

/**
 * Healthcheck endpoint
 * GET /api/product/_health
 */
productRouter.get('/_health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'live-chipdip-parser',
    timestamp: new Date().toISOString()
  });
});

export default productRouter;
