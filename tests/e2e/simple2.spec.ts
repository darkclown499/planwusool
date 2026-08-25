import { test, expect } from '@playwright/test';
test('simple2', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/login', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await expect(page.locator('body')).toBeVisible();
});
