import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: { 
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:9201', 
    trace: 'on-first-retry' 
  }
});
