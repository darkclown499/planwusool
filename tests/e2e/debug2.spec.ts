import { test, expect } from '@playwright/test';
import { TEST_STORE_URL } from './fixtures/auth';
test('debug2', async ({ page }) => {
  await page.goto(TEST_STORE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  const html = await page.content();
  console.log(html.slice(0, 8000));
  const bodyText = await page.locator('body').textContent();
  console.log('body text', bodyText.slice(0, 2000));
  const hasGroup = await page.locator('div.group').count();
  console.log('group count', hasGroup);
  const hasHeader = await page.locator('header').count();
  console.log('header count', hasHeader);
  const hasProducts = await page.locator('text=Test Product').count();
  console.log('has Test Product', hasProducts);
});
