import { test, expect } from '@playwright/test';
import { TEST_STORE_URL } from './fixtures/auth';
test('debug', async ({ page }) => {
  await page.goto(TEST_STORE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('URL', page.url());
  const html = await page.content();
  console.log(html.slice(0, 3000));
  const bodyVisible = await page.locator('body').isVisible().catch(()=> 'error');
  console.log('body visible', bodyVisible);
  const hasGroup = await page.locator('div.group').count();
  console.log('group count', hasGroup);
  const hasHeader = await page.locator('header').count();
  console.log('header count', hasHeader);
  await page.waitForTimeout(1000);
});
