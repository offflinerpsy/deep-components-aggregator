/**
 * E2E test for R4 Online Autocomplete
 * Tests typing "LM3" and verifying dropdown suggestions appear
 */

import { test, expect } from '@playwright/test';

test.describe('R4 Online Autocomplete', () => {
  
  test('should show autocomplete dropdown when typing LM3', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3001/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find search input (AutocompleteSearch component)
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();
    
    // Type "LM3" (should trigger autocomplete after 300ms debounce)
    await searchInput.fill('LM3');
    
    // Wait for debounce (300ms) + API call (1500-2500ms) + render
    await page.waitForTimeout(3000);
    
    // Check if dropdown appeared
    const dropdown = page.locator('[role="listbox"], .autocomplete-dropdown, ul').filter({ hasText: /LM3/i }).first();
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    
    // Verify at least one suggestion contains "LM3"
    const suggestions = page.locator('li, [role="option"]').filter({ hasText: /LM3/i });
    await expect(suggestions.first()).toBeVisible();
    
    // Click first suggestion
    await suggestions.first().click();
    
    // Verify navigation to results page
    await expect(page).toHaveURL(/\/results\?q=/);
  });
  
  test('should support keyboard navigation (↓ Enter)', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('LM317');
    
    // Wait for autocomplete to appear
    await page.waitForTimeout(3000);
    
    // Press ArrowDown to select first suggestion
    await searchInput.press('ArrowDown');
    
    // Verify first suggestion is highlighted (check for active/selected class)
    const firstSuggestion = page.locator('[role="option"], li').first();
    await expect(firstSuggestion).toHaveClass(/selected|active|highlighted/);
    
    // Press Enter to submit
    await searchInput.press('Enter');
    
    // Verify navigation
    await expect(page).toHaveURL(/\/results\?q=/);
  });
  
  test('should NOT show dropdown for queries < 2 chars', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="text"]').first();
    
    // Type single character
    await searchInput.fill('L');
    await page.waitForTimeout(1000);
    
    // Dropdown should NOT appear
    const dropdown = page.locator('[role="listbox"], .autocomplete-dropdown, ul');
    await expect(dropdown).toBeHidden();
  });
  
  test('should close dropdown on Escape key', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('LM317');
    
    // Wait for dropdown to appear
    await page.waitForTimeout(3000);
    const dropdown = page.locator('[role="listbox"], .autocomplete-dropdown, ul').first();
    await expect(dropdown).toBeVisible();
    
    // Press Escape
    await searchInput.press('Escape');
    
    // Dropdown should be hidden
    await expect(dropdown).toBeHidden({ timeout: 1000 });
  });
  
  test('should work on /results page', async ({ page }) => {
    // Navigate to results page directly
    await page.goto('http://localhost:3001/results?q=transistor');
    await page.waitForLoadState('networkidle');
    
    // Find search input on results page
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();
    
    // Clear and type new query
    await searchInput.clear();
    await searchInput.fill('BC547');
    
    // Wait for autocomplete
    await page.waitForTimeout(3000);
    
    // Verify dropdown appears
    const suggestions = page.locator('li, [role="option"]').filter({ hasText: /BC547/i });
    await expect(suggestions.first()).toBeVisible({ timeout: 5000 });
  });
  
  test('should highlight matching prefix in suggestions', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('LM317');
    
    // Wait for autocomplete
    await page.waitForTimeout(3000);
    
    // Check if <mark> element exists (highlighting)
    const highlighted = page.locator('mark').filter({ hasText: /LM317/i }).first();
    await expect(highlighted).toBeVisible({ timeout: 5000 });
  });
  
  test('should cancel previous request when typing fast', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="text"]').first();
    
    // Type rapidly without waiting (simulating fast typing)
    await searchInput.type('LM3', { delay: 50 }); // 50ms between chars
    await page.waitForTimeout(100);
    await searchInput.type('17', { delay: 50 });
    
    // Only the final query ("LM317") should trigger API call
    await page.waitForTimeout(3000);
    
    // Verify suggestions match "LM317", not "LM3"
    const suggestions = page.locator('li, [role="option"]').filter({ hasText: /LM317/i });
    await expect(suggestions.first()).toBeVisible({ timeout: 5000 });
  });
});
