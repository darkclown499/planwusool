import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';

const SCREENSHOT_DIR = 'C:/Users/eyadf/Downloads/Compressed/codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder/screenshots';
if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];
function log(phase, status, detail = '') {
  const line = `[${status}] ${phase}: ${detail}`;
  console.log(line);
  results.push({ phase, status, detail });
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  // =====================================================================
  // STOREFRONT - with 'load' waitUntil and longer timeout
  // =====================================================================
  console.log('\n=== STOREFRONT HOME ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const consoleErrors = [];
    const networkErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      consoleErrors.push(`PAGE_ERROR: ${err.message}`);
    });
    page.on('response', res => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        networkErrors.push(`HTTP ${res.status()}: ${res.url()}`);
      }
    });

    try {
      await page.goto('https://alraed.wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);

      await page.screenshot({ path: `${SCREENSHOT_DIR}/store-home-390.png`, fullPage: true });
      await page.screenshot({ path: `${SCREENSHOT_DIR}/store-home-390-viewport.png`, fullPage: false });

      const title = await page.title();
      const dir = await page.getAttribute('html', 'dir');
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
      const hasContent = bodyText.trim().length > 50;
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const overflow = bodyWidth > clientWidth + 5;

      // Check for products
      const productCards = await page.locator('[class*="product"], [class*="Product"], [data-product]').count();

      // Check for header/nav
      const hasHeader = await page.locator('header, nav, [class*="header"], [class*="Header"]').first().isVisible().catch(() => false);

      // Check for search
      const searchElements = await page.locator('input[type="search"], input[placeholder*="بحث"], [class*="search"], [class*="Search"]').count();

      // Check for cart
      const cartElements = await page.locator('[class*="cart"], [class*="Cart"], [aria-label*="cart"]').count();

      log('Store Home 390', 'PASS', `title="${title}" dir=${dir} overflow=${overflow} products=${productCards} header=${hasHeader} search=${searchElements} cart=${cartElements} content=${hasContent} bodyWidth=${bodyWidth} clientWidth=${clientWidth}`);

      if (consoleErrors.length > 0) {
        for (const e of consoleErrors) log('Store Console', 'ERROR', e.substring(0, 300));
      }
      if (networkErrors.length > 0) {
        for (const e of networkErrors) log('Store Network', 'ERROR', e.substring(0, 300));
      }
    } catch (e) {
      log('Store Home', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // STOREFRONT 1440
  // =====================================================================
  console.log('\n=== STOREFRONT HOME 1440 ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    try {
      await page.goto('https://alraed.wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/store-home-1440.png`, fullPage: true });

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      log('Store Home 1440', 'PASS', `bodyWidth=${bodyWidth} clientWidth=${clientWidth} overflow=${bodyWidth > clientWidth + 5}`);
    } catch (e) {
      log('Store Home 1440', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // SEARCH on storefront
  // =====================================================================
  console.log('\n=== STOREFRONT SEARCH ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await page.goto('https://alraed.wusool.ps/search', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/store-search-390.png`, fullPage: true });

      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      log('Store Search', 'PASS', `content=${bodyText.trim().substring(0, 100)}`);
    } catch (e) {
      log('Store Search', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // STOREFRONT - SEARCH with product query
  // =====================================================================
  console.log('\n=== STOREFRONT SEARCH Q ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await page.goto('https://alraed.wusool.ps/search?q=test', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/store-search-q-390.png`, fullPage: true });

      const url = page.url();
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      log('Store Search Q', url.includes('search') ? 'PASS' : 'FAIL', `url=${url} content=${bodyText.trim().substring(0, 100)}`);
    } catch (e) {
      log('Store Search Q', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // CART on storefront - navigate to product, add to cart
  // =====================================================================
  console.log('\n=== STOREFRONT CART ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const httpErrors = [];
    page.on('response', res => {
      if (res.status() >= 400) httpErrors.push(`HTTP ${res.status()}: ${res.url()}`);
    });
    try {
      await page.goto('https://alraed.wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);

      // Find a product link
      const productLink = page.locator('a[href*="/product/"], a[href*="/p/"], [class*="product"] a').first();
      const hasProduct = await productLink.isVisible().catch(() => false);

      if (hasProduct) {
        await productLink.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/store-product-390.png`, fullPage: true });

        const productUrl = page.url();
        log('Store Product', 'PASS', `url=${productUrl}`);

        // Try add to cart
        const addBtn = page.locator('button:has-text("اضف"), button:has-text("أضف"), button:has-text("سلة"), button:has-text("Add"), button:has-text("Cart"), [class*="cart"] button, [class*="Cart"] button').first();
        const hasAddBtn = await addBtn.isVisible().catch(() => false);

        if (hasAddBtn) {
          await addBtn.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/store-cart-add-390.png`, fullPage: true });
          log('Store Cart Add', !httpErrors.some(e => e.includes('419')) ? 'PASS' : 'FAIL',
            `added, httpErrors=${httpErrors.length}`);
        } else {
          log('Store Cart Add', 'WARN', 'No add-to-cart button found on product page');
        }
      } else {
        log('Store Product', 'WARN', 'No product links found on homepage');
      }

      if (httpErrors.length > 0) {
        for (const e of httpErrors) log('Store HTTP', 'ERROR', e);
      }
    } catch (e) {
      log('Store Cart', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // LANDING PAGE - detailed visual inspection
  // =====================================================================
  console.log('\n=== LANDING VISUAL DETAIL ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await page.goto('https://wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);

      // Detailed element check
      const details = await page.evaluate(() => {
        const body = document.body;
        const cs = getComputedStyle;
        return {
          bodyBg: cs(body).backgroundColor,
          fontFamily: cs(body).fontFamily.substring(0, 100),
          fontSize: cs(body).fontSize,
          color: cs(body).color,
          lineHeight: cs(body).lineHeight,
          textAlign: cs(document.documentElement).textAlign,
          dir: document.documentElement.dir,
          h1Count: document.querySelectorAll('h1').length,
          h2Count: document.querySelectorAll('h2').length,
          sectionCount: document.querySelectorAll('section').length,
          svgCount: document.querySelectorAll('svg').length,
          formCount: document.querySelectorAll('form').length,
          inputCount: document.querySelectorAll('input').length,
          linkCount: document.querySelectorAll('a').length,
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
        };
      });

      log('Landing Visual', 'PASS', JSON.stringify(details).substring(0, 500));
    } catch (e) {
      log('Landing Visual', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // LOGIN PAGE
  // =====================================================================
  console.log('\n=== LOGIN PAGE ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      consoleErrors.push(`PAGE_ERROR: ${err.message}`);
    });
    try {
      const resp = await page.goto('https://wusool.ps/login', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/login-390.png`, fullPage: true });
      await page.screenshot({ path: `${SCREENSHOT_DIR}/login-1440.png`, fullPage: false });

      const hasForm = await page.locator('form, input[type="email"], input[type="password"]').count();
      const hasBtn = await page.locator('button[type="submit"], button:has-text("دخول"), button:has-text("Login")').count();

      log('Login 390', resp?.status() === 200 ? 'PASS' : 'FAIL',
        `status=${resp?.status()} formElements=${hasForm} buttons=${hasBtn} consoleErrors=${consoleErrors.length}`);
      if (consoleErrors.length > 0) {
        for (const e of consoleErrors) log('Login Console', 'ERROR', e.substring(0, 300));
      }
    } catch (e) {
      log('Login', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  await browser.close();

  console.log('\n=== FINAL SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const warns = results.filter(r => r.status === 'WARN').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | ERROR: ${errors} | WARN: ${warns}`);
})();
