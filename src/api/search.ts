// search.ts - API endpoint для поиска
import { Request, Response } from 'express';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import searchRowSchema from '../schemas/search-row.schema.json';
import { contentOrchestrator } from '../services/contentOrchestrator';
import { searchTokenizer } from '../services/searchTokenize';

// Инициализация AJV
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validateSearchRow = ajv.compile(searchRowSchema);

export async function handleSearch(req: Request, res: Response): Promise<void> {
  const query = (req.query.q as string || '').trim();
  
  if (!query) {
    res.status(400).json({
      ok: false,
      error: 'Query parameter "q" is required'
    });
    return;
  }
  
  console.log(`[API] Search request: "${query}"`);
  
  try {
    // Получаем результаты из оркестратора
    const rawResults = await contentOrchestrator.searchAll(query);
    
    // Фильтруем и ранжируем через умный поиск
    const rankedResults = searchTokenizer.filterAndRank(rawResults, query);
    
    // Валидируем каждый результат через AJV
    const validResults = [];
    const invalidResults = [];
    
    for (const item of rankedResults) {
      if (validateSearchRow(item)) {
        validResults.push(item);
      } else {
        console.warn('[API] Invalid search row:', {
          mpn: item.mpn,
          errors: validateSearchRow.errors
        });
        invalidResults.push({
          mpn: item.mpn,
          errors: validateSearchRow.errors
        });
      }
    }
    
    // Логируем статистику
    console.log(`[API] Search results: ${validResults.length} valid, ${invalidResults.length} invalid`);
    
    // Возвращаем результаты
    res.json({
      ok: true,
      query,
      total: validResults.length,
      items: validResults,
      debug: process.env.NODE_ENV === 'development' ? {
        invalid: invalidResults,
        tokens: searchTokenizer.tokenize(query),
        isMpn: searchTokenizer.isMpnQuery(query)
      } : undefined
    });
  } catch (error) {
    console.error('[API] Search error:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
}
