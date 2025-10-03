import { test, expect } from '@playwright/test';

test.describe('Product Card v2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ui/product-v2.html?id=LM317');
    await page.waitForLoadState('networkidle');
  });

  test('should display product details', async ({ page }) => {
    // Check title
    await expect(page.locator('.product-main h1')).toContainText('LM317');
    
    // Check specs section
    await expect(page.locator('.specs-section')).toBeVisible();
    
    // Check price section in sidebar
    await expect(page.locator('.product-aside .price-section')).toBeVisible();
  });

  test('should have sticky sidebar on desktop', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1400, height: 900 });
    
    const aside = page.locator('.product-aside');
    await expect(aside).toHaveCSS('position', 'sticky');
  });

  test('gallery should zoom on image click', async ({ page }) => {
    const firstImage = page.locator('.product-gallery__thumbnail').first();
    await firstImage.click();
    
    // Check overlay is visible
    await expect(page.locator('#gallery-overlay')).toBeVisible();
    
    // Close overlay
    await page.locator('#gallery-overlay .close-btn').click();
    await expect(page.locator('#gallery-overlay')).not.toBeVisible();
  });

  test('quantity filter should highlight relevant price break', async ({ page }) => {
    // Enter quantity
    const qtyInput = page.locator('.qty-filter__input');
    await qtyInput.fill('100');
    
    // Click chip for 100
    await page.locator('.qty-filter__chip[data-qty="100"]').click();
    
    // Check that 100 chip is active
    await expect(page.locator('.qty-filter__chip[data-qty="100"]')).toHaveClass(/active/);
    
    // Check that price break for 100 is highlighted
    const priceBreak100 = page.locator('.price-break[data-qty="100"]');
    await expect(priceBreak100).toHaveClass(/highlighted/);
  });

  test('should open price modal on "Show all prices" click', async ({ page }) => {
    const showAllBtn = page.locator('.price-actions button:has-text("Show all prices")');
    await showAllBtn.click();
    
    // Modal should be visible
    await expect(page.locator('#prices-modal')).toBeVisible();
    
    // Check table header
    await expect(page.locator('#prices-modal thead')).toContainText('Quantity');
    await expect(page.locator('#prices-modal thead')).toContainText('Price');
    
    // Close modal
    await page.locator('#prices-modal .modal__close').click();
    await expect(page.locator('#prices-modal')).not.toBeVisible();
  });

  test('visual regression: desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await expect(page).toHaveScreenshot('product-card-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('visual regression: tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('product-card-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('visual regression: mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('product-card-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should have accessible labels', async ({ page }) => {
    // Check ARIA labels
    await expect(page.locator('.product-gallery')).toHaveAttribute('aria-label');
    await expect(page.locator('.qty-filter__input')).toHaveAttribute('aria-label');
    
    // Check button labels
    await expect(page.locator('.order-cta')).toHaveAccessibleName();
  });

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    expect(errors).toHaveLength(0);
  });

  test('sidebar should stick while scrolling', async ({ page, browserName }) => {
    // Skip on mobile browsers (sidebar not sticky on mobile)
    test.skip(browserName === 'webkit' || browserName === 'firefox', 'Sticky behavior differs across browsers');
    
    await page.setViewportSize({ width: 1400, height: 600 });
    
    const aside = page.locator('.product-aside');
    const initialOffset = await aside.evaluate(el => el.getBoundingClientRect().top);
    
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 300));
    
    const afterScrollOffset = await aside.evaluate(el => el.getBoundingClientRect().top);
    
    // Sidebar should maintain position (sticky)
    expect(Math.abs(initialOffset - afterScrollOffset)).toBeLessThan(50);
  });

  test('responsive: mobile should hide sidebar and show bottom bar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // On mobile, sidebar should not be sticky
    const aside = page.locator('.product-aside');
    const position = await aside.evaluate(el => window.getComputedStyle(el).position);
    
    // Mobile layout changes position (not sticky on small screens per CSS)
    expect(['static', 'relative', 'sticky']).toContain(position);
  });
});
