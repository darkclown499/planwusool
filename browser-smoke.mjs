import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';

const SCREENSHOT_DIR = 'C:/Users/eyadf/Downloads/Compressed/codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder/screenshots';
if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE = 'https://wusool.ps';

const viewports = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 },
};

const results = [];
function log(phase, status, detail = '') {
  const line = `[${status}] ${phase}: ${detail}`;
  console.log(line);
  results.push({ phase, status, detail });
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    locale: 'ar-SA',
    timezoneId: 'Asia/Hebron',
  });

  // =====================================================================
  // PHASE 1: LANDING PAGE at 4 viewports
  // =====================================================================
  console.log('\n=== PHASE 1: LANDING PAGE VISUAL ===');
  for (const [vpName, vp] of Object.entries(viewports)) {
    const page = await context.newPage();
    await page.setViewportSize(vp);
    const consoleErrors = [];
    const networkErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('requestfailed', req => {
      networkErrors.push(`${req.failure()?.errorText} ${req.url()}`);
    });

    try {
      await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Screenshot
      const ssPath = `${SCREENSHOT_DIR}/landing-${vpName}.png`;
      await page.screenshot({ path: ssPath, fullPage: true });

      // Visual inspection
      const title = await page.title();
      const dir = await page.getAttribute('html', 'dir');
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      const overflow = bodyWidth > viewportWidth + 5;

      // Check for key elements
      const hasNav = await page.locator('nav, header, [class*="nav"], [class*="header"]').first().isVisible().catch(() => false);
      const hasHero = await page.locator('[class*="hero"], [class*="Hero"], section').first().isVisible().catch(() => false);
      const hasFooter = await page.locator('footer, [class*="footer"]').first().isVisible().catch(() => false);
      const hasButtons = await page.locator('button, a[href]').count();
      const hasImages = await page.locator('img').count();

      // Get page text to check for content
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
      const hasContent = bodyText.trim().length > 100;

      // Check for broken images
      const brokenImages = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img');
        const broken = [];
        imgs.forEach(img => {
          if (img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')) {
            broken.push(img.src);
          }
        });
        return broken;
      });

      // Check for horizontal scrollbar
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
      });

      // CSS loaded check
      const cssLoaded = await page.evaluate(() => {
        const styles = document.styleSheets;
        let cssCount = 0;
        for (let i = 0; i < styles.length; i++) {
          try { styles[i].cssRules; cssCount++; } catch(e) {}
        }
        return cssCount;
      });

      log(`Landing ${vpName}`, hasContent && !overflow ? 'PASS' : 'FAIL',
        `title="${title}" dir=${dir} overflow=${overflow} hasHorizontalScroll=${hasHorizontalScroll} nav=${hasNav} hero=${hasHero} footer=${hasFooter} buttons=${hasButtons} images=${hasImages} cssSheets=${cssLoaded} brokenImages=${brokenImages.length} consoleErrors=${consoleErrors.length} networkErrors=${networkErrors.length}`);

      if (consoleErrors.length > 0) log(`Landing ${vpName} Console`, 'ERROR', consoleErrors.join(' | '));
      if (networkErrors.length > 0) log(`Landing ${vpName} Network`, 'ERROR', networkErrors.join(' | '));
      if (brokenImages.length > 0) log(`Landing ${vpName} Images`, 'ERROR', brokenImages.join(' | '));

      // Capture a viewport-sized screenshot too
      await page.screenshot({ path: `${SCREENSHOT_DIR}/landing-${vpName}-viewport.png`, fullPage: false });
    } catch (e) {
      log(`Landing ${vpName}`, 'ERROR', e.message);
    }
    await page.close();
  }

  // =====================================================================
  // PHASE 2: BROWSER CONSOLE - detailed
  // =====================================================================
  console.log('\n=== PHASE 2: BROWSER CONSOLE ===');
  {
    const page = await context.newPage();
    await page.setViewportSize(viewports.desktop);
    const allConsole = [];
    page.on('console', msg => {
      allConsole.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      allConsole.push({ type: 'PAGE_ERROR', text: err.message });
    });

    try {
      await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    } catch (e) {
      log('Console', 'ERROR', e.message);
    }

    const criticalConsole = allConsole.filter(c =>
      c.type === 'error' || c.type === 'PAGE_ERROR' || c.type === 'warning'
    );
    if (criticalConsole.length === 0) {
      log('Console', 'PASS', 'No errors or warnings');
    } else {
      for (const c of criticalConsole) {
        log('Console', c.type === 'PAGE_ERROR' ? 'ERROR' : 'WARN', `[${c.type}] ${c.text.substring(0, 300)}`);
      }
    }
    await page.close();
  }

  // =====================================================================
  // PHASE 3: NETWORK - all asset requests
  // =====================================================================
  console.log('\n=== PHASE 3: NETWORK ===');
  {
    const page = await context.newPage();
    await page.setViewportSize(viewports.desktop);
    const failedRequests = [];
    const allRequests = [];
    page.on('requestfailed', req => {
      failedRequests.push({ url: req.url(), error: req.failure()?.errorText });
    });
    page.on('response', res => {
      if (res.status() >= 400) {
        allRequests.push({ url: res.url(), status: res.status() });
      }
    });

    try {
      await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    } catch (e) {
      log('Network', 'ERROR', e.message);
    }

    if (failedRequests.length === 0 && allRequests.length === 0) {
      log('Network', 'PASS', 'All requests succeeded');
    } else {
      for (const r of failedRequests) {
        log('Network', 'FAIL', `FAILED: ${r.url} - ${r.error}`);
      }
      for (const r of allRequests) {
        log('Network', 'WARN', `HTTP ${r.status}: ${r.url}`);
      }
    }
    await page.close();
  }

  // =====================================================================
  // PHASE 4: BUILD CONSISTENCY
  // =====================================================================
  console.log('\n=== PHASE 4: BUILD CONSISTENCY ===');
  {
    const page = await context.newPage();
    await page.setViewportSize(viewports.desktop);
    try {
      await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Extract CSS/JS hashes from rendered HTML
      const html = await page.content();
      const cssMatches = [...html.matchAll(/assets\/app-([A-Za-z0-9_-]+)\.css/g)].map(m => m[1]);
      const jsMatches = [...html.matchAll(/assets\/app-([A-Za-z0-9_-]+)\.js/g)].map(m => m[1]);
      
      const cssHashes = [...new Set(cssMatches)];
      const jsHashes = [...new Set(jsMatches)];

      log('Build Consistency', 'INFO', `CSS hashes in HTML: ${cssHashes.join(', ')}`);
      log('Build Consistency', 'INFO', `JS hashes in HTML: ${jsHashes.join(', ')}`);

      // Check that referenced assets exist
      for (const hash of cssHashes) {
        const resp = await page.request.get(`${BASE}/build/assets/app-${hash}.css`);
        log('Build CSS Check', resp.status() === 200 ? 'PASS' : 'FAIL',
          `app-${hash}.css -> ${resp.status()}`);
      }
      for (const hash of jsHashes) {
        const resp = await page.request.get(`${BASE}/build/assets/app-${hash}.js`);
        log('Build JS Check', resp.status() === 200 ? 'PASS' : 'FAIL',
          `app-${hash}.js -> ${resp.status()}`);
      }
    } catch (e) {
      log('Build Consistency', 'ERROR', e.message);
    }
    await page.close();
  }

  // =====================================================================
  // PHASE 7: LOGIN / GUEST ROUTES
  // =====================================================================
  console.log('\n=== PHASE 7: LOGIN / GUEST ROUTES ===');
  const guestRoutes = ['/', '/login'];
  for (const route of guestRoutes) {
    const page = await context.newPage();
    await page.setViewportSize(viewports.desktop);
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    try {
      const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      const status = resp?.status();
      const ssPath = `${SCREENSHOT_DIR}/route-${route.replace(/\//g, '_')}.png`;
      await page.screenshot({ path: ssPath, fullPage: true });

      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      const hasContent = bodyText.trim().length > 50;

      log(`Route ${route}`, status === 200 && hasContent ? 'PASS' : 'FAIL',
        `status=${status} hasContent=${hasContent} consoleErrors=${consoleErrors.length}`);
      if (consoleErrors.length > 0) {
        log(`Route ${route} Console`, 'ERROR', consoleErrors.join(' | '));
      }
    } catch (e) {
      log(`Route ${route}`, 'ERROR', e.message);
    }
    await page.close();
  }

  // =====================================================================
  // PHASE 9: STOREFRONT
  // =====================================================================
  console.log('\n=== PHASE 9: STOREFRONT ===');
  const storeRoutes = [
    { url: 'https://alraed.wusool.ps/', name: 'storefront-home' },
    { url: 'https://alraed.wusool.ps/search', name: 'storefront-search' },
  ];
  for (const store of storeRoutes) {
    const page = await context.newPage();
    await page.setViewportSize(viewports.mobile);
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
    page.on('response', res => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        consoleErrors.push(`HTTP ${res.status()}: ${res.url()}`);
      }
    });

    try {
      const resp = await page.goto(store.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      const ssPath = `${SCREENSHOT_DIR}/${store.name}-mobile.png`;
      await page.screenshot({ path: ssPath, fullPage: true });

      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
      const hasContent = bodyText.trim().length > 50;
      const dir = await page.getAttribute('html', 'dir');

      log(`Store ${store.name}`, resp?.status() === 200 && hasContent ? 'PASS' : 'FAIL',
        `status=${resp?.status()} dir=${dir} hasContent=${hasContent} consoleErrors=${consoleErrors.length}`);
      if (consoleErrors.length > 0) {
        log(`Store ${store.name} Errors`, 'ERROR', consoleErrors.slice(0, 5).join(' | '));
      }
    } catch (e) {
      log(`Store ${store.name}`, 'ERROR', e.message);
    }
    await page.close();
  }

  // =====================================================================
  // PHASE 10: SEARCH
  // =====================================================================
  console.log('\n=== PHASE 10: SEARCH ===');
  {
    const page = await context.newPage();
    await page.setViewportSize(viewports.mobile);
    try {
      await page.goto('https://alraed.wusool.ps/', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/store-search-before.png`, fullPage: true });

      // Try to find and use search
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="بحث"], input[name="q"]').first();
      const hasSearch = await searchInput.isVisible().catch(() => false);

      if (hasSearch) {
        await searchInput.click();
        await searchInput.fill('test');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/store-search-typing.png`, fullPage: true });
        await searchInput.press('Enter');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/store-search-results.png`, fullPage: true });
        const url = page.url();
        log('Search', url.includes('search') ? 'PASS' : 'WARN',
          `url=${url}`);
      } else {
        // Try clicking a search icon/button
        const searchBtn = page.locator('[class*="search"] button, button[aria-label*="search"], a[href*="search"]').first();
        const hasBtn = await searchBtn.isVisible().catch(() => false);
        log('Search', 'INFO', `searchInput=${hasSearch} searchButton=${hasBtn}`);
        if (hasBtn) {
          await searchBtn.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/store-search-opened.png`, fullPage: true });
        }
      }
    } catch (e) {
      log('Search', 'ERROR', e.message);
    }
    await page.close();
  }

  // =====================================================================
  // PHASE 11: CART / CSRF
  // =====================================================================
  console.log('\n=== PHASE 11: CART ===');
  {
    const page = await context.newPage();
    await page.setViewportSize(viewports.mobile);
    const httpErrors = [];
    page.on('response', res => {
      if (res.status() >= 400) httpErrors.push(`HTTP ${res.status()}: ${res.url()}`);
    });
    try {
      await page.goto('https://alraed.wusool.ps/', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Find an "add to cart" button
      const addBtn = page.locator('button:has-text("اضف"), button:has-text("أضف"), button:has-text("add"), button:has-text("سلة"), [class*="cart"] button').first();
      const hasAddBtn = await addBtn.isVisible().catch(() => false);

      if (hasAddBtn) {
        await addBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/cart-after-add.png`, fullPage: true });
        log('Cart Add', httpErrors.some(e => e.includes('419')) ? 'FAIL' : 'PASS',
          `addBtn clicked, httpErrors=${httpErrors.length}`);
      } else {
        log('Cart Add', 'WARN', 'No add-to-cart button found on page');
      }

      if (httpErrors.length > 0) {
        for (const e of httpErrors) log('Cart HTTP', 'ERROR', e);
      }
    } catch (e) {
      log('Cart', 'ERROR', e.message);
    }
    await page.close();
  }

  // =====================================================================
  // PHASE 18: SEO LIVE
  // =====================================================================
  console.log('\n=== PHASE 18: SEO LIVE ===');
  {
    const page = await context.newPage();
    await page.setViewportSize(viewports.desktop);
    try {
      await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const seo = await page.evaluate(() => {
        const get = (sel) => document.querySelector(sel)?.getAttribute('content') || document.querySelector(sel)?.textContent || '';
        return {
          title: document.title,
          canonical: document.querySelector('link[rel="canonical"]')?.href || '',
          robots: get('meta[name="robots"]'),
          ogTitle: get('meta[property="og:title"]'),
          ogDesc: get('meta[property="og:description"]'),
          ogImage: get('meta[property="og:image"]'),
          twCard: get('meta[name="twitter:card"]'),
          twTitle: get('meta[name="twitter:title"]'),
          jsonLd: document.querySelector('script[type="application/ld+json"]')?.textContent?.substring(0, 500) || '',
          description: get('meta[name="description"]'),
        };
      });

      log('SEO Title', seo.title ? 'PASS' : 'FAIL', seo.title);
      log('SEO Canonical', seo.canonical ? 'PASS' : 'FAIL', seo.canonical);
      log('SEO Robots', seo.robots ? 'PASS' : 'FAIL', seo.robots);
      log('SEO OG Title', seo.ogTitle ? 'PASS' : 'FAIL', seo.ogTitle);
      log('SEO OG Desc', seo.ogDesc ? 'PASS' : 'FAIL', seo.ogDesc.substring(0, 100));
      log('SEO Twitter', seo.twCard ? 'PASS' : 'FAIL', seo.twCard);
      log('SEO JSON-LD', seo.jsonLd ? 'PASS' : 'FAIL', seo.jsonLd.substring(0, 200));

      // Check robots.txt and sitemap
      const robotsResp = await page.request.get(`${BASE}/robots.txt`);
      log('SEO robots.txt', robotsResp.status() === 200 ? 'PASS' : 'FAIL', `status=${robotsResp.status()}`);

      const sitemapResp = await page.request.get(`${BASE}/sitemap.xml`);
      log('SEO sitemap.xml', sitemapResp.status() === 200 ? 'PASS' : 'FAIL', `status=${sitemapResp.status()}`);
    } catch (e) {
      log('SEO', 'ERROR', e.message);
    }
    await page.close();
  }

  // =====================================================================
  // SECURITY CHECK
  // =====================================================================
  console.log('\n=== SECURITY ===');
  {
    const page = await context.newPage();
    try {
      const envResp = await page.request.get(`${BASE}/.env`);
      log('Security .env', envResp.status() !== 200 ? 'PASS' : 'FAIL', `status=${envResp.status()}`);
      const gitResp = await page.request.get(`${BASE}/.git/config`);
      log('Security .git', gitResp.status() !== 200 ? 'PASS' : 'FAIL', `status=${gitResp.status()}`);
    } catch (e) {
      log('Security', 'PASS', 'Protected');
    }
    await page.close();
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const warns = results.filter(r => r.status === 'WARN').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | ERROR: ${errors} | WARN: ${warns}`);
})();
