import { test, expect } from '@playwright/test';

test('Нет JS-ошибок/сбоев сети на поиске и карточке', async ({ page }) => {
  const errors: string[] = [];
  const badResponses: string[] = [];

  page.on('console', msg => {
    const t = msg.type();
    const tx = msg.text();
    // игнор «chrome-extension://» шум
    if (t === 'error' && !/chrome-extension:\/\//.test(tx) && !/extensions::/i.test(tx))
      errors.push(tx);
  });
  
  page.on('response', resp => {
    const url = resp.url();
    const st = resp.status();
    if (url.includes('/api/') || url.includes('/product') || url.endsWith('/'))
      if (st >= 400) badResponses.push(`${st} ${url}`);
  });

  await page.goto('/?q=LM317T');
  await page.waitForSelector('table tbody tr');

  await page.goto('/product?mpn=1N4148W-TP');
  await page.waitForSelector('[data-testid="order"]');

  expect(errors, `Console errors:\n${errors.join('\n')}`).toHaveLength(0);
  expect(badResponses, `HTTP errors:\n${badResponses.join('\n')}`).toHaveLength(0);
});
