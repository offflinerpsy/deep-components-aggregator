// tests/api/api-ajv.spec.ts - AJV валидация API ответов
import { test, expect, request } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

// Настройка AJV с draft-07
const ajv = new Ajv({ 
  allErrors: true, 
  strict: false
});
addFormats(ajv);

// Загружаем схему
const schemaPath = path.join(process.cwd(), 'src', 'schemas', 'product-canon.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Отдельные валидаторы для search и product
const searchSchema = {
  type: 'object',
  required: ['ok', 'source', 'count', 'items'],
  properties: {
    ok: { type: 'boolean' },
    source: { type: 'string' },
    count: { type: 'integer', minimum: 0 },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['mpn'],
        properties: {
          mpn: { type: 'string', minLength: 1 },
          title: { type: 'string' },
          manufacturer: { type: 'string' },
          description: { type: 'string' },
          package: { type: 'string' },
          packaging: { type: 'string' },
          regions: { type: 'array', items: { enum: ['EU', 'US', 'ASIA'] } },
          stock_total: { type: 'integer', minimum: 0 },
          lead_days: { type: 'integer', minimum: 0 },
          price_min: { type: 'number', minimum: 0 },
          price_min_currency: { enum: ['USD', 'EUR', ''] },
          price_min_rub: { type: 'number', minimum: 0 },
          image: { type: 'string' }
        }
      }
    },
    rates_cached: { type: 'boolean' },
    duration: { type: 'integer', minimum: 0 }
  }
};

const productSchema = {
  type: 'object',
  required: ['ok', 'product'],
  properties: {
    ok: { type: 'boolean' },
    product: {
      type: 'object',
      required: ['mpn', 'images', 'availability', 'pricing'],
      properties: {
        mpn: { type: 'string', minLength: 1 },
        title: { type: 'string' },
        manufacturer: { type: 'string' },
        description: { type: 'string' },
        package: { type: 'string' },
        packaging: { type: 'string' },
        images: { type: 'array', items: { type: 'string' } },
        datasheets: { type: 'array', items: { type: 'string' } },
        technical_specs: { type: 'object' },
        availability: {
          type: 'object',
          required: ['inStock'],
          properties: {
            inStock: { type: 'integer', minimum: 0 },
            lead: { type: 'integer', minimum: 0 }
          }
        },
        pricing: {
          type: 'array',
          items: {
            type: 'object',
            required: ['qty', 'price', 'currency', 'price_rub'],
            properties: {
              qty: { type: 'integer', minimum: 1 },
              price: { type: 'number', minimum: 0 },
              currency: { enum: ['USD', 'EUR'] },
              price_rub: { type: 'number', minimum: 0 }
            }
          }
        },
        regions: { type: 'array', items: { enum: ['EU', 'US', 'ASIA'] } }
      }
    },
    orchestration: { type: 'object' }
  }
};

const validateSearch = ajv.compile(searchSchema);
const validateProduct = ajv.compile(productSchema);

test.describe('API AJV Validation', () => {
  test('API /search?q=LM317T: валидная схема и price_rub > 0', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL}/api/search?q=LM317T`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Валидация схемы
    const isValid = validateSearch(data);
    if (!isValid) {
      console.error('Search validation errors:', validateSearch.errors);
    }
    expect(isValid).toBeTruthy();
    
    // Проверяем что ответ содержит результаты
    expect(data.count).toBeGreaterThanOrEqual(20);
    expect(Array.isArray(data.items)).toBeTruthy();
    expect(data.items.length).toBeGreaterThanOrEqual(20);
    
    // Проверяем конвертацию валют - price_rub > 0 для USD/EUR
    let convertedCount = 0;
    for (const item of data.items) {
      if (item.price_min > 0 && ['USD', 'EUR'].includes(item.price_min_currency)) {
        expect(item.price_min_rub).toBeGreaterThan(0);
        convertedCount++;
      }
    }
    
    // Должно быть хотя бы несколько элементов с конвертацией
    expect(convertedCount).toBeGreaterThan(0);
  });

  test('API /product?mpn=LM317T: валидная схема и pricing.price_rub > 0', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL}/api/product?mpn=LM317T`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Валидация схемы
    const isValid = validateProduct(data);
    if (!isValid) {
      console.error('Product validation errors:', validateProduct.errors);
    }
    expect(isValid).toBeTruthy();
    
    // Проверяем основные поля
    expect(data.product.mpn).toBe('LM317T');
    expect(Array.isArray(data.product.images)).toBeTruthy();
    expect(Array.isArray(data.product.pricing)).toBeTruthy();
    
    // Проверяем конвертацию в рублях
    if (data.product.pricing.length > 0) {
      const pricing = data.product.pricing[0];
      expect(pricing.price_rub).toBeGreaterThan(0);
      expect(['USD', 'EUR']).toContain(pricing.currency);
    }
    
    // Проверяем availability
    expect(typeof data.product.availability.inStock).toBe('number');
    expect(data.product.availability.inStock).toBeGreaterThanOrEqual(0);
  });

  test('API /product?mpn=1N4148W-TP: валидный продукт и min ₽ > 0', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL}/api/product?mpn=1N4148W-TP`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Валидация схемы
    const isValid = validateProduct(data);
    if (!isValid) {
      console.error('1N4148W-TP validation errors:', validateProduct.errors);
    }
    expect(isValid).toBeTruthy();
    
    // Проверяем что это правильный продукт
    expect(data.product.mpn).toBe('1N4148W-TP');
    
    // Проверяем ценообразование
    if (data.product.pricing.length > 0) {
      const pricing = data.product.pricing[0];
      expect(pricing.price_rub).toBeGreaterThan(0);
    }
  });

  test('API /search: пустой запрос возвращает валидную структуру', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL}/api/search?q=`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Для пустого запроса ожидаем пустой результат
    expect(data.ok).toBe(true);
    expect(data.count).toBe(0);
    expect(Array.isArray(data.items)).toBeTruthy();
    expect(data.items).toHaveLength(0);
  });

  test('API /product: несуществующий MPN возвращает 404', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL}/api/product?mpn=NONEXISTENT_MPN_12345`);
    
    expect(response.status()).toBe(404);
    
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBeTruthy();
  });

  test('API /product: пустой MPN возвращает 400', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL}/api/product?mpn=`);
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe('mpn_required');
  });

  test('API: курсы ЦБ РФ работают корректно', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL}/api/search?q=LM317T`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Проверяем что есть информация о кешировании курсов
    expect(typeof data.rates_cached).toBe('boolean');
    
    // Проверяем разумность курсов USD (должен быть 60-120 рублей)
    const usdItems = data.items.filter((item: any) => 
      item.price_min_currency === 'USD' && item.price_min > 0 && item.price_min_rub > 0
    );
    
    if (usdItems.length > 0) {
      const item = usdItems[0];
      const rate = item.price_min_rub / item.price_min;
      expect(rate).toBeGreaterThan(60);  // Минимальный разумный курс USD
      expect(rate).toBeLessThan(150);    // Максимальный разумный курс USD
    }
  });
});
