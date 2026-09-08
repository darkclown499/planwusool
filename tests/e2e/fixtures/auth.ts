import { expect, Page } from '@playwright/test';

export const E2E_CUSTOMER = {
  email: process.env.E2E_CUSTOMER_EMAIL || 'test.customer@example.test',
  password: process.env.E2E_CUSTOMER_PASSWORD || 'password',
};

export const E2E_MERCHANT = {
  email: process.env.E2E_MERCHANT_EMAIL || 'test.merchant@example.test',
  password: process.env.E2E_MERCHANT_PASSWORD || 'password',
};

export const TEST_STORE_SLUG = 'e2e-test-store';
export const TEST_STORE_HOST = `${TEST_STORE_SLUG}.localhost`;
// Port overridable for machines where the default 8000 is occupied (Windows
// excluded-port ranges).
export const TEST_STORE_URL = `http://${TEST_STORE_HOST}:${process.env.E2E_STORE_PORT || '8000'}`;

export async function gotoStore(page: Page, path = '/') {
  await page.goto(TEST_STORE_URL + path, { waitUntil: 'domcontentloaded', timeout: 15000 });
}

export async function loginAsCustomer(page: Page) {
  // Customer storefront login is via POST /login on subdomain, but UI is modal
  // For E2E we use the storefront login modal flow
  await gotoStore(page, '/');
  // Open login modal via header
  const loginBtn = page.getByRole('button', { name: /تسجيل الدخول|دخول/i }).first();
  if (await loginBtn.count() > 0) {
    await loginBtn.click();
    await page.waitForTimeout(500);
  }
  // Fill modal
  const emailInput = page.getByLabel(/البريد/i).first();
  const passInput = page.getByLabel(/كلمة المرور/i).first();
  if (await emailInput.count() > 0) {
    await emailInput.fill(E2E_CUSTOMER.email);
    await passInput.fill(E2E_CUSTOMER.password);
    const submit = page.getByRole('button', { name: /دخول|تسجيل/i }).last();
    await submit.click();
    await page.waitForTimeout(1500);
  }
  // Verify
  await expect(page.locator('body')).not.toContainText('خطأ');
}

// Bazaar-market has no direct "تسجيل الدخول" header button on desktop; login is
// reached through the حسابي (account) action. On mobile the account section
// lives inside the hamburger drawer. The session triggers a full page reload.
export async function loginOnBazaar(page: Page) {
  await gotoStore(page, '/');
  // Storefront render gate so the viewport branch below is race-free.
  await expect(page.locator('.bazaar-card').first()).toBeVisible({ timeout: 20000 });

  const useDesktop = (page.viewportSize()?.width ?? 0) >= 700;
  if (useDesktop) {
    await page.getByRole('button', { name: 'حسابي' }).first().click();
  } else {
    await page.getByTestId('bazaar-hamburger').click();
    await page.getByTestId('bazaar-drawer-account-toggle').click();
    await page.getByTestId('bazaar-account-login').click();
  }

  const emailInput = page.getByPlaceholder('you@example.com');
  await expect(emailInput).toBeVisible({ timeout: 8000 });
  await emailInput.fill(E2E_CUSTOMER.email);
  await page.getByPlaceholder('••••••••').fill(E2E_CUSTOMER.password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  // Login reloads the page; wait until the storefront renders again.
  await expect(page.locator('.bazaar-card').first()).toBeVisible({ timeout: 20000 });
}

// Open the customer "طلباتي" modal using whichever surface matches the viewport
// (desktop header button, or the account section inside the mobile drawer).
export async function openBazaarOrders(page: Page) {
  if ((page.viewportSize()?.width ?? 0) >= 700) {
    await page.getByRole('button', { name: 'طلباتي' }).first().click();
  } else {
    await page.getByTestId('bazaar-hamburger').click();
    await page.getByTestId('bazaar-drawer-account-toggle').click();
    await page.getByTestId('bazaar-account-orders').click();
  }
}

export async function loginAsMerchant(page: Page) {
  await page.goto('http://127.0.0.1:8000/login', { waitUntil: 'networkidle' });
  await page.getByLabel(/Email/i).first().fill(E2E_MERCHANT.email);
  await page.getByLabel(/Password/i).first().fill(E2E_MERCHANT.password);
  await page.getByRole('button', { name: /Log in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
}
