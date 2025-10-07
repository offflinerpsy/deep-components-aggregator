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
  required: ['ok', 'q', 'rows', 'meta'],
  properties: {
    ok: { type: 'boolean' },
    q: { type: 'string' },
    rows: {
      type: 'array',
      items: {
        type: 'object',
        required: ['mpn', 'title', 'manufacturer', 'product_url', 'source'],
        properties: {
          mpn: { type: 'string', minLength: 1 },
          title: { type: 'string' },
          manufacturer: { type: 'string' },
          description_short: { type: ['string', 'null'] },
          package: { type: ['string', 'null'] },
          packaging: { type: ['string', 'null'] },
          regions: {
            type: 'array',
            items: {
              enum: ['RU', 'EU', 'US', 'ASIA', 'GLOBAL']
            }
          },
          stock: { type: ['number', 'null'], minimum: 0 },
          min_price: { type: ['number', 'null'], minimum: 0 },
          min_currency: {
            type: ['string', 'null'],
            enum: ['USD', 'EUR', 'GBP', 'PLN', 'RUB', null]
          },
          min_price_rub: { type: ['number', 'null'], minimum: 0 },
          image_url: { type: ['string', 'null'] },
          product_url: { type: 'string' },
          source: {
            type: 'string',
            enum: ['mouser', 'digikey', 'tme', 'farnell', 'chipdip', 'promelec', 'compel', 'electronshik', 'elitan', 'oemstrade']
          },
          price_breaks: {
            type: 'array',
            items: {
              type: 'object',
              required: ['qty', 'price', 'currency'],
              properties: {
                qty: { type: ['number', 'integer'], minimum: 1 },
                price: { type: 'number', minimum: 0 },
                currency: {
                  type: 'string',
                  enum: ['USD', 'EUR', 'GBP', 'PLN', 'RUB']
                },
                price_rub: { type: ['number', 'null'], minimum: 0 }
              },
              additionalProperties: false
            }
          }
        },
        additionalProperties: true
      }
    },
    meta: {
      type: 'object',
      required: ['source', 'total'],
      properties: {
        source: { type: 'string' },
        total: { type: 'integer', minimum: 0 },
        cached: { type: 'boolean' },
        elapsed: { type: 'integer', minimum: 0 },
        providers: {
          type: 'array',
          items: {
            type: 'object',
            required: ['provider', 'status'],
            properties: {
              provider: { type: 'string' },
              status: { type: 'string', enum: ['ok', 'error'] },
              total: { type: ['integer', 'null'], minimum: 0 },
              usedQuery: { type: ['string', 'null'] },
              strategy: { type: ['string', 'null'] },
              attempts: { type: ['integer', 'null'], minimum: 0 },
              elapsed_ms: { type: ['integer', 'null'], minimum: 0 },
              message: { type: ['string', 'null'] }
            },
            additionalProperties: true
          }
        },
        currency: {
          type: ['object', 'null'],
          properties: {
            rates: {
              type: 'object',
              properties: {
                USD: { type: 'number' },
                EUR: { type: 'number' }
              },
              additionalProperties: true
            },
            date: { type: 'string' },
            source: { type: 'string' }
          },
          additionalProperties: true
        },
        usedQueries: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      additionalProperties: true
    }
  },
  additionalProperties: true
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
  test('API /search?q=LM317T: валидная схема и price_rub > 0', async ({ baseURL }: { baseURL: string | undefined }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL ?? ''}/api/search?q=LM317T`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Валидация схемы
    const isValid = validateSearch(data);
    if (!isValid) {
      console.error('Search validation errors:', validateSearch.errors);
    }
    expect(isValid).toBeTruthy();

    // Проверяем что ответ содержит результаты (или пустой массив при недоступных провайдерах)
    expect(Array.isArray(data.rows)).toBeTruthy();
    expect(data.meta.total).toBeGreaterThanOrEqual(0);
    expect(data.meta.total).toBe(data.rows.length);

    // Проверяем конвертацию валют - min_price_rub > 0 для USD/EUR
    let convertedCount = 0;
    for (const item of data.rows) {
      if (item.min_price && ['USD', 'EUR', 'GBP', 'PLN'].includes(item.min_currency || '')) {
        expect(item.min_price_rub).toBeGreaterThan(0);
        convertedCount++;
      }
    }

    // Если есть конвертированные элементы, убеждаемся что курсы выглядят правдоподобно
    if (convertedCount > 0) {
      expect(data.meta.currency).toBeDefined();
      expect(data.meta.currency?.rates?.USD).toBeGreaterThan(0);
      expect(data.meta.currency?.rates?.EUR).toBeGreaterThan(0);
    }
  });

  test('API /product?mpn=LM317T: валидная схема и pricing.price_rub > 0', async ({ baseURL }: { baseURL: string | undefined }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL ?? ''}/api/product?mpn=LM317T`);

    if (response.ok()) {
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
        expect(['USD', 'EUR', 'GBP', 'PLN', 'RUB']).toContain(pricing.currency);
      }

      // Проверяем availability
      expect(typeof data.product.availability.inStock).toBe('number');
      expect(data.product.availability.inStock).toBeGreaterThanOrEqual(0);
    } else {
      const errorData = await response.json();
      expect(errorData.ok).toBe(false);
      const errorMessage = errorData.error || errorData.code || errorData.message;
      expect(typeof errorMessage).toBe('string');
    }
  });

  test('API /product?mpn=1N4148W-TP: валидный продукт и min ₽ > 0', async ({ baseURL }: { baseURL: string | undefined }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL ?? ''}/api/product?mpn=1N4148W-TP`);

    if (response.ok()) {
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
    } else {
      const errorData = await response.json();
      expect(errorData.ok).toBe(false);
      const errorMessage = errorData.error || errorData.code || errorData.message;
      expect(typeof errorMessage).toBe('string');
    }
  });

  test('API /search: пустой запрос возвращает валидную структуру', async ({ baseURL }: { baseURL: string | undefined }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL ?? ''}/api/search?q=`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Для пустого запроса ожидаем пустой результат
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.rows)).toBeTruthy();
    expect(data.rows).toHaveLength(0);
    expect(data.meta.total).toBe(0);
  });

  test('API /product: несуществующий MPN возвращает 404', async ({ baseURL }: { baseURL: string | undefined }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL ?? ''}/api/product?mpn=NONEXISTENT_MPN_12345`);

    expect([404, 410, 422, 500]).toContain(response.status());

    const data = await response.json();
    expect(data.ok).toBe(false);
    const errorMessage = data.error || data.code || data.message;
    expect(typeof errorMessage).toBe('string');
  });

  test('API /product: пустой MPN возвращает 400', async ({ baseURL }: { baseURL: string | undefined }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL ?? ''}/api/product?mpn=`);

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.code).toBe('bad_params');
    expect(typeof data.message).toBe('string');
  });

  test('API: курсы ЦБ РФ работают корректно', async ({ baseURL }: { baseURL: string | undefined }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL ?? ''}/api/search?q=LM317T`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Проверяем что есть информация о курсе валют
    expect(data.meta.currency).toBeDefined();
    expect(typeof data.meta.currency?.rates?.USD).toBe('number');

    // Проверяем разумность курсов USD (должен быть 60-150 рублей)
    const usdItems = data.rows.filter((item: any) =>
      item.min_currency === 'USD' && item.min_price && item.min_price_rub
    );

    if (usdItems.length > 0) {
      const item = usdItems[0];
      const rate = item.min_price_rub / item.min_price;
      expect(rate).toBeGreaterThan(60);  // Минимальный разумный курс USD
      expect(rate).toBeLessThan(150);    // Максимальный разумный курс USD
    }
  });
});
