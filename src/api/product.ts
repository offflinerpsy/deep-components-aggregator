// product.ts - API endpoint для карточки товара
import { Request, Response } from 'express';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import productCanonSchema from '../schemas/product-canon.schema.json';
import { contentOrchestrator } from '../services/contentOrchestrator';

// Инициализация AJV
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validateProductCanon = ajv.compile(productCanonSchema);

export async function handleProduct(req: Request, res: Response): Promise<void> {
  const mpn = (req.query.mpn as string || '').trim();
  
  if (!mpn) {
    res.status(400).json({
      ok: false,
      error: 'Query parameter "mpn" is required'
    });
    return;
  }
  
  console.log(`[API] Product request: "${mpn}"`);
  
  try {
    // Получаем карточку из оркестратора
    const product = await contentOrchestrator.fetchProduct(mpn);
    
    if (!product) {
      console.log(`[API] Product not found: "${mpn}"`);
      res.status(404).json({
        ok: false,
        error: 'Product not found',
        mpn
      });
      return;
    }
    
    // Валидируем через AJV
    if (!validateProductCanon(product)) {
      console.error('[API] Invalid product canon:', {
        mpn: product.mpn,
        errors: validateProductCanon.errors
      });
      
      // В production возвращаем частичные данные с предупреждением
      if (process.env.NODE_ENV === 'production') {
        res.json({
          ok: true,
          product,
          warning: 'Product data may be incomplete'
        });
      } else {
        res.status(500).json({
          ok: false,
          error: 'Product validation failed',
          errors: validateProductCanon.errors
        });
      }
      return;
    }
    
    // Логируем статистику
    console.log(`[API] Product found:`, {
      mpn: product.mpn,
      sources: product.sources.map(s => s.source),
      images: product.gallery.length,
      docs: product.docs.length,
      specs: product.specs.length,
      hasPrice: product.order.min_price_rub !== null
    });
    
    // Возвращаем результат
    res.json({
      ok: true,
      product
    });
  } catch (error) {
    console.error('[API] Product error:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
}
