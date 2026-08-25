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
    ['html', { outputFolder: '../reports/playwright-html', open: 'never' }]
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
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
