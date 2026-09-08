import { test, expect } from '@playwright/test';
import { gotoStore, loginOnBazaar, openBazaarOrders } from './fixtures/auth';

/**
 * P4A-04 — Storefront UI correctness.
 *
 * 1. bazaar-market product cards must not nest interactive controls
 *    (wishlist <button> inside the image <button> was invalid HTML). The image
 *    and title areas are anchors that open the product detail; the wishlist is
 *    a sibling semantic <button> that must never trigger navigation.
 * 2. Customer order status labels (طلباتي list + order details) must be
 *    localized Arabic, never the raw internal status and never a raw unknown.
 *
 * Requires the testing DB seeded via `php artisan db:seed --class=TestSeeder
 * --env=testing` (includes one pending order owned by the E2E customer).
 */

const RAW_ORDER_STATUSES = /pending|confirmed|processing|shipped|delivered|cancelled|canceled|failed|refunded/i;

test.describe('P4A-04 storefront correctness', () => {
  test('bazaar product card uses valid interactive semantics', async ({ page }) => {
    await gotoStore(page, '/');

    const card = page.locator('.bazaar-card').first();
    await expect(card).toBeVisible({ timeout: 15000 });

    // No nested interactive controls anywhere in the card.
    await expect(card.locator('button button')).toHaveCount(0);
    await expect(card.locator('a button')).toHaveCount(0);
    await expect(card.locator('button a')).toHaveCount(0);

    // Image area is an anchor labelled with the product name.
    const imageAnchor = card.locator('a[aria-label]').first();
    await expect(imageAnchor).toBeVisible();

    // Product title is an anchor.
    await expect(card.locator('a.bazaar-card-title')).toHaveCount(1);

    // Wishlist is a semantic <button type="button">, NOT nested inside the anchor.
    const wish = card.locator('[data-testid^="bazaar-wishlist-"]');
    await expect(wish).toHaveCount(1);
    await expect(wish).toHaveAttribute('type', 'button');
    await expect(wish.locator('xpath=ancestor::a')).toHaveCount(0);
  });

  test('bazaar image anchor opens product detail without URL navigation', async ({ page }) => {
    await gotoStore(page, '/');

    const card = page.locator('.bazaar-card').first();
    await expect(card).toBeVisible({ timeout: 15000 });

    const urlBefore = page.url();
    await card.locator('a[aria-label]').first().click();
    await expect(page.getByTestId('bazaar-product-detail')).toBeVisible({ timeout: 8000 });
    expect(page.url()).toBe(urlBefore);
  });

  test('bazaar wishlist button toggles state without opening product detail', async ({ page }) => {
    await loginOnBazaar(page);

    const card = page.locator('.bazaar-card').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const wish = card.locator('[data-testid^="bazaar-wishlist-"]').first();

    const labelBefore = await wish.getAttribute('aria-label');
    const urlBefore = page.url();

    await wish.click();
    await page.waitForTimeout(600);

    // Product detail must NOT be open and the URL must not change.
    await expect(page.getByTestId('bazaar-product-detail')).toHaveCount(0);
    expect(page.url()).toBe(urlBefore);

    // Wishlist state toggled (added ↔ removal label).
    const wantedLabels = ['إضافة للمفضلة', 'إزالة من المفضلة'];
    await expect(wish).toHaveAttribute('aria-label', wantedLabels.find((l) => l !== labelBefore)!);
  });

  test('customer order status renders localized Arabic, never raw English', async ({ page }) => {
    await loginOnBazaar(page);

    // Open the "طلباتي" modal from the bazaar header (desktop) or drawer (mobile).
    await openBazaarOrders(page);

    // The seeded pending order appears with a localized status badge.
    const listStatus = page.getByTestId('customer-order-status').first();
    await expect(listStatus).toBeVisible({ timeout: 8000 });
    await expect(listStatus).toHaveText('قيد الانتظار');
    await expect(listStatus).not.toHaveText(RAW_ORDER_STATUSES);

    // Details modal shows the same localized status.
    await page.getByRole('button', { name: 'عرض التفاصيل' }).first().click();
    const detailStatus = page.getByTestId('customer-order-detail-status').first();
    await expect(detailStatus).toBeVisible({ timeout: 8000 });
    await expect(detailStatus).toHaveText('الحالة: قيد الانتظار');
    await expect(detailStatus).not.toHaveText(RAW_ORDER_STATUSES);
  });
});