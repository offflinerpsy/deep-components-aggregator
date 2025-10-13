import { defineConfig, devices } from '@playwright/test';

/**
 * E2E Configuration (Frontend Flow Tests)
 * Isolated from Vitest to avoid matchers conflict
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential execution
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
    actionTimeout: 15000,
    navigationTimeout: 30000
  },

  timeout: 120000,

  // Don't start servers (assume they're already running)
  // Backend: http://127.0.0.1:9201 (PM2)
  // Frontend: http://localhost:3000 (Next.js dev)

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
