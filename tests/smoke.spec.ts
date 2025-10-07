/**
 * Playwright Smoke Tests for Deep Components Aggregator
 * 
 * Tests:
 * 1. Homepage loads
 * 2. Search functionality works
 * 3. Provider badges visible
 * 4. Product card loads
 * 5. Health endpoint accessible
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9201';

test.describe('Deep Components Aggregator - Smoke Tests', () => {
  
  test('Homepage loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/ДИПОНИКА|Components/i);
    
    // Check for search input
    const searchInput = page.locator('#searchInput');
    await expect(searchInput).toBeVisible();
  });
  
  test('Search page loads and displays results', async ({ page }) => {
    await page.goto(`${BASE_URL}/search.html?q=2N3904`);
    
    // Wait for results to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Check that we have results
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    
    // Check for search meta info
    const searchMeta = page.locator('#searchMeta');
    await expect(searchMeta).toBeVisible();
    await expect(searchMeta).toContainText(/найдено|компонент/i);
  });
  
  test('Provider badges are visible in search results', async ({ page }) => {
    await page.goto(`${BASE_URL}/search.html?q=2N3904&fresh=1`);
    
    // Wait for results
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Check for provider badges
    const badges = page.locator('.provider-badge');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
    
    // Check badge text (should be MO, DK, TME, or FN)
    const firstBadge = badges.first();
    await expect(firstBadge).toBeVisible();
    const text = await firstBadge.textContent();
    expect(['MO', 'DK', 'TME', 'FN']).toContain(text);
  });
  
  test('Currency info displayed in search meta', async ({ page }) => {
    await page.goto(`${BASE_URL}/search.html?q=2N3904&fresh=1`);
    
    await page.waitForSelector('#searchMeta', { timeout: 10000 });
    
    const metaText = await page.locator('#searchMeta').textContent();
    expect(metaText).toMatch(/Курс ЦБ РФ|USD|₽/);
  });
  
  test('Product card loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/product.html?mpn=2N3904`);
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check that page loaded (not 404)
    const title = await page.title();
    expect(title).toBeTruthy();
  });
  
  test('Health endpoint returns JSON', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/health?probe=true`);
    expect(response?.status()).toBe(200);
    
    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('json');
    
    const text = await page.textContent('body');
    if (text) {
      const data = JSON.parse(text);
      expect(data).toHaveProperty('status');
    }
  });
  
  test('Metrics endpoint returns Prometheus format', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/metrics`);
    expect(response?.status()).toBe(200);
    
    const text = await page.textContent('body');
    expect(text).toContain('search_requests_total');
    expect(text).toContain('search_latency_seconds');
  });
  
  test('Search with multiple providers returns diverse results', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/search?q=2N3904&fresh=1`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.rows.length).toBeGreaterThan(10);
    
    // Check that we have multiple providers
    const providers = data.meta?.providers || [];
    const activeProviders = providers.filter((p: any) => p.total > 0);
    expect(activeProviders.length).toBeGreaterThanOrEqual(2);
  });
  
  test('Dark mode toggle works', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const themeToggle = page.locator('#themeToggle');
    await expect(themeToggle).toBeVisible();
    
    // Check initial theme
    const htmlElement = page.locator('html');
    const initialClass = await htmlElement.getAttribute('class');
    
    // Toggle theme
    await themeToggle.click();
    await page.waitForTimeout(500);
    
    // Check that class changed
    const newClass = await htmlElement.getAttribute('class');
    expect(newClass).not.toBe(initialClass);
  });
  
  test('Empty search shows empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/search.html`);
    
    // Should show empty state
    const emptyState = page.locator('#emptyState');
    await expect(emptyState).toBeVisible();
  });
});
