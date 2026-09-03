import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  expect: {
    timeout: 10_000
  },
  reporter: [
    ['list'],
    ...(process.env.CI ? [['github']] : []),
    ['html', { outputFolder: '../04_tests/reports/playwright-html/report', open: 'never' }]
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    // Keep browser requests in a separate limiter bucket from test-data API setup.
    extraHTTPHeaders: { 'X-Forwarded-For': '127.0.0.11' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
