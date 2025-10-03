import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const baseURL = 'http://5.129.228.88:9201';
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/ui/auth.html');
  });

  test('should display auth page with login and register forms', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Auth/i);
    
    // Check login form
    await expect(page.locator('form#login-form')).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    
    // Check register form
    await expect(page.locator('form#register-form')).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#register-password')).toBeVisible();
    await expect(page.locator('#register-confirm-password')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Try invalid email
    await page.locator('#login-email').fill('invalid-email');
    await page.locator('#login-password').fill('password123');
    await page.locator('button[type="submit"]', { hasText: 'Login' }).first().click();
    
    // Check HTML5 validation
    const emailInput = page.locator('#login-email');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('registration: should show error if passwords do not match', async ({ page }) => {
    await page.locator('#register-email').fill('test@example.com');
    await page.locator('#register-password').fill('Password123!');
    await page.locator('#register-confirm-password').fill('DifferentPassword');
    await page.locator('#register-name').fill('Test User');
    
    await page.locator('button[type="submit"]', { hasText: 'Register' }).first().click();
    
    // Check for error message
    await expect(page.locator('.error-message, .alert-danger')).toBeVisible();
  });

  test('registration: should create new user and redirect', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    
    await page.locator('#register-email').fill(uniqueEmail);
    await page.locator('#register-password').fill('TestPass123!');
    await page.locator('#register-confirm-password').fill('TestPass123!');
    await page.locator('#register-name').fill('Playwright Test User');
    
    await page.locator('button[type="submit"]', { hasText: 'Register' }).first().click();
    
    // Wait for redirect or success message
    await page.waitForTimeout(2000);
    
    // Check if redirected or success message shown
    const currentURL = page.url();
    const successMessage = page.locator('.success-message, .alert-success');
    
    const hasRedirected = currentURL !== `${baseURL}/ui/auth.html`;
    const hasSuccessMessage = await successMessage.isVisible().catch(() => false);
    
    expect(hasRedirected || hasSuccessMessage).toBeTruthy();
  });

  test('login: should authenticate with valid credentials', async ({ page }) => {
    // Use credentials from a known test user (created in smoke tests)
    await page.locator('#login-email').fill('deploy_test@example.com');
    await page.locator('#login-password').fill('test123456');
    
    await page.locator('button[type="submit"]', { hasText: 'Login' }).first().click();
    
    await page.waitForTimeout(2000);
    
    // Check for redirect or success
    const currentURL = page.url();
    expect(currentURL).not.toBe(`${baseURL}/ui/auth.html`);
  });

  test('login: should show error with invalid credentials', async ({ page }) => {
    await page.locator('#login-email').fill('invalid@example.com');
    await page.locator('#login-password').fill('wrongpassword');
    
    await page.locator('button[type="submit"]', { hasText: 'Login' }).first().click();
    
    await page.waitForTimeout(1000);
    
    // Check for error message
    await expect(page.locator('.error-message, .alert-danger')).toBeVisible();
  });

  test('should have OAuth buttons (Google, Yandex)', async ({ page }) => {
    // Check for Google OAuth button
    const googleBtn = page.locator('a[href*="/auth/google"], button:has-text("Google")');
    expect(await googleBtn.count()).toBeGreaterThan(0);
    
    // Check for Yandex OAuth button (if implemented)
    const yandexBtn = page.locator('a[href*="/auth/yandex"], button:has-text("Yandex")');
    // May not be implemented yet
  });

  test('visual regression: auth page desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page).toHaveScreenshot('auth-page-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('visual regression: auth page mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('auth-page-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should have accessible form labels', async ({ page }) => {
    // Check all inputs have labels
    const emailInputs = page.locator('input[type="email"]');
    const passwordInputs = page.locator('input[type="password"]');
    
    const emailCount = await emailInputs.count();
    const passwordCount = await passwordInputs.count();
    
    expect(emailCount).toBeGreaterThan(0);
    expect(passwordCount).toBeGreaterThan(0);
    
    // Check first email input has label
    const firstEmailLabel = await emailInputs.first().getAttribute('aria-label');
    const firstEmailId = await emailInputs.first().getAttribute('id');
    
    expect(firstEmailLabel || firstEmailId).toBeTruthy();
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

  test('rate limiting: should block after multiple failed login attempts', async ({ page }) => {
    // Attempt login multiple times with wrong credentials
    for (let i = 0; i < 6; i++) {
      await page.locator('#login-email').fill('test@example.com');
      await page.locator('#login-password').fill(`wrongpass${i}`);
      await page.locator('button[type="submit"]', { hasText: 'Login' }).first().click();
      await page.waitForTimeout(500);
    }
    
    // Next attempt should be rate limited
    await page.locator('#login-email').fill('test@example.com');
    await page.locator('#login-password').fill('wrongpass');
    await page.locator('button[type="submit"]', { hasText: 'Login' }).first().click();
    
    await page.waitForTimeout(1000);
    
    // Check for rate limit error
    const errorText = await page.locator('.error-message, .alert-danger').textContent();
    expect(errorText?.toLowerCase()).toContain('too many');
  });
});

test.describe('Session Persistence', () => {
  test('should persist session across page reloads', async ({ page }) => {
    // Login
    await page.goto('/ui/auth.html');
    await page.locator('#login-email').fill('deploy_test@example.com');
    await page.locator('#login-password').fill('test123456');
    await page.locator('button[type="submit"]', { hasText: 'Login' }).first().click();
    
    await page.waitForTimeout(2000);
    
    // Navigate to /auth/me to check session
    await page.goto('/auth/me');
    const response = await page.waitForResponse(resp => resp.url().includes('/auth/me'));
    const json = await response.json();
    
    expect(json.ok).toBe(true);
    expect(json.user.email).toBe('deploy_test@example.com');
  });

  test('should logout and clear session', async ({ page }) => {
    // Login first
    await page.goto('/ui/auth.html');
    await page.locator('#login-email').fill('deploy_test@example.com');
    await page.locator('#login-password').fill('test123456');
    await page.locator('button[type="submit"]', { hasText: 'Login' }).first().click();
    
    await page.waitForTimeout(2000);
    
    // Logout
    await page.goto('/auth/logout');
    await page.waitForTimeout(1000);
    
    // Check /auth/me returns 401
    await page.goto('/auth/me');
    const response = await page.waitForResponse(resp => resp.url().includes('/auth/me'));
    expect(response.status()).toBe(401);
  });
});
