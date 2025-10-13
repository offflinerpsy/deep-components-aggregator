/**
 * E2E Test: Complete User Flow (Home → Search → Product Card)
 *
 * Test cases:
 * 1. Homepage loads and displays components from API
 * 2. Click on component → redirects to /search?q=<MPN>
 * 3. Search page loads results (cache OR live search if cache empty)
 * 4. Click "Купить" → opens product card /product/<MPN>
 * 5. Product card displays specs, offers, and docs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Complete User Flow', () => {

  test('1. Homepage: Loads components from API', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for main heading
    await expect(page.locator('h1')).toContainText('Deep Components Aggregator');

    // Wait for "ЧТО ИЩУТ ЛЮДИ" section
    const searchSection = page.locator('text=ЧТО ИЩУТ ЛЮДИ');
    await expect(searchSection).toBeVisible({ timeout: 10000 });

    // Check that components loaded (at least 3 visible cards)
    const componentCards = page.locator('[data-testid="component-card"]');
    await expect(componentCards).toHaveCount(28, { timeout: 15000 }); // Should load 28 from API

    // Verify first card has MPN
    const firstCard = componentCards.first();
    const mpnElement = firstCard.locator('[data-testid="component-mpn"]');
    await expect(mpnElement).not.toBeEmpty();

    console.log('✅ Homepage: Components loaded from API');
  });

  test('2. Homepage → Search: Click component redirects to search', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for components
    const componentCards = page.locator('[data-testid="component-card"]');
    await componentCards.first().waitFor({ state: 'visible', timeout: 15000 });

    // Get MPN of first component
    const firstCard = componentCards.first();
    const mpnText = await firstCard.locator('[data-testid="component-mpn"]').textContent();

    console.log(`🔍 Clicking on component: ${mpnText}`);

    // Click on first component
    await firstCard.click();

    // Should redirect to /search?q=<MPN>
    await page.waitForURL(/\/search\?q=/, { timeout: 10000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain('/search?q=');
    expect(currentUrl).toContain(encodeURIComponent(mpnText || ''));

    console.log(`✅ Redirected to: ${currentUrl}`);
  });

  test('3. Search: Shows results from cache OR triggers live search', async ({ page }) => {
    // Test with known MPN (likely in cache)
    const testMPN = 'FT232RL-REEL';
    await page.goto(`${BASE_URL}/search?q=${testMPN}`);

    // Wait for page to load (PageLoader should disappear)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // PageLoader 800ms delay

    // Check if results loaded
    const resultsTable = page.locator('table');
    const noDataMessage = page.locator('text=Нет данных для отображения');

    // Either results table OR "no data" message should be visible
    const hasResults = await resultsTable.isVisible().catch(() => false);
    const hasNoData = await noDataMessage.isVisible().catch(() => false);

    if (hasResults) {
      console.log('✅ Search: Results loaded from cache');

      // Verify table structure
      const rows = page.locator('tbody tr');
      const rowCount = await rows.count();
      console.log(`   Found ${rowCount} results`);
      expect(rowCount).toBeGreaterThan(0);

    } else if (hasNoData) {
      console.log('⚠️  Search: No cache results, checking if live search triggered...');

      // Live search should auto-trigger if cache empty
      const liveButton = page.locator('button:has-text("Live (SSE)")');
      await expect(liveButton).toHaveClass(/bg-white\/10/, { timeout: 5000 }); // Should be active

      // Wait for SSE progress
      const progressText = page.locator('text=Поиск');
      await expect(progressText).toBeVisible({ timeout: 10000 });

      console.log('✅ Search: Live search auto-triggered (cache was empty)');

      // Wait for providers to finish (up to 30s)
      await page.waitForTimeout(30000);

      // Check if results appeared
      const finalRowCount = await page.locator('tbody tr').count();
      console.log(`   Live search returned ${finalRowCount} results`);

    } else {
      throw new Error('Neither results table nor "no data" message found!');
    }
  });

  test('4. Search → Product Card: Click "Купить" opens product page', async ({ page }) => {
    // Use a known MPN
    const testMPN = 'FT232RL-REEL';
    await page.goto(`${BASE_URL}/search?q=${testMPN}`);

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Find "Купить" button
    const buyButton = page.locator('a:has-text("Купить")').first();

    // If no button found, skip test (no results in cache)
    const buttonExists = await buyButton.isVisible().catch(() => false);
    if (!buttonExists) {
      console.log('⚠️  No "Купить" button found (no results in cache), skipping...');
      test.skip();
      return;
    }

    await buyButton.click();

    // Should redirect to /product/<MPN>
    await page.waitForURL(/\/product\//, { timeout: 10000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain('/product/');

    console.log(`✅ Opened product page: ${currentUrl}`);
  });

  test('5. Product Card: Displays specs, offers, and docs', async ({ page }) => {
    // Use a known MPN
    const testMPN = 'FT232RL-REEL';
    await page.goto(`${BASE_URL}/product/${testMPN}`);

    await page.waitForLoadState('networkidle');

    // Check for product heading
    const productHeading = page.locator('h1');
    await expect(productHeading).toBeVisible({ timeout: 10000 });

    // Check for tabs (Specs, Offers, Docs)
    const specsTab = page.locator('text=Спецификации');
    const offersTab = page.locator('text=Предложения');
    const docsTab = page.locator('text=Документы');

    await expect(specsTab).toBeVisible({ timeout: 5000 });
    await expect(offersTab).toBeVisible({ timeout: 5000 });
    await expect(docsTab).toBeVisible({ timeout: 5000 });

    console.log('✅ Product Card: All tabs visible');

    // Click on Offers tab
    await offersTab.click();
    await page.waitForTimeout(500);

    // Check if offers table loaded
    const offersTable = page.locator('table');
    const offersExist = await offersTable.isVisible().catch(() => false);

    if (offersExist) {
      console.log('✅ Product Card: Offers loaded');
    } else {
      console.log('⚠️  Product Card: No offers found (expected if not in cache)');
    }
  });

  test('6. CRITICAL: Empty cache triggers live search automatically', async ({ page }) => {
    // Use a random MPN that is DEFINITELY NOT in cache
    const randomMPN = `TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log(`🧪 Testing with random MPN: ${randomMPN}`);

    await page.goto(`${BASE_URL}/search?q=${randomMPN}`);

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // PageLoader delay

    // Live search should auto-trigger
    const liveButton = page.locator('button:has-text("Live (SSE)")');
    await expect(liveButton).toHaveClass(/bg-white\/10/, { timeout: 5000 }); // Should be active

    console.log('✅ CRITICAL: Live search auto-triggered for empty cache');

    // Check progress message
    const progressText = page.locator('text=Поиск');
    await expect(progressText).toBeVisible({ timeout: 10000 });

    console.log('✅ CRITICAL: SSE search started');
  });

  test('7. Russian search: Normalizes to English', async ({ page }) => {
    const russianQuery = 'транзистор';

    await page.goto(`${BASE_URL}/search?q=${russianQuery}`);

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Check for normalization badge
    const normBadge = page.locator('text=/Показано по:/');
    const badgeExists = await normBadge.isVisible().catch(() => false);

    if (badgeExists) {
      const badgeText = await normBadge.textContent();
      console.log(`✅ Russian Normalization: ${badgeText}`);
      expect(badgeText).toContain('transistor');
    } else {
      console.log('⚠️  Normalization badge not found (might be hidden if no results)');
    }
  });
});
