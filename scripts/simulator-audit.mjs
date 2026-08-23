/**
 * Automated QA audit for the HeroPcSimulator on a live URL.
 *
 * Desktop pass: boot flow order, BIOS forced-LTR, Windows-11 login anatomy,
 * hidden RTL scrollbar column, real banner/product rendering.
 * Mobile pass (390x844): same flow + horizontal-overflow guard.
 * Both passes collect console errors and uncaught page errors.
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

async function runPass(label, viewport, shotsPrefix) {
    const consoleErrors = [];
    const pageErrors = [];
    const context = await browser.newContext({
        viewport,
        locale: 'ar',
        deviceScaleFactor: label === 'MOBILE' ? 2 : 1,
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 160));
    });
    page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 160)));

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    /* OFF state */
    const power = page.getByRole('button', { name: 'تشغيل التجربة' });
    await power.waitFor({ timeout: 25000 });
    check(`${label}: power button visible`, await power.isVisible());
    await page.screenshot({ path: path.join(outDir, `${shotsPrefix}-1-off.png`) });

    /* BIOS — hard-forced LTR */
    await power.click();
    const bios = page.locator('[dir="ltr"]').filter({ hasText: 'WUSOOL BIOS' }).first();
    await bios.waitFor({ timeout: 8000 });
    const biosStyle = await bios.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { direction: cs.direction, align: cs.textAlign };
    });
    check(`${label}: BIOS forced LTR + left-aligned`, biosStyle.direction === 'ltr' && biosStyle.align === 'left', JSON.stringify(biosStyle));
    await sleep(900);
    await page.screenshot({ path: path.join(outDir, `${shotsPrefix}-2-bios.png`) });

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
    check(`${label}: Win11 bloom wallpaper`, winWallpaper === true);
    const dotsLen = await page
        .locator('input[type="password"]')
        .inputValue()
        .then((v) => v.length)
        .catch(() => -1);
    check(`${label}: password auto-typing`, dotsLen > 0 && dotsLen <= 12, `len=${dotsLen}`);
    const trayIcons = await page.locator('.sim-win11 svg').count();
    check(`${label}: Win11 tray icons (>=4 svgs)`, trayIcons >= 4, `count=${trayIcons}`);
    await page.screenshot({ path: path.join(outDir, `${shotsPrefix}-3-win11-login.png`) });

    /* Welcome spinner */
    await page.getByText('مرحباً', { exact: true }).waitFor({ timeout: 8000 });
    check(`${label}: welcome spinner screen`, true);
    await page.screenshot({ path: path.join(outDir, `${shotsPrefix}-4-welcome.png`) });

    /* Search typing */
    await page.getByText('كيف بكون موقعي', { exact: false }).first().waitFor({ timeout: 12000 });
    check(`${label}: Arabic query auto-typed`, true);
    await page.screenshot({ path: path.join(outDir, `${shotsPrefix}-5-search.png`) });

    /* Demo store screen */
    await page.getByText('توصيل مجاني للطلبات فوق 200').waitFor({ timeout: 15000 });
    await sleep(1400); // skeleton finishes
    const scrollers = page.locator('.sim-scroll');
    const scrollOk = await scrollers.evaluateAll((els) =>
        els.every(
            (el) =>
                getComputedStyle(el).scrollbarWidth === 'none' ||
                el.offsetWidth === el.clientWidth,
        ),
    );
    check(`${label}: RTL scrollbar column hidden`, scrollOk && (await scrollers.count()) > 0);

    if (label === 'DESKTOP') {
        const banner = page.locator('img[alt*="لقطة حقيقية"]').first();
        const bannerLoaded = await banner
            .evaluate((img) => img.complete && img.naturalWidth > 100)
            .catch(() => false);
        check(`${label}: real screenshot banner loaded`, bannerLoaded);
    }
    const cards = await page.getByText('اطلب واتساب').count();
    check(`${label}: product cards rendered`, cards >= 2, `cards=${cards}`);

    /* Horizontal overflow guard (whole document) */
    const overflow = await page.evaluate(() => ({
        scrollW: document.scrollingElement.scrollWidth,
        innerW: window.innerWidth,
    }));
    check(`${label}: no horizontal page overflow`, overflow.scrollW <= overflow.innerW + 1, JSON.stringify(overflow));
    await sleep(500);
    await page.screenshot({ path: path.join(outDir, `${shotsPrefix}-6-demo.png`) });

    /* Runtime health */
    check(`${label}: no uncaught page errors`, pageErrors.length === 0, pageErrors.join(' | '));
    // Filter known-benign noise (favicon, analytics ad-blockers) from console errors.
    const serious = consoleErrors.filter(
        (e) => !/favicon|net::|Failed to load resource/i.test(e),
    );
    check(`${label}: no console errors`, serious.length === 0, serious.join(' | '));

    await context.close();
}

try {
    await runPass('DESKTOP', { width: 1400, height: 900 }, 'd');
    await runPass('MOBILE', { width: 390, height: 844 }, 'm');

    const failed = results.filter((r) => !r.ok);
    console.log(`\nAUDIT SUMMARY: ${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
        console.log('FAILED:', failed.map((f) => f.name).join(' | '));
        process.exitCode = 1;
    }
} finally {
    await browser.close();
}
