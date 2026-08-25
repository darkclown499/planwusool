import { test, expect } from '@playwright/test';
import { TEST_STORE_URL } from './fixtures/auth';
test('debug5', async ({ page }) => {
  page.on('console', msg => console.log('console', msg.type(), msg.text().slice(0,200)));
  page.on('pageerror', err => console.log('pageerror', err.message.slice(0,500)));
  page.on('response', r => { if (r.status()>=400) console.log('response', r.url(), r.status()); });
  await page.goto(TEST_STORE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);
  const html = await page.content();
  console.log(html.slice(0, 8000));
});
