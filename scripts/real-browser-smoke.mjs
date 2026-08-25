import { chromium, devices } from 'playwright';

const viewports = [
  { name: 'Desktop 1440x900', width: 1440, height: 900 },
  { name: 'Desktop 1024x768', width: 1024, height: 768 },
  { name: 'Mobile 375x812', width: 375, height: 812 },
  { name: 'Mobile 390x844', width: 390, height: 844 },
  { name: 'Mobile 430x932', width: 430, height: 932 },
  { name: 'Tablet 768x1024', width: 768, height: 1024 },
];

const urls = [
  { label: 'Landing', url: 'https://wusool.ps/' },
  { label: 'Login', url: 'https://wusool.ps/login' },
  { label: 'Demo Store', url: 'https://demo.wusool.ps/' },
];

const browser = await chromium.launch({ headless: true });
let results = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.width < 768,
    hasTouch: vp.width < 768,
    locale: 'ar-EG',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const networkErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('response', resp => {
    const status = resp.status();
    if (status >= 500) networkErrors.push(`${resp.url()} -> ${status}`);
    if (status === 404 && resp.url().includes('/build/')) networkErrors.push(`404 build ${resp.url()}`);
  });

  for (const u of urls) {
    try {
      const resp = await page.goto(u.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const status = resp ? resp.status() : 0;
      await page.waitForTimeout(1500);
      // Check for broken images
      const broken = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src).slice(0, 5);
      });
      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      // Check RTL
      const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
      // Check for visible product cards / header
      const hasHeader = await page.locator('header').count() > 0;
      const productCount = await page.locator('[class*="product"], [class*="Product"]').count().catch(()=>0);
      results.push({
        viewport: vp.name,
        url: u.label,
        status,
        consoleErrors: consoleErrors.slice(0, 3),
        networkErrors: networkErrors.slice(0, 3),
        brokenImages: broken.length,
        overflow,
        dir,
        hasHeader: !!hasHeader,
      });
      console.log(`[${vp.name}] ${u.label} -> ${status} broken:${broken.length} overflow:${overflow} dir:${dir} consoleErr:${consoleErrors.length} netErr:${networkErrors.length}`);
      if (broken.length > 0) console.log('  broken samples', broken.slice(0, 2));
    } catch (e) {
      console.log(`[${vp.name}] ${u.label} ERROR: ${e.message}`);
      results.push({ viewport: vp.name, url: u.label, status: 0, error: e.message });
    }
  }
  await context.close();
}

await browser.close();

console.log('\n=== SUMMARY ===');
for (const r of results) {
  console.log(`${r.viewport} | ${r.url} | ${r.status} | broken:${r.brokenImages} | overflow:${r.overflow} | dir:${r.dir} | console:${r.consoleErrors?.length || 0}`);
}
