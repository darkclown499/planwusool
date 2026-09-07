import { expect, type Page } from '@playwright/test';

// Durable QA-fixture credentials. The server-side state is created by:
//   php artisan qa:fixture --env=testing [--products=N] [--orders=N] [--shipping] [--payment]
// See app/Console/Commands/QaFixtureCommand.php and tests/Support/Qa/QaFixtureBuilder.php.
// Unlike the legacy TestSeeder merchant, this fixture is composable, reset by
// `php artisan qa:fixture --reset`, and strictly namespaced to @qa.example.test.

export interface QaAuthOptions {
  /** Login page URL. Defaults to QA_LOGIN_URL. */
  url?: string;
  /** Merchant email override. Defaults to QA_MERCHANT.email. */
  email?: string;
  /** Merchant password override. Defaults to QA_MERCHANT.password. */
  password?: string;
}

export const QA_MERCHANT = {
  email: process.env.QA_MERCHANT_EMAIL || 'merchant@qa.example.test',
  password: process.env.QA_MERCHANT_PASSWORD || 'password',
};

export const QA_STORE_SLUG = process.env.QA_STORE_SLUG || 'qa-store';
export const QA_BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:8000';
export const QA_DASHBOARD_URL = `${QA_BASE_URL}/dashboard`;
export const QA_LOGIN_URL = `${QA_BASE_URL}/login`;

export async function loginAsQaMerchant(page: Page, options: QaAuthOptions = {}): Promise<void> {
  const loginUrl = options.url ?? QA_LOGIN_URL;
  const email = options.email ?? QA_MERCHANT.email;
  const password = options.password ?? QA_MERCHANT.password;

  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // The canonical UI is Arabic-primary: the login fields render as
  // "البريد الإلكتروني*" / "كلمة السر*" and the submit button as
  // "تسجيل الدخول". Match both the Arabic and the English labels so the
  // helper works in any locale (browser locale / APP_LOCALE).
  await page.getByLabel(/البريد الإلكتروني|Email/i).first().fill(email);
  await page.getByLabel(/كلمة السر|Password/i).first().fill(password);
  await page.getByRole('button', { name: /تسجيل الدخول|Sign in|Log in/i }).first().click();

  // Laravel redirects to the "intended" URL after login. When a guest visited
  // the pricing page before signing in that URL is "/plans" rather than
  // "/dashboard", so accept both.
  await page.waitForURL((url) => /^\/(dashboard|plans)\/?$/.test(url.pathname), { timeout: 15000 });
  await expect(page).toHaveURL(/\/(dashboard|plans)/);
}