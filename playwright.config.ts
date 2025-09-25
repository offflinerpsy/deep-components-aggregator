// playwright.config.ts — включить trace/video на падениях
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: [['list']],
  use: { 
    baseURL: 'http://127.0.0.1:9201', 
    trace: 'retain-on-failure', 
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    testIdAttribute: 'data-testid'
  },
  timeout: 30_000,
  retries: 1,
  projects: [
    {
      name: 'chromium',
      use: { 
        viewport: { width: 1200, height: 800 }
      }
    }
  ]
});