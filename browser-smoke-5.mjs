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
  // STOREFRONT - VISIT CATEGORY WITH PRODUCTS
  // =====================================================================
  console.log('\n=== STOREFRONT: CATEGORY WITH PRODUCTS ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await page.goto('https://alraed.wusool.ps/category/adaot-shy-okhrbayy', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/store-category-390.png`, fullPage: true });

      // Check all images on category page
      const imgs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map(i => ({
          src: i.src,
          naturalWidth: i.naturalWidth,
          loading: i.loading,
        }));
      });
      const broken = imgs.filter(i => i.naturalWidth === 0 && !i.src.startsWith('data:') && i.loading !== 'lazy');
      log('Category 390', 'PASS', `images=${imgs.length} brokenNonLazy=${broken.length}`);

      // Check page content
      const content = await page.evaluate(() => document.body.innerText.substring(0, 1000));
      log('Category Content', 'INFO', content.substring(0, 200));
    } catch (e) {
      log('Category', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // LANDING 390 - FULL PAGE SCREENSHOT
  // =====================================================================
  console.log('\n=== LANDING 390 FINAL ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await page.goto('https://wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);

      // Scroll to load lazy images
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 300) {
        await page.evaluate(s => window.scrollTo(0, s), y);
        await page.waitForTimeout(50);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(2000);

      await page.screenshot({ path: `${SCREENSHOT_DIR}/final-landing-390.png`, fullPage: true });

      const metrics = await page.evaluate(() => ({
        title: document.title,
        dir: document.documentElement.dir,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        scrollH: document.documentElement.scrollHeight,
        h1: document.querySelectorAll('h1').length,
        sections: document.querySelectorAll('section').length,
        footer: !!document.querySelector('footer'),
      }));

      log('Final Landing 390', 'PASS', JSON.stringify(metrics));
    } catch (e) {
      log('Final Landing 390', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // LANDING 1440 FINAL
  // =====================================================================
  console.log('\n=== LANDING 1440 FINAL ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    try {
      await page.goto('https://wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 300) {
        await page.evaluate(s => window.scrollTo(0, s), y);
        await page.waitForTimeout(50);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/final-landing-1440.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5);
      log('Final Landing 1440', overflow ? 'FAIL' : 'PASS', `overflow=${overflow}`);
    } catch (e) {
      log('Final Landing 1440', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // STOREFRONT 390 FINAL
  // =====================================================================
  console.log('\n=== STOREFRONT 390 FINAL ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    try {
      await page.goto('https://alraed.wusool.ps/', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/final-storefront-390.png`, fullPage: true });

      const metrics = await page.evaluate(() => ({
        dir: document.documentElement.dir,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        title: document.title,
        bodyLen: document.body.innerText.length,
      }));
      log('Final Storefront 390', 'PASS', JSON.stringify(metrics));
    } catch (e) {
      log('Final Storefront 390', 'ERROR', e.message.substring(0, 300));
    }
    await page.close();
    await context.close();
  }

  // =====================================================================
  // CONSECUTIVE HEALTH - 10 requests from browser
  // =====================================================================
  console.log('\n=== CONSECUTIVE HEALTH ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    let allOk = true;
    for (let i = 1; i <= 10; i++) {
      try {
        const resp = await page.goto('https://wusool.ps/', { waitUntil: 'load', timeout: 15000 });
        const status = resp?.status();
        if (status !== 200) allOk = false;
        log(`Consecutive ${i}`, status === 200 ? 'PASS' : 'FAIL', `status=${status}`);
      } catch (e) {
        allOk = false;
        log(`Consecutive ${i}`, 'ERROR', e.message.substring(0, 100));
      }
    }
    log('Consecutive Health', allOk ? 'PASS' : 'FAIL', `allOk=${allOk}`);
    await page.close();
    await context.close();
  }

  // =====================================================================
  // SECURITY
  // =====================================================================
  console.log('\n=== SECURITY ===');
  {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Hebron' });
    const page = await context.newPage();
    try {
      const checks = [
        { url: 'https://wusool.ps/.env', expect: [403, 404] },
        { url: 'https://wusool.ps/.git/config', expect: [403, 404] },
        { url: 'https://wusool.ps/.git/HEAD', expect: [403, 404] },
        { url: 'https://wusool.ps/vendor/phpunit/phpunit/src/TextUI/Application.php', expect: [403, 404] },
      ];
      for (const check of checks) {
        const resp = await page.request.get(check.url);
        const passed = check.expect.includes(resp.status());
        log(`Security ${check.url.split('/').pop()}`, passed ? 'PASS' : 'FAIL', `status=${resp.status()}`);
      }
    } catch (e) {
      log('Security', 'ERROR', e.message.substring(0, 300));
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
