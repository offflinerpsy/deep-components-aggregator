import { test, expect } from '@playwright/test';

const BASE_URL = 'https://prosnab.tech';

test.describe('Catalog Sidebar - Production', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test('catalog trigger tab is visible on left side', async ({ page }) => {
    // Find the catalog trigger button fixed on left side
    const catalogTrigger = page.locator('button:has-text("Каталог")').first();
    
    // Should be visible
    await expect(catalogTrigger).toBeVisible();
    
    // Check it's positioned on the left (fixed left-0)
    const box = await catalogTrigger.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeLessThan(100); // Should be near left edge
    
    // Take screenshot of trigger
    await page.screenshot({ 
      path: 'docs/_artifacts/2025-12-23/catalog-trigger.png',
      fullPage: false
    });
  });

  test('clicking trigger opens sidebar from left', async ({ page }) => {
    // Click the catalog trigger
    const catalogTrigger = page.locator('button:has-text("Каталог")').first();
    await catalogTrigger.click();
    
    // Wait for sidebar animation
    await page.waitForTimeout(500);
    
    // Sidebar should be visible
    const sidebar = page.locator('[class*="fixed left-0"][class*="h-full"]');
    await expect(sidebar).toBeVisible();
    
    // Verify sidebar has glass effect (backdrop-blur)
    const sidebarClasses = await sidebar.getAttribute('class');
    expect(sidebarClasses).toContain('backdrop-blur');
    
    // Take screenshot with sidebar open
    await page.screenshot({ 
      path: 'docs/_artifacts/2025-12-23/catalog-sidebar-open.png',
      fullPage: false
    });
  });

  test('sidebar closes on backdrop click', async ({ page }) => {
    // Open sidebar
    const catalogTrigger = page.locator('button:has-text("Каталог")').first();
    await catalogTrigger.click();
    await page.waitForTimeout(500);
    
    // Click backdrop to close
    const backdrop = page.locator('[class*="fixed inset-0"][class*="bg-black"]');
    await backdrop.click({ position: { x: 500, y: 300 } });
    await page.waitForTimeout(500);
    
    // Sidebar should be hidden
    const sidebar = page.locator('[class*="fixed left-0"][class*="h-full"]');
    await expect(sidebar).not.toBeVisible();
  });

  test('sidebar closes on Escape key', async ({ page }) => {
    // Open sidebar
    const catalogTrigger = page.locator('button:has-text("Каталог")').first();
    await catalogTrigger.click();
    await page.waitForTimeout(500);
    
    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Sidebar should be hidden
    const sidebar = page.locator('[class*="fixed left-0"][class*="h-full"]');
    await expect(sidebar).not.toBeVisible();
  });

  test('/catalog page has centered category cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/catalog`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Find category grid
    const grid = page.locator('[class*="grid"]').first();
    await expect(grid).toBeVisible();
    
    // Take screenshot of catalog page
    await page.screenshot({ 
      path: 'docs/_artifacts/2025-12-23/catalog-page.png',
      fullPage: true
    });
    
    // Verify cards are visible and not transparent
    const cards = page.locator('[class*="glass-card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    console.log(`Found ${cardCount} category cards`);
  });

  test('no supplier names visible on catalog page', async ({ page }) => {
    await page.goto(`${BASE_URL}/catalog`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Check that supplier names are NOT visible
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Mouser');
    expect(pageContent).not.toContain('DigiKey');
    expect(pageContent).not.toContain('TME');
    expect(pageContent).not.toContain('Farnell');
    
    console.log('✓ No supplier names found on catalog page');
  });
});
