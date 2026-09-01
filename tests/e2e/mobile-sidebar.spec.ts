import { test, expect, Page } from '@playwright/test';
import { E2E_MERCHANT } from './fixtures/auth';

async function loginAsMerchantUi(page: Page) {
  await page.goto('http://127.0.0.1:8000/login', { waitUntil: 'networkidle' });
  const email = page.getByLabel(/البريد الإلكتروني|Email/i).first();
  const pass = page.getByLabel(/كلمة السر|Password/i).first();
  await email.fill(E2E_MERCHANT.email);
  await pass.fill(E2E_MERCHANT.password);
  const submit = page.getByRole('button', { name: /تسجيل الدخول|Log in/i });
  await submit.click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

const MOBILE_WIDTHS = [320, 360, 390, 430];

test.describe('Merchant mobile sidebar navigation', () => {
  for (const width of MOBILE_WIDTHS) {
    test(`mobile ${width}px: trigger visible & clickable, drawer opens, closes via Esc and on route select`, async ({ page }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width, height: 900 });
      await loginAsMerchantUi(page);

      const trigger = page.locator('[data-sidebar="trigger"]:visible').first();
      await expect(trigger).toBeVisible({ timeout: 15000 });

      // Regression guard #1: nothing may cover the hamburger — its center must hit the trigger itself
      const covered = await page.evaluate(() => {
        const el = document.querySelector('[data-sidebar="trigger"]');
        if (!el) return true;
        const b = el.getBoundingClientRect();
        const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return top !== el && !el.contains(top as Node);
      });
      expect(covered).toBe(false);

      // No horizontal overflow at this width
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflowX).toBe(false);

      // Desktop static sidebar must not be forced on mobile
      await expect(page.locator('[data-slot="sidebar"][data-mobile="true"]')).not.toBeVisible();

      // Open the drawer
      await trigger.click();
      const drawer = page.locator('[data-sidebar="sidebar"][data-mobile="true"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });
      await expect(drawer.getByRole('link', { name: /لوحة التحكم/ })).toBeVisible();
      await expect(drawer.getByRole('link', { name: /المنتجات/ })).toBeVisible();
      await expect(drawer.getByRole('link', { name: /الطلبات/ })).toBeVisible();

      // Close via Escape
      await page.keyboard.press('Escape');
      await expect(drawer).not.toBeVisible({ timeout: 5000 });

      // Reopen and navigate via drawer: drawer must dismiss on route select
      await trigger.click();
      await expect(drawer).toBeVisible({ timeout: 5000 });
      await drawer.getByRole('link', { name: /المنتجات/ }).click();
      await page.waitForURL(/\/products($|\/)/, { timeout: 15000 });
      await expect(drawer).not.toBeVisible({ timeout: 5000 });
    });
  }
});

test.describe('Merchant desktop sidebar navigation', () => {
  test('desktop 1440px: static sidebar visible, mobile trigger hidden, header intact', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await loginAsMerchantUi(page);

    // Static (non-mobile) sidebar is rendered and visible
    const staticSidebar = page.locator('[data-slot="sidebar"]:not([data-mobile="true"])');
    await expect(staticSidebar.first()).toBeVisible({ timeout: 15000 });

    // Merchant two-column nav present (primary column with dashboard item)
    await expect(page.locator('nav[aria-label]').getByRole('link', { name: /لوحة التحكم/ }).first()).toBeVisible();

    // Mobile-only trigger hidden on desktop
    const mobileTrigger = page.locator('[data-sidebar="trigger"].xl\\:hidden');
    await expect(mobileTrigger).not.toBeVisible();

    // Header store switcher keeps its full pill width on desktop
    const pill = page.getByRole('combobox');
    await expect(pill).toBeVisible();
    const pillWidth = await pill.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    expect(pillWidth).toBe(180);

    // No horizontal overflow
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflowX).toBe(false);
  });
});