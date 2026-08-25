import { test, expect } from '@playwright/test';
import { TEST_STORE_URL } from './fixtures/auth';
test('debug4', async ({ page }) => {
  await page.goto(TEST_STORE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  const hasApp = await page.locator('#app').count();
  console.log('app count', hasApp);
  const appHtml = await page.locator('#app').innerHTML().catch(()=> 'no app');
  console.log('app html', appHtml.slice(0, 3000));
  const dataPage = await page.locator('[data-page]').count();
  console.log('data-page count', dataPage);
  const bodyText = await page.locator('body').textContent();
  console.log('body text', bodyText.slice(0, 2000));
});
