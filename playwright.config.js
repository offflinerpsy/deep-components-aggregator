import { defineConfig } from '@playwright/test';

/**
 * Конфигурация для Playwright E2E тестов
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Директория с тестами
  testDir: './tests/e2e',

  // Таймаут для всех тестов
  timeout: 30000,

  // Таймаут для ожиданий
  expect: {
    timeout: 5000
  },

  // Запускать тесты параллельно
  fullyParallel: true,

  // Запрещать тесты с .only в CI
  forbidOnly: !!process.env.CI,

  // Количество повторных попыток при падении теста
  retries: process.env.CI ? 2 : 0,

  // Количество воркеров
  workers: process.env.CI ? 1 : undefined,

  // Репортеры
  reporter: [
    ['html'],
    ['list']
  ],

  // Глобальные настройки для всех тестов
  use: {
    // Базовый URL для тестов
    baseURL: 'http://localhost:9201',

    // Сохранять трейс при падении теста
    trace: 'retain-on-failure',

    // Делать скриншоты только при падении теста
    screenshot: 'only-on-failure',

    // Атрибут для data-testid
    testIdAttribute: 'data-testid'
  },

  // Запуск веб-сервера перед тестами
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:9201/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },

  // Проекты для разных браузеров
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
