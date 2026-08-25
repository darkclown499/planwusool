import { test, expect } from '@playwright/test';
import { TEST_STORE_URL } from './fixtures/auth';
test('debug6', async ({ page }) => {
  page.on('console', msg => { if (msg.type()==='error') console.log('console', msg.text().slice(0,200)); });
  page.on('response', r => { if (r.status()>=400) console.log('resp', r.url(), r.status()); });
  await page.goto(TEST_STORE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);
  // Try reloading after Vite should be ready
  await page.reload({ waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  const hasApp = await page.locator('#app').count();
  console.log('app', hasApp);
  const html = await page.content();
  console.log(html.slice(0, 3000));
});
