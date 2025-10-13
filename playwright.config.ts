import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e', // Changed from 'tests' to 'e2e'
  timeout: 120000,
  forbidOnly: true,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000', // Frontend URL (Next.js)
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    testIdAttribute: 'data-testid'
  },
  webServer: [
    {
      command: 'pm2 start ecosystem.config.cjs --no-daemon',
      url: 'http://127.0.0.1:9201',
      reuseExistingServer: true,
      timeout: 30000
    },
    {
      command: 'cd v0-components-aggregator-page && PORT=3000 npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 60000
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
