import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:8001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'concurrently "php artisan serve --host=127.0.0.1 --port=8001 --env=testing" "npx vite --host 127.0.0.1 --port 5174"',
    url: 'http://127.0.0.1:8001',
    reuseExistingServer: false,
    timeout: 120000,
  },
  timeout: 60000,
  expect: { timeout: 10000 },
});
