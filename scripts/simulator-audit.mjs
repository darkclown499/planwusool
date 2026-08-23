/**
 * Automated QA audit for the HeroPcSimulator on a live URL.
 *
 * Verifies: boot flow order, BIOS forced-LTR, cursor gliding,
 * Windows-11 login anatomy, hidden RTL scrollbar column,
 * real banner/product rendering. Saves per-stage screenshots.
 *
 * Usage:
 *   AUDIT_URL=https://wusool.ps/ SHOTS_DIR=/tmp/shots node scripts/simulator-audit.mjs
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.AUDIT_URL || 'https://wusool.ps/';
const outDir = process.env.SHOTS_DIR || path.resolve('simulator-shots');
mkdirSync(outDir, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` :: ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
try {
    const page = await browser.newPage({
        viewport: { width: 1400, height: 900 },
        locale: 'ar',
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    /* OFF state */
    const power = page.getByRole('button', { name: 'تشغيل التجربة' });
    await power.waitFor({ timeout: 25000 });
    check('OFF: power button visible', await power.isVisible());
    const cursorGoneBeforeBoot =
        (await page.locator('[data-testid="sim-cursor"]').count()) === 0;
    check('OFF: cursor hidden before power-on', cursorGoneBeforeBoot);
    await page.screenshot({ path: path.join(outDir, '1-off.png') });

    /* Boot */
    await power.click();

    /* BIOS */
    const bios = page.locator('[dir="ltr"]').filter({ hasText: 'WUSOOL BIOS' }).first();
    await bios.waitFor({ timeout: 8000 });
    const biosStyle = await bios.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { direction: cs.direction, align: cs.textAlign };
    });
    check('BIOS: direction is LTR', biosStyle.direction === 'ltr', JSON.stringify(biosStyle));
    check('BIOS: text aligned left', biosStyle.align === 'left');
    await sleep(900);
    await page.screenshot({ path: path.join(outDir, '2-bios.png') });

    /* Cursor exists & moves across stages */
    const cursor = page.locator('[data-testid="sim-cursor"]');
    await cursor.waitFor({ timeout: 5000 });
    const posA = await cursor.boundingBox();
    check(
        'CURSOR: parked near RAM area during BIOS (x≈55-62%)',
        !!posA && posA.x / 1400 > 0.4 && posA.x < 900,
        posA ? `x=${Math.round(posA.x)} y=${Math.round(posA.y)}` : 'missing',
    );

    /* Windows-11 login */
    const loginArrow = page.getByRole('button', { name: 'تسجيل الدخول', exact: true });
    await loginArrow.waitFor({ timeout: 10000 });
    const winWallpaper = await page.evaluate(() => {
        const el = [...document.querySelectorAll('div')].find((d) =>
            d.className?.includes?.('sim-win11'),
        );
        if (!el) return null;
        const bg = getComputedStyle(el).backgroundImage;
        return bg.includes('radial-gradient') && bg.includes('linear-gradient');
    });
    check('LOGIN: Win11 bloom wallpaper applied', winWallpaper === true);
    check('LOGIN: arrow submit present', await loginArrow.isVisible());
    const dotsLen = await page
        .locator('input[type="password"]')
        .inputValue()
        .then((v) => v.length)
        .catch(() => -1);
    check('LOGIN: password auto-typing (dots)', dotsLen > 0 && dotsLen <= 12, `len=${dotsLen}`);
    const trayIcons = await page.locator('.sim-win11 svg').count();
    check('LOGIN: tray icons rendered (>=4 svgs)', trayIcons >= 4, `count=${trayIcons}`);
    await page.screenshot({ path: path.join(outDir, '3-win11-login.png') });

    /* Welcome */
    const welcome = page.getByText('مرحباً', { exact: true });
    await welcome.waitFor({ timeout: 8000 });
    check('WELCOME: spinner screen shown', await welcome.isVisible());
    await page.screenshot({ path: path.join(outDir, '4-welcome.png') });

    /* Search */
    await page.getByText('كيف بكون موقعي', { exact: false }).first().waitFor({ timeout: 12000 });
    check('SEARCH: Arabic query typed', true);
    const posB = await cursor.boundingBox();
    void posB;
    await page.screenshot({ path: path.join(outDir, '5-search.png') });

    /* Demo store screen */
    await page.getByText('توصيل مجاني للطلبات فوق 200').waitFor({ timeout: 15000 });
    await sleep(1400); // let skeleton finish
    const scrollers = page.locator('.sim-scroll');
    const scrollOk = await scrollers.evaluateAll((els) =>
        els.every(
            (el) =>
                getComputedStyle(el).scrollbarWidth === 'none' ||
                el.offsetWidth === el.clientWidth,
        ),
    );
    const scrollerCount = await scrollers.count();
    check('DEMO: RTL scrollbar column hidden', scrollOk && scrollerCount > 0, `scrollers=${scrollerCount}`);

    const banner = page.locator('img[alt*="لقطة حقيقية"]').first();
    const bannerLoaded = await banner
        .evaluate((img) => img.complete && img.naturalWidth > 100)
        .catch(() => false);
    check('DEMO: real screenshot banner loaded', bannerLoaded);

    const cards = await page.getByText('اطلب واتساب').count();
    check('DEMO: real product cards rendered', cards >= 3, `cards=${cards}`);

    const fabVisible = await page
        .locator('a[aria-label="زيارة المتجر الحي"]')
        .isVisible()
        .catch(() => false);
    check('DEMO: WhatsApp FAB visible', fabVisible);
    await sleep(600);
    await page.screenshot({ path: path.join(outDir, '6-demo.png') });

    /* Cursor travelled far between BIOS and DEMO */
    const posC = await cursor.boundingBox();
    const travelled =
        posA && posC ? Math.hypot(posC.x - posA.x, posC.y - posA.y) : 0;
    check('CURSOR: glided across stages (>300px travel)', travelled > 300, `dist=${Math.round(travelled)}px`);

    const failed = results.filter((r) => !r.ok);
    console.log(`\nAUDIT SUMMARY: ${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
        console.log('FAILED:', failed.map((f) => f.name).join(' | '));
        process.exitCode = 1;
    }
} finally {
    await browser.close();
}
