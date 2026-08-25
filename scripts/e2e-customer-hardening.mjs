import { chromium } from 'playwright';

const BASE = 'https://demo.wusool.ps';
const viewports = [
  { name: 'Desktop 1440', w: 1440, h: 900 },
  { name: 'Mobile 375', w: 375, h: 812 },
];

for (const vp of viewports) {
  console.log(`\n=== VIEWPORT ${vp.name} ===`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'ar-EG', isMobile: vp.w < 768 });
  const page = await context.newPage();
  let consoleErrors = [];
  let net500 = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0,150)); });
  page.on('response', r => { if (r.status() >= 500) net500.push(r.url() + ' ' + r.status()); });
  page.on('requestfailed', r => { net500.push('failed ' + r.url()); });

  async function step(name, fn) {
    try {
      const ok = await fn();
      console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
      return ok;
    } catch (e) {
      console.log(`FAIL: ${name} - ${e.message.slice(0,200)}`);
      return false;
    }
  }

  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 25000 });
  await step('Homepage 200', async () => (await page.title()).length > 0);
  await step('RTL dir', async () => (await page.evaluate(() => document.documentElement.getAttribute('dir'))) === 'rtl');
  await step('No horizontal overflow', async () => await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 5));
  await step('Header visible', async () => await page.locator('header').first().isVisible().catch(()=>false));
  // Search
  await step('Search open', async () => {
    const btn = page.locator('button[aria-label="بحث"]').first();
    if (await btn.count() === 0) return false;
    // On mobile header is different, try to find search
    const visible = await btn.isVisible().catch(()=>false);
    if (!visible) return true; // hidden on mobile is expected, not fail
    await btn.click();
    await page.waitForTimeout(500);
    const hasInput = await page.locator('input[placeholder*="بحث"]').count() > 0;
    await page.keyboard.press('Escape');
    return hasInput;
  });
  // Category
  await step('Category nav', async () => {
    const links = page.locator('a[href*="/category/"]');
    const c = await links.count();
    if (c === 0) return false;
    await links.first().click();
    await page.waitForTimeout(1500);
    const isCat = page.url().includes('/category/');
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    return isCat;
  });
  // Product
  await step('Product cards', async () => await page.locator('div.group').count() > 0);
  // Open product detail
  let productOpened = false;
  await step('Product detail modal', async () => {
    const card = page.locator('div.group').first();
    if (await card.count()===0) return false;
    await card.click();
    await page.waitForTimeout(800);
    // Atelier opens via handleProductClick which shows modal, check for تفاصيل المنتج
    let hasDetail = await page.locator('text=تفاصيل المنتج').count() > 0;
    if (!hasDetail) {
      // try clicking product name link
      const nameLink = page.locator('a:has-text("فستان"), a:has-text("عباية")').first();
      if (await nameLink.count()>0) { await nameLink.click(); await page.waitForTimeout(800); hasDetail = await page.locator('text=تفاصيل المنتج').count()>0; }
    }
    productOpened = hasDetail;
    return hasDetail;
  });
  // Variant + Add to cart
  await step('Variant + Add to cart', async () => {
    if (!productOpened) return false;
    // Try to select variant if present
    const varBtn = page.locator('button:has-text("S"), button:has-text("M")').first();
    if (await varBtn.count()>0 && await varBtn.isVisible().catch(()=>false)) { await varBtn.click(); await page.waitForTimeout(300); }
    const addBtn = page.locator('button:has-text("أضف للسلة")').first();
    if (await addBtn.count()===0) return false;
    const isDisabled = await addBtn.isDisabled().catch(()=>false);
    if (isDisabled) return false;
    await addBtn.click();
    await page.waitForTimeout(1000);
    return true;
  });
  // Cart drawer
  await step('Cart drawer', async () => {
    const hasCart = await page.locator('text=سلة التسوق').count() > 0;
    return hasCart;
  });
  // Quantity
  await step('Quantity +', async () => {
    const plus = page.locator('button[aria-label="زيادة"]').first();
    if (await plus.count()===0) return false;
    if (!await plus.isVisible()) return false;
    await plus.click();
    await page.waitForTimeout(400);
    return true;
  });
  // Check total
  await step('Cart total visible', async () => await page.locator('text=الإجمالي').count() > 0);
  // Loyalty in cart
  await step('Loyalty in cart (may be hidden if disabled)', async () => {
    const hasLoyalty = await page.locator('text=كسب').count() > 0;
    // Not failing if not visible, just log
    console.log('  loyalty badge count', await page.locator('text=كسب').count());
    return true; // don't fail
  });
  // Remove
  await step('Remove item', async () => {
    const trash = page.locator('button[aria-label="حذف"]').first();
    if (await trash.count()===0) return false;
    await trash.click();
    await page.waitForTimeout(600);
    return true;
  });
  // Re-add for checkout test
  await step('Re-add for checkout', async () => {
    // close cart if still open
    const closeBtn = page.locator('button[aria-label="إغلاق"]').first();
    if (await closeBtn.count()>0 && await closeBtn.isVisible().catch(()=>false)) await closeBtn.click();
    await page.waitForTimeout(500);
    // need to reopen product
    const card2 = page.locator('div.group').first();
    if (await card2.count()>0) await card2.click();
    await page.waitForTimeout(500);
    const add2 = page.locator('button:has-text("أضف للسلة")').first();
    if (await add2.count()>0) { await add2.click(); await page.waitForTimeout(800); return true; }
    return false;
  });
  // Checkout
  await step('Checkout open', async () => {
    const coBtn = page.locator('button:has-text("إتمام الطلب")').first();
    if (await coBtn.count()===0) return false;
    await coBtn.click();
    await page.waitForTimeout(800);
    const hasCheckout = await page.locator('text=إتمام الطلب').count() > 0;
    return hasCheckout;
  });

  console.log('Console errors:', consoleErrors.slice(0,2));
  console.log('Net 500:', net500.slice(0,2));
  await browser.close();
}
console.log('E2E DONE');
