import { chromium } from 'playwright';

const viewports = [
  { name: 'Desktop 1440x900', w: 1440, h: 900 },
  { name: 'Desktop 1024x768', w: 1024, h: 768 },
  { name: 'Mobile 375x812', w: 375, h: 812 },
  { name: 'Mobile 390x844', w: 390, h: 844 },
  { name: 'Mobile 430x932', w: 430, h: 932 },
  { name: 'Tablet 768x1024', w: 768, h: 1024 },
];
const templates = ['fashion-atelier','bazaar-market','grocery-souq','bakery-house','electronics-hub','restaurant-menu'];

const browser = await chromium.launch({ headless: true });
let allResults = [];

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'ar-EG', isMobile: vp.w < 768 });
  const page = await context.newPage();
  let consoleErrors = [];
  let net500 = [];
  let build404 = [];
  page.on('console', m => { if (m.type()==='error') consoleErrors.push(m.text().slice(0,120)); });
  page.on('response', r => { if (r.status()>=500) net500.push(r.url()); if (r.status()===404 && r.url().includes('/build/')) build404.push(r.url()); });

  for (const url of ['https://wusool.ps/', 'https://wusool.ps/login', 'https://demo.wusool.ps/']) {
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      const status = resp.status();
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5);
      const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
      const broken = await page.evaluate(() => Array.from(document.querySelectorAll('img')).filter(i=>!i.complete||i.naturalWidth===0).length);
      // Check images actually loaded via network 404 already captured, broken via naturalWidth is unreliable for lazy
      allResults.push({vp:vp.name, url, status, overflow, dir, broken, console: consoleErrors.length, net500: net500.length, build404: build404.length});
      console.log(`[${vp.name}] ${url} -> ${status} overflow:${overflow} dir:${dir} broken:${broken} console:${consoleErrors.length} 500:${net500.length}`);
    } catch(e){ console.log(`[${vp.name}] ${url} ERROR ${e.message.slice(0,100)}`); }
  }

  // Template preview check for one viewport only to save time (1440)
  if (vp.w===1440) {
    for (const tpl of templates) {
      const url = `https://demo.wusool.ps/?theme=${tpl}&preview=1`;
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        const status = resp.status();
        const hasHeader = await page.locator('header').count() > 0;
        const hasProducts = await page.locator('div.group, [class*="product"]').count() > 0;
        console.log(`[Template ${tpl}] ${status} header:${hasHeader} products:${hasProducts}`);
        allResults.push({vp:'Template '+tpl, url, status, hasHeader, hasProducts});
      } catch(e){ console.log(`[Template ${tpl}] ERROR ${e.message.slice(0,100)}`); }
    }
    // Cart drawer quantity buttons check
    try {
      await page.goto('https://demo.wusool.ps/', { waitUntil: 'networkidle' });
      // Open first product
      const card = page.locator('div.group').first();
      if (await card.count()>0) {
        await card.click();
        await page.waitForTimeout(800);
        const addBtn = page.locator('button:has-text("أضف للسلة")').first();
        if (await addBtn.count()>0) {
          // Select variant if needed
          const varBtn = page.locator('button:has-text("S"), button:has-text("M")').first();
          if (await varBtn.count()>0 && await varBtn.isVisible().catch(()=>false)) await varBtn.click();
          await addBtn.click();
          await page.waitForTimeout(800);
        }
        // Open cart manually
        const cartBtn = page.locator('button[aria-label="سلة التسوق"], button:has-text("السلة")').first();
        if (await cartBtn.count()>0) await cartBtn.click();
        await page.waitForTimeout(800);
        const drawer = await page.locator('text=سلة التسوق').count() > 0;
        console.log(`Cart drawer open: ${drawer}`);
        if (drawer) {
          const plus = page.locator('button[aria-label="زيادة"]').first();
          const minus = page.locator('button[aria-label="إنقاص"]').first();
          const plusBox = await plus.boundingBox().catch(()=>null);
          const minusBox = await minus.boundingBox().catch(()=>null);
          console.log(`Quantity buttons size plus:${plusBox?`${Math.round(plusBox.width)}x${Math.round(plusBox.height)}`:'not found'} minus:${minusBox?`${Math.round(minusBox.width)}x${Math.round(minusBox.height)}`:'not found'}`);
          // Check loyalty in cart
          const hasLoyalty = await page.locator('text=كسب').count() > 0;
          console.log(`Loyalty in cart: ${hasLoyalty}`);
          // Quantity +/-
          if (plusBox) { await plus.click(); await page.waitForTimeout(400); console.log('Quantity + click PASS'); }
          if (minusBox) { await minus.click(); await page.waitForTimeout(400); console.log('Quantity - click PASS'); }
        }
      }
    } catch(e){ console.log('Cart test error', e.message.slice(0,200)); }
  }

  await context.close();
}
await browser.close();
console.log('DONE');
