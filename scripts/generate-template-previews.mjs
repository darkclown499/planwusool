/**
 * Generates full-page preview screenshots for every template.
 *
 * Requirements:
 *   - The app must be running locally (e.g. `php -S 127.0.0.1:8899 -t public`)
 *     with the demo store + templates seeded. A `demo.localhost` host mapping
 *     is applied via Chromium's host-resolver-rules (no hosts file edits).
 *   - Playwright chromium installed (`npx playwright install chromium`).
 *
 * Usage:
 *   node scripts/generate-template-previews.mjs [baseUrl] [width]
 *   Set PLAYWRIGHT_CHROMIUM_PATH to use a specific chromium executable.
 *
 * Output: public/templates/previews/{slug}.webp (800px wide, full page height)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.argv[2] || 'http://demo.localhost:8899';
const WIDTH = Number(process.argv[3] || 800);
// The API list is fetched over plain 127.0.0.1 (no demo.localhost mapping needed)
const API_URL = process.argv[4] || 'http://127.0.0.1:8899';

const OUT_DIR = path.resolve(__dirname, '../public/templates/previews');

async function getTemplateSlugs() {
  const res = await fetch(`${API_URL}/api/templates`);
  if (!res.ok) throw new Error(`Failed to fetch templates: ${res.status}`);
  const data = await res.json();
  return data.templates.map((t) => t.slug);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const slugs = await getTemplateSlugs();
  console.log(`Generating previews for ${slugs.length} templates...`);

  const browser = await chromium.launch({
    // Fall back to an already-installed chromium revision when the matching
    // headless shell for this Playwright version is not downloaded yet.
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    args: ['--host-resolver-rules=MAP demo.localhost 127.0.0.1'],
  });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: 1200 },
    deviceScaleFactor: 1,
  });

  let ok = 0;
  let failed = 0;

  for (const slug of slugs) {
    const url = `${BASE_URL}/?theme=${encodeURIComponent(slug)}&preview=1`;
    const outPath = path.join(OUT_DIR, `${slug}.webp`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      // Allow lazy images / fonts to settle
      await page.waitForTimeout(1800);
      await page.screenshot({ path: outPath, type: 'webp', fullPage: true });
      ok++;
      console.log(`  ✓ ${slug}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${slug}: ${err.message}`);
    }
  }

  await browser.close();

  console.log(`\nDone. ${ok} generated, ${failed} failed. → ${OUT_DIR}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
