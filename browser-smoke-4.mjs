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
  // STOREFRONT CATEGORY → PRODUCT → CART FLOW
  // =====================================================================
  console.log('\n=== STOREFRONT: CATEGORY → PRODUCT → CART ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const httpErrors = [];
    page.on('response', res => {
      if (res.status() >= 400) httpErrors.push(`HTTP ${res.status()}: ${res.url()}`);
    });

    try {
      // 1. Load storefront
      await page.goto('https://alraed.wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/flow-01-store-home.png`, fullPage: true });

      // 2. Click a category
      const categoryLinks = await page.locator('a[href*="/category/"], a[href*="/c/"]').all();
      log('Flow Categories', 'INFO', `Found ${categoryLinks.length} category links`);

      if (categoryLinks.length > 0) {
        const href = await categoryLinks[0].getAttribute('href');
        const text = await categoryLinks[0].textContent();
        log('Flow Click Category', 'INFO', `Clicking: ${text.trim().substring(0, 30)} -> ${href}`);
        await categoryLinks[0].click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/flow-02-category.png`, fullPage: true });

        const catUrl = page.url();
        log('Flow Category Page', 'PASS', `url=${catUrl}`);

        // 3. Find product cards on category page
        const productLinks = await page.locator('a[href*="/product/"]').all();
        log('Flow Products', 'INFO', `Found ${productLinks.length} product links on category page`);

        if (productLinks.length === 0) {
          // Try alternative selectors
          const allLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
              .filter(a => a.offsetParent !== null && !a.href.includes('/category/') && !a.href.includes('/search'))
              .map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 50) }))
              .slice(0, 20);
          });
          log('Flow All Links', 'INFO', JSON.stringify(allLinks.slice(0, 10)));

          // Try clicking one that looks like a product
          if (allLinks.length > 0) {
            const productLink = allLinks.find(l => l.href.includes('alraed.wusool.ps') && !l.href.includes('/category/') && !l.href.includes('/search') && l.text.length > 0);
            if (productLink) {
              await page.goto(productLink.href, { waitUntil: 'load', timeout: 30000 });
              await page.waitForTimeout(5000);
              await page.screenshot({ path: `${SCREENSHOT_DIR}/flow-03-product-alt.png`, fullPage: true });
              log('Flow Product Alt', 'PASS', `url=${page.url()}`);
            }
          }
        } else {
          // Click first product
          await productLinks[0].click();
          await page.waitForTimeout(5000);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/flow-03-product.png`, fullPage: true });
          log('Flow Product Page', 'PASS', `url=${page.url()}`);
        }

        // 4. Try add to cart
        const addBtn = page.locator('button:has-text("اضف"), button:has-text("أضف"), button:has-text("سلة"), button:has-text("إضافة"), button:has-text("أضف للسلة"), button:has-text("اضافة"), [class*="cart"] button').first();
        const hasAddBtn = await addBtn.isVisible().catch(() => false);
        if (hasAddBtn) {
          await addBtn.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/flow-04-after-add.png`, fullPage: true });
          log('Flow Add to Cart', !httpErrors.some(e => e.includes('419')) ? 'PASS' : 'FAIL',
            `clicked, totalHttpErrors=${httpErrors.length}`);
        } else {
          log('Flow Add to Cart', 'WARN', 'No add-to-cart button found on product page');
          // List all visible buttons
          const btns = await page.locator('button:visible').allTextContents();
          log('Flow Visible Buttons', 'INFO', btns.filter(b => b.trim()).join(' | '));
        }
      }
    } catch (e) {
      log('Storefront Flow', 'ERROR', e.message.substring(0, 300));
    }

    if (httpErrors.length > 0) {
      for (const e of httpErrors) log('Flow HTTP', 'ERROR', e.substring(0, 200));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // LANDING IMAGES - HTTP CHECK (not just naturalWidth)
  // =====================================================================
  console.log('\n=== LANDING IMAGES HTTP CHECK ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    try {
      await page.goto('https://wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Scroll to bottom to trigger all lazy loads
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < scrollHeight; y += 300) {
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(5000);

      // Get all image srcs
      const imageSrcs = await page.evaluate(() => {
        return [...new Set(Array.from(document.querySelectorAll('img')).map(img => img.src).filter(s => s && !s.startsWith('data:')))];
      });

      log('Image HTTP Check', 'INFO', `Found ${imageSrcs.length} unique image URLs`);

      let brokenCount = 0;
      for (const src of imageSrcs) {
        try {
          const resp = await page.request.get(src, { timeout: 5000 });
          if (resp.status() !== 200) {
            brokenCount++;
            log('Image HTTP', 'FAIL', `${resp.status()}: ${src}`);
          }
        } catch (e) {
          brokenCount++;
          log('Image HTTP', 'FAIL', `Timeout/Error: ${src}`);
        }
      }
      if (brokenCount === 0) {
        log('Image HTTP Check', 'PASS', `All ${imageSrcs.length} images returned 200`);
      }
    } catch (e) {
      log('Image HTTP Check', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // LOGIN - FULL FLOW
  // =====================================================================
  console.log('\n=== LOGIN FLOW ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    const consoleErrors = [];
    page.on('pageerror', err => consoleErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    try {
      await page.goto('https://wusool.ps/login', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/login-1440.png`, fullPage: true });
      log('Login 1440', 'PASS', `consoleErrors=${consoleErrors.length}`);
      if (consoleErrors.length > 0) {
        for (const e of consoleErrors) log('Login Console', 'ERROR', e.substring(0, 200));
      }
    } catch (e) {
      log('Login', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // PRODUCTION LOG CHECK
  // =====================================================================
  console.log('\n=== PRODUCTION LOG CHECK ===');
  // Will be done via SSH separately

  await browser.close();

  console.log('\n=== FINAL SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const warns = results.filter(r => r.status === 'WARN').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | ERROR: ${errors} | WARN: ${warns}`);
})();
