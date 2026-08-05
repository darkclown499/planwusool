import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:8000';

const USERS = [
  { name: 'superadmin', email: 'superadmin@example.com', password: 'password', denyIsError: false },
  { name: 'company', email: 'company@example.com', password: 'password', denyIsError: true },
];

// Pages where we assert the direction is RTL (dashboard must always be RTL)
const RTL_PAGES = ['/stores/1/settings', '/stores/1/appearance'];

// key -> { path, arText } : after visiting path, at least one of these strings must be visible
const TRANSLATION_CHECKS = [
  { path: '/advanced-coupons', arText: 'الكوبونات المتقدمة', label: 'Advanced Coupons' },
  { path: '/cod-payments', arText: 'الدفع عند الاستلام', label: 'COD Payments' },
  { path: '/stores/1/settings', arText: 'إعدادات المتجر', label: 'Store Settings' },
];

async function runUser(browser, user, report) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Suppress the auto-start guide tour so it can't block audit clicks.
  await context.addInitScript(() => {
    try { localStorage.setItem('wusool_tour_seen', '1'); } catch (e) {}
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 500)); });
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 500)));

  const results = [];
  const push = (entry) => results.push(entry);

  const visit = async (path, label) => {
    const t0 = Date.now();
    const entry = { path, label, status: null, ms: 0, issues: [], denied: false, ok: true };
    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
      entry.status = resp ? resp.status() : null;
      await page.waitForTimeout(1600);
      const boundary = await page.locator('h1', { hasText: 'Something went wrong' }).count().catch(() => 0);
      if (boundary > 0) entry.issues.push('ErrorBoundary rendered');
      if (entry.status !== null && entry.status >= 400) entry.issues.push('HTTP ' + entry.status);
      if (entry.status === 403 || entry.status === 404) entry.denied = true;
      if (user.denyIsError && entry.status >= 500) entry.ok = false;
      if (!user.denyIsError && (entry.status !== 200 || boundary > 0)) entry.ok = false;
      if (user.denyIsError && boundary > 0) entry.ok = false;
    } catch (e) {
      entry.issues.push('ERROR: ' + String(e).slice(0, 400));
      entry.ok = false;
    }
    entry.ms = Date.now() - t0;
    push(entry);
  };

  try {
    await page.goto(BASE + '/login', { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('#email', { timeout: 30000 });
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    await page.waitForSelector('[data-slot="sidebar"]', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Expand every collapsible sidebar group so child links are in the DOM
    const toggles = page.locator('[data-slot="sidebar"] button:has(svg.lucide-chevron-down)');
    const toggleCount = await toggles.count().catch(() => 0);
    for (let i = 0; i < toggleCount; i++) {
      await toggles.nth(i).click({ timeout: 2500 }).catch(() => {});
    }
    await page.waitForTimeout(700);

    // Every sidebar link (top-level + expanded children)
    const hrefs = await page.$$eval('[data-slot="sidebar"] a[href]', (els) => els.map((a) => a.getAttribute('href')).filter(Boolean));
    const unique = [...new Set(hrefs.map((h) => { try { return new URL(h, BASE).pathname; } catch { return null; } }))]
      .filter(Boolean).filter((h) => h.startsWith('/'));

    // Direction checks on key dashboard pages
    for (const path of RTL_PAGES) {
      await visit(path, 'RTL check ' + path);
      const dir = await page.evaluate(() => document.documentElement.dir).catch(() => '?');
      const last = results[results.length - 1];
      if (dir !== 'rtl') { last.issues.push('dir=' + dir + ' (expected rtl)'); last.ok = false; }
      else last.issues.push('dir=rtl OK');
    }

    // Translation spot-checks
    for (const tc of TRANSLATION_CHECKS) {
      await visit(tc.path, 'translation check ' + tc.label);
      const found = await page.getByText(tc.arText, { exact: false }).count().catch(() => 0);
      const last = results[results.length - 1];
      if (found === 0) { last.issues.push('Arabic text not found: ' + tc.arText); last.ok = false; }
      else last.issues.push('Arabic text found: ' + tc.arText);
    }

    // Visit every collected sidebar link
    for (const href of unique) {
      await visit(href, 'sidebar ' + href);
    }

    // Interactive checks (non-destructive): tabs + create-page navigation
    const interact = async (path, label, fn) => {
      const t0 = Date.now();
      const entry = { path, label, status: null, ms: 0, issues: [], ok: true };
      try {
        const resp = await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
        entry.status = resp ? resp.status() : null;
        await page.waitForTimeout(1200);
        await fn(page, entry);
        const boundary = await page.locator('h1', { hasText: 'Something went wrong' }).count().catch(() => 0);
        if (boundary > 0) { entry.issues.push('ErrorBoundary rendered'); entry.ok = false; }
      } catch (e) {
        entry.issues.push('ERROR: ' + String(e).slice(0, 300));
        entry.ok = false;
      }
      entry.ms = Date.now() - t0;
      push(entry);
    };

    const INTERACTIONS = [
      {
        path: '/stores/1/settings',
        label: 'interaction settings tabs',
        fn: async (pg, entry) => {
          const tabs = pg.locator('[role="tab"]');
          const n = await tabs.count();
          if (n < 2) { entry.issues.push('tabs not found (' + n + ')'); entry.ok = false; return; }
          for (let i = 0; i < n; i++) {
            await tabs.nth(i).click({ timeout: 3000 }).catch((e) => entry.issues.push('tab click fail: ' + e.message.slice(0, 120)));
            await pg.waitForTimeout(600);
          }
        },
      },
      {
        path: '/stores/1/appearance',
        label: 'interaction appearance editor',
        fn: async (pg, entry) => {
          await pg.waitForTimeout(1500);
        },
      },
    ];

    if (user.name === 'company') {
      INTERACTIONS.push(      {
        path: '/products',
        label: 'interaction products -> create',
        fn: async (pg, entry) => {
          const createLink = pg.locator('a[href$="/products/create"], a[href*="/products/create"]').first();
          const createBtn = pg.locator('button:has-text("Create"), button:has-text("New"), button:has-text("إنشاء"), button:has-text("إضافة")').first();
          let clicked = false;
          if (await createLink.count()) { await createLink.click({ timeout: 3000 }); clicked = true; }
          else if (await createBtn.count()) { await createBtn.click({ timeout: 3000 }); clicked = true; }
          if (!clicked) { entry.issues.push('create button not found'); entry.ok = false; return; }
          await pg.waitForTimeout(1500);
          const url = pg.url();
          if (!url.includes('/create')) { entry.issues.push('did not reach create page: ' + url); entry.ok = false; }
        },
      },
      {
        path: '/dashboard',
        label: 'interaction guide tour',
        fn: async (pg, entry) => {
          const helpBtn = pg.locator('button[title="Guide Tour"], button[title="الجولة الإرشادية"]').first();
          if (!(await helpBtn.count())) { entry.issues.push('help button not found'); entry.ok = false; return; }
          await helpBtn.click({ timeout: 3000 });
          const card = pg.locator('text=الخطوة 1 من');
          await card.first().waitFor({ timeout: 10000 }).catch(() => {});
          if (!(await card.count())) { entry.issues.push('tour card not visible'); entry.ok = false; return; }
          entry.issues.push('tour card visible (الخطوة 1)');
          const nextBtn = pg.locator('button:has-text("التالي")').first();
          if (await nextBtn.count()) {
            await nextBtn.click({ timeout: 3000 });
            await pg.waitForURL('**/products**', { timeout: 20000 }).catch(() => {});
            await pg.waitForTimeout(1200);
            const url = pg.url();
            if (!url.includes('/products')) { entry.issues.push('tour did not navigate to products: ' + url); entry.ok = false; }
            else entry.issues.push('tour navigated to /products');
          } else {
            entry.issues.push('next button not found');
            entry.ok = false;
          }
          const skipBtn = pg.locator('button:has-text("تخطي")').first();
          if (await skipBtn.count()) { await skipBtn.click({ timeout: 3000 }).catch(() => {}); }
        },
      });
    }

    for (const it of INTERACTIONS) {
      await interact(it.path, it.label, it.fn);
    }
  } catch (e) {
    push({ path: '/login', label: 'login', status: null, issues: ['LOGIN_FAILED: ' + String(e).slice(0, 400)], ok: false });
  }

  await context.close();

  const failed = results.filter((r) => !r.ok);
  report.users[user.name] = {
    loginOk: results.some((r) => r.label === 'login' || r.label.startsWith('sidebar') || r.label.startsWith('RTL')),
    results,
    consoleErrors: consoleErrors.slice(0, 60),
    pageErrors: pageErrors.slice(0, 20),
    failedCount: failed.length,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const report = { generated: new Date().toISOString(), base: BASE, users: {} };
  for (const user of USERS) {
    await runUser(browser, user, report);
  }
  await browser.close();

  fs.writeFileSync('scripts/audit-report.json', JSON.stringify(report, null, 2));

  console.log('=== AUDIT SUMMARY ===');
  for (const [name, u] of Object.entries(report.users)) {
    console.log(`\n[${name}] login=${u.loginOk} failed=${u.failedCount} consoleErrors=${u.consoleErrors.length} pageErrors=${u.pageErrors.length}`);
    for (const r of u.results) {
      if (!r.ok) {
        console.log(`  FAIL ${r.label} (${r.status}) ${r.issues.join(' | ')}`);
      }
    }
  }
  const anyFailed = Object.values(report.users).some((u) => u.failedCount > 0);
  console.log('\nRESULT: ' + (anyFailed ? 'FAILURES DETECTED (see above)' : 'ALL PAGES OK'));
}

main().catch((e) => { console.error('AUDIT CRASHED:', e); process.exit(1); });
