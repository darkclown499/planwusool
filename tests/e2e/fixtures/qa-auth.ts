import { expect, Page } from '@playwright/test';

// Durable QA-fixture credentials. The server-side state is created by:
//   php artisan qa:fixture --env=testing [--products=N] [--orders=N] [--shipping] [--payment]
// See app/Console/Commands/QaFixtureCommand.php and tests/Support/Qa/QaFixtureBuilder.php.
// Unlike the legacy TestSeeder merchant, this fixture is composable, reset by
// `php artisan qa:fixture --reset`, and strictly namespaced to @qa.example.test.

export const QA_MERCHANT = {
  email: process.env.QA_MERCHANT_EMAIL || 'merchant@qa.example.test',
  password: process.env.QA_MERCHANT_PASSWORD || 'password',
};

export const QA_STORE_SLUG = process.env.QA_STORE_SLUG || 'qa-store';
export const QA_DASHBOARD_URL = 'http://127.0.0.1:8000/dashboard';
export const QA_LOGIN_URL = 'http://127.0.0.1:8000/login';

export async function loginAsQaMerchant(page: Page): Promise<void> {
  await page.goto(QA_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.getByLabel(/Email/i).first().fill(QA_MERCHANT.email);
  await page.getByLabel(/Password/i).first().fill(QA_MERCHANT.password);
  await page.getByRole('button', { name: /Log in|تسجيل الدخول/i }).first().click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page).toHaveURL(/\/(dashboard|plans)/);
}