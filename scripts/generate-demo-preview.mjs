/**
 * Captures a real screenshot of the live demo store and saves it as the
 * banner used inside the landing-page PC simulator.
 *
 * Usage (from the repo root):
 *   npm run preview:demo
 *
 * Env:
 *   DEMO_URL                  – store to capture (default https://demo.wusool.ps)
 *   PLAYWRIGHT_CHROMIUM_PATH  – optional system Chromium executable
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DEMO_URL = process.env.DEMO_URL || 'https://demo.wusool.ps';
const outDir = path.resolve('public/images');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'demo-store-preview.webp');

const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 810 },
        deviceScaleFactor: 1.5,
        locale: 'ar',
    });

    await page.goto(DEMO_URL, { waitUntil: 'networkidle', timeout: 60000 });
    // Let fonts/images/lazy sections settle before capturing.
    await page.waitForTimeout(2500);

    await page.screenshot({ path: outFile, type: 'webp', quality: 82 });
    console.log(`Saved ${outFile}`);
} finally {
    await browser.close();
}
