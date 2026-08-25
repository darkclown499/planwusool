import { test, expect } from '@playwright/test';
import { TEST_STORE_URL } from './fixtures/auth';
test('debug3', async ({ page }) => {
  await page.goto(TEST_STORE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  const props = await page.evaluate(() => (window as any).page?.props || (window as any).page);
  console.log('props', props ? JSON.stringify(props).slice(0, 5000) : 'undefined');
  const html = await page.content();
  console.log(html.slice(0, 5000));
});
