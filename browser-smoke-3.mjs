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
  // STOREFRONT 390 - RETEST CART
  // =====================================================================
  console.log('\n=== STOREFRONT CART RETEST ===');
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
      await page.screenshot({ path: `${SCREENSHOT_DIR}/store-retest-390.png`, fullPage: true });

      const hasContent = await page.evaluate(() => document.body.innerText.length > 50);
      log('Store Retest 390', hasContent ? 'PASS' : 'FAIL',
        `content=${hasContent} consoleErrors=${consoleErrors.length} networkErrors=${networkErrors.length}`);

      if (consoleErrors.length > 0) {
        for (const e of consoleErrors) log('Store Console', 'ERROR', e.substring(0, 300));
      }
      if (networkErrors.length > 0) {
        for (const e of networkErrors) log('Store Network', 'ERROR', e.substring(0, 300));
      }
    } catch (e) {
      log('Store Retest', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // STOREFRONT - CLICK THROUGH TO PRODUCT & ADD TO CART
  // =====================================================================
  console.log('\n=== STOREFRONT PRODUCT + CART ===');
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

      // Scroll down to find products
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/store-scrolled-390.png`, fullPage: false });

      // Get all links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          href: a.href,
          text: a.textContent.trim().substring(0, 50),
          visible: a.offsetParent !== null,
        })).filter(l => l.href && l.visible);
      });
      log('Store Links', 'INFO', `Found ${links.length} visible links. First 10: ${links.slice(0, 10).map(l => l.text.substring(0, 30) + ' -> ' + l.href.split('/').pop()).join(' | ')}`);

      // Find product links
      const productLinks = links.filter(l => l.href.includes('/product/') || l.href.includes('/p/'));
      log('Store Product Links', 'INFO', `Found ${productLinks.length} product links`);

      if (productLinks.length > 0) {
        await page.goto(productLinks[0].href, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/store-product-detail-390.png`, fullPage: true });

        // Try to add to cart
        const addBtns = await page.locator('button').allTextContents();
        log('Store Product Buttons', 'INFO', `Buttons: ${addBtns.filter(t => t.trim()).join(' | ')}`);

        // Try clicking add to cart button
        const addBtn = page.locator('button:has-text("اضف"), button:has-text("أضف"), button:has-text("سلة"), button:has-text("إضافة"), button:has-text("أضف للسلة")').first();
        const hasAddBtn = await addBtn.isVisible().catch(() => false);

        if (hasAddBtn) {
          await addBtn.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/store-after-add-390.png`, fullPage: true });
          log('Store Add to Cart', !httpErrors.some(e => e.includes('419')) ? 'PASS' : 'FAIL',
            `httpErrors=${httpErrors.length}`);
        } else {
          log('Store Add to Cart', 'WARN', 'No add-to-cart button found');
        }
      }
    } catch (e) {
      log('Store Product+Cart', 'ERROR', e.message.substring(0, 300));
    }
    if (httpErrors.length > 0) {
      for (const e of httpErrors) log('Store HTTP', 'ERROR', e);
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // LANDING 390 - SCROLL + IMAGES RETEST
  // =====================================================================
  console.log('\n=== LANDING 390 DETAIL ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await page.goto('https://wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);

      // Scroll through entire page to trigger lazy loading
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < scrollHeight; y += 500) {
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(3000);

      // Now check images
      const imgStats = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img');
        let loaded = 0, broken = 0, lazy = 0;
        const brokenSrcs = [];
        imgs.forEach(img => {
          if (img.loading === 'lazy') lazy++;
          if (img.naturalWidth > 0) loaded++;
          else if (img.src && !img.src.startsWith('data:')) {
            broken++;
            brokenSrcs.push(img.src);
          }
        });
        return { total: imgs.length, loaded, broken, lazy, brokenSrcs: [...new Set(brokenSrcs)].slice(0, 10) };
      });

      log('Landing 390 Images', imgStats.broken === 0 ? 'PASS' : 'WARN',
        `total=${imgStats.total} loaded=${imgStats.loaded} broken=${imgStats.broken} lazy=${imgStats.lazy}`);
      if (imgStats.brokenSrcs.length > 0) {
        log('Landing 390 Broken', 'INFO', imgStats.brokenSrcs.join('\n'));
      }

      await page.screenshot({ path: `${SCREENSHOT_DIR}/landing-390-scrolled.png`, fullPage: false });

      // Check horizontal overflow after scroll
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5);
      log('Landing 390 Overflow', overflow ? 'FAIL' : 'PASS', `scrollWidth=${await page.evaluate(() => document.documentElement.scrollWidth)} clientWidth=${await page.evaluate(() => document.documentElement.clientWidth)}`);

    } catch (e) {
      log('Landing 390', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // LOGIN 390 + 1440
  // =====================================================================
  console.log('\n=== LOGIN DETAIL ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const consoleErrors = [];
    page.on('pageerror', err => consoleErrors.push(err.message));
    try {
      await page.goto('https://wusool.ps/login', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/login-390-detail.png`, fullPage: true });

      const formElements = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const buttons = Array.from(document.querySelectorAll('button'));
        return {
          inputs: inputs.map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder })),
          buttons: buttons.map(b => ({ text: b.textContent.trim().substring(0, 30), type: b.type })),
          hasForm: !!document.querySelector('form'),
        };
      });

      log('Login 390', 'PASS', JSON.stringify(formElements));
      if (consoleErrors.length > 0) log('Login Errors', 'ERROR', consoleErrors.join(' | '));
    } catch (e) {
      log('Login', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // SEO DETAIL
  // =====================================================================
  console.log('\n=== SEO DETAIL ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    try {
      await page.goto('https://wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(3000);

      const seo = await page.evaluate(() => {
        return {
          title: document.title,
          canonical: document.querySelector('link[rel="canonical"]')?.href,
          robots: document.querySelector('meta[name="robots"]')?.content,
          description: document.querySelector('meta[name="description"]')?.content,
          ogTitle: document.querySelector('meta[property="og:title"]')?.content,
          ogDesc: document.querySelector('meta[property="og:description"]')?.content,
          ogType: document.querySelector('meta[property="og:type"]')?.content,
          ogImage: document.querySelector('meta[property="og:image"]')?.content,
          twitterCard: document.querySelector('meta[name="twitter:card"]')?.content,
          hasJsonLd: !!document.querySelector('script[type="application/ld+json"]'),
          jsonLdPreview: document.querySelector('script[type="application/ld+json"]')?.textContent?.substring(0, 200),
        };
      });

      for (const [key, val] of Object.entries(seo)) {
        log(`SEO ${key}`, val ? 'PASS' : 'FAIL', String(val).substring(0, 200));
      }

      // robots.txt
      const robotsResp = await page.request.get('https://wusool.ps/robots.txt');
      const robotsText = await robotsResp.text();
      log('SEO robots.txt', robotsResp.status() === 200 ? 'PASS' : 'FAIL', robotsText.substring(0, 200));

      // sitemap.xml
      const sitemapResp = await page.request.get('https://wusool.ps/sitemap.xml');
      const sitemapText = await sitemapResp.text();
      log('SEO sitemap.xml', sitemapResp.status() === 200 ? 'PASS' : 'FAIL', sitemapText.substring(0, 300));

    } catch (e) {
      log('SEO', 'ERROR', e.message.substring(0, 300));
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
  console.log('\nAll Results:');
  for (const r of results) {
    console.log(`  [${r.status}] ${r.phase}: ${r.detail.substring(0, 200)}`);
  }
})();
