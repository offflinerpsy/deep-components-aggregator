import { test, expect, request } from '@playwright/test';
import { mkAjv, allowedRegions } from './_utils';

test('API /search LM317T: >=20 результатов и валидный канон', async ({ baseURL }) => {
  const ctx = await request.newContext();
  const r = await ctx.get(`${baseURL}/api/search?q=LM317T`);
  expect(r.ok()).toBeTruthy();
  
  const json = await r.json();
  expect(json.ok).toBeTruthy();
  expect(Array.isArray(json.items)).toBeTruthy();
  expect(json.items.length).toBeGreaterThanOrEqual(20);

  const validate = mkAjv();
  let okCount = 0;
  for (const item of json.items) {
    // Проверяем основные поля
    expect(item.mpn).toBeTruthy();
    expect(item.title).toBeTruthy();
    expect(item.manufacturer).toBeDefined();
    
    // цена в ₽ должна быть >0, если есть price_min
    if (item.price_min > 0) {
      expect(Number(item.price_min_rub)).toBeGreaterThan(0);
    }
    
    // регионы только допустимые
    if (Array.isArray(item.regions)) {
      for (const rg of item.regions) {
        expect(allowedRegions.has(rg)).toBeTruthy();
      }
    }
    
    okCount++;
  }
  expect(okCount).toBeGreaterThan(0);
});

test('API /product?mpn=1N4148W-TP: валидный продукт и min ₽ > 0', async ({ baseURL }) => {
  const ctx = await request.newContext();
  const r = await ctx.get(`${baseURL}/api/product?mpn=1N4148W-TP`);
  expect(r.ok()).toBeTruthy();
  
  const json = await r.json();
  expect(json.ok).toBeTruthy();
  expect(json.product).toBeTruthy();
  
  const p = json.product;
  expect(p.mpn).toBeTruthy();
  expect(p.title).toBeTruthy();
  expect(Array.isArray(p.images)).toBeTruthy();
  expect(Array.isArray(p.pricing)).toBeTruthy();
  
  if (p.pricing && p.pricing.length > 0) {
    expect(Number(p.pricing[0].price_rub)).toBeGreaterThan(0);
  }
});
