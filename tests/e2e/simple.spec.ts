import { test, expect } from '@playwright/test';
test('simple', async ({ page }) => {
  await page.goto('http://e2e-test-store.localhost:8000/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await expect(page.locator('body')).toBeVisible();
});
