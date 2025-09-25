// tests/e2e/orchestrator.spec.ts - Тесты оркестратора RU-контента
import { test, expect, request } from '@playwright/test';
import { mkAjv, allowedRegions } from './_utils';

test.describe('Оркестратор RU-контента', () => {
  test('API /search с оркестрацией: >=20 результатов LM317T', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const r = await ctx.get(`${baseURL}/api/search?q=LM317T`);
    
    expect(r.ok()).toBeTruthy();
    const response = await r.json();
    
    expect(response.ok).toBe(true);
    expect(response.source).toBe('oemstrade'); // Пока только OEMsTrade в поиске
    expect(response.count).toBeGreaterThanOrEqual(20);
    expect(Array.isArray(response.items)).toBeTruthy();
    expect(response.items.length).toBeGreaterThanOrEqual(20);
    
    // Проверяем структуру элементов
    const firstItem = response.items[0];
    expect(firstItem.mpn).toBeTruthy();
    expect(firstItem.price_min_rub).toBeGreaterThan(0); // Конвертация в рубли работает
    expect(Array.isArray(firstItem.regions)).toBeTruthy();
    
    // Проверяем валидность регионов
    firstItem.regions.forEach((region: string) => {
      expect(['EU', 'US', 'ASIA']).toContain(region);
    });
  });

  test('API /product с RU-оркестрацией: LM317T полная карточка', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const r = await ctx.get(`${baseURL}/api/product?mpn=LM317T`);
    
    expect(r.ok()).toBeTruthy();
    const response = await r.json();
    
    expect(response.ok).toBe(true);
    expect(response.product).toBeTruthy();
    
    const product = response.product;
    
    // Базовые поля
    expect(product.mpn).toBe('LM317T');
    expect(product.title).toBeTruthy();
    
    // Структура данных
    expect(Array.isArray(product.images)).toBeTruthy();
    expect(Array.isArray(product.datasheets)).toBeTruthy();
    expect(typeof product.technical_specs).toBe('object');
    expect(Array.isArray(product.pricing)).toBeTruthy();
    expect(Array.isArray(product.regions)).toBeTruthy();
    expect(Array.isArray(product.sources)).toBeTruthy();
    
    // Коммерческие данные
    expect(product.availability).toBeTruthy();
    expect(typeof product.availability.inStock).toBe('number');
    
    if (product.pricing.length > 0) {
      const pricing = product.pricing[0];
      expect(pricing.price_rub).toBeGreaterThan(0); // Конвертация в рубли
      expect(['USD', 'EUR']).toContain(pricing.currency);
    }
    
    // Метаданные оркестрации
    expect(product.orchestration).toBeTruthy();
    expect(product.orchestration.duration).toBeGreaterThan(0);
    expect(product.orchestration.ru_content).toBeTruthy();
    expect(product.orchestration.commerce).toBeTruthy();
    expect(product.orchestration.pricing).toBeTruthy();
  });

  test('API /product: источники RU-контента приоритизированы', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const r = await ctx.get(`${baseURL}/api/product?mpn=1N4148W-TP`);
    
    expect(r.ok()).toBeTruthy();
    const response = await r.json();
    const product = response.product;
    
    // Проверяем что есть информация об источниках
    expect(Array.isArray(product.sources)).toBeTruthy();
    
    if (product.sources.length > 0) {
      // Источники должны быть отсортированы по приоритету
      const priorities = product.sources.map((s: any) => s.priority);
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
      }
      
      // Проверяем структуру источника
      const source = product.sources[0];
      expect(source.source).toBeTruthy();
      expect(typeof source.priority).toBe('number');
      expect(typeof source.hasTitle).toBe('boolean');
      expect(typeof source.hasDescription).toBe('boolean');
      expect(typeof source.hasImages).toBe('boolean');
      expect(typeof source.hasDatasheets).toBe('boolean');
      expect(typeof source.hasSpecs).toBe('boolean');
    }
  });

  test('API валидация: некорректный MPN возвращает 404', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const r = await ctx.get(`${baseURL}/api/product?mpn=NONEXISTENT_MPN_12345`);
    
    expect(r.status()).toBe(404);
    const response = await r.json();
    expect(response.ok).toBe(false);
    expect(response.error).toBe('product_not_found');
  });

  test('API валидация: пустой MPN возвращает 400', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const r = await ctx.get(`${baseURL}/api/product?mpn=`);
    
    expect(r.status()).toBe(400);
    const response = await r.json();
    expect(response.ok).toBe(false);
    expect(response.error).toBe('mpn_required');
  });

  test('Курсы ЦБ РФ: конвертация валют работает', async ({ baseURL }) => {
    const ctx = await request.newContext();
    const r = await ctx.get(`${baseURL}/api/search?q=LM317T`);
    
    expect(r.ok()).toBeTruthy();
    const response = await r.json();
    
    // Проверяем что есть информация о курсах
    expect(typeof response.rates_cached).toBe('boolean');
    
    // Проверяем что цены в рублях заполнены
    const itemsWithPrices = response.items.filter((item: any) => item.price_min_rub > 0);
    expect(itemsWithPrices.length).toBeGreaterThan(0);
    
    // Проверяем разумность курсов (USD должен быть 60-120 рублей)
    const usdItems = response.items.filter((item: any) => 
      item.price_min_currency === 'USD' && item.price_min > 0 && item.price_min_rub > 0
    );
    
    if (usdItems.length > 0) {
      const item = usdItems[0];
      const rate = item.price_min_rub / item.price_min;
      expect(rate).toBeGreaterThan(60); // Минимальный разумный курс USD
      expect(rate).toBeLessThan(150);   // Максимальный разумный курс USD
    }
  });
});
