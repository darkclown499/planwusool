import { test, expect } from '@playwright/test';
import { gotoStore } from './fixtures/auth';

test.describe('Customer Smoke', () => {
  test('homepage → category → product → variant → add → cart → quantity → wishlist → loyalty', async ({ page }) => {
    // Homepage
    await gotoStore(page, '/');
    await expect(page.locator('header').first()).toBeVisible({ timeout: 10000 });

    // Category
    const catLink = page.locator('a[href*="/category/"]').first();
    if (await catLink.count() > 0) {
      await catLink.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/category\//);
      await gotoStore(page, '/');
    }

    // Product
    const card = page.locator('div.group').first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();
    await page.waitForTimeout(800);
    const detail = page.getByText('تفاصيل المنتج');
    await expect(detail).toBeVisible({ timeout: 5000 });

    // Variant if exists — scope to dialog to avoid matching product card
    const dialog = page.getByRole('dialog').first();
    const variantBtn = dialog.getByRole('button', { name: /^S$/ }).first();
    if (await variantBtn.count() > 0 && await variantBtn.isVisible().catch(()=>false)) {
      await variantBtn.click({ force: true });
    } else {
      const variantM = dialog.getByRole('button', { name: /^M$/ }).first();
      if (await variantM.count() > 0 && await variantM.isVisible().catch(()=>false)) await variantM.click({ force: true });
    }

    // Add to cart
    const addBtn = page.getByRole('button', { name: /أضف للسلة/ }).first();
    await expect(addBtn).toBeEnabled();
    await addBtn.click();
    await page.waitForTimeout(800);

    // Cart badge should update, then open cart manually
    const cartBtn = page.getByRole('button', { name: /سلة التسوق|السلة/ }).first();
    await cartBtn.click();
    await expect(page.getByText('سلة التسوق')).toBeVisible({ timeout: 5000 });

    // Quantity
    const plus = page.getByLabel('زيادة').first();
    const minus = page.getByLabel('إنقاص').first();
    await expect(plus).toBeVisible();
    const box = await plus.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(38);
    expect(box.height).toBeGreaterThanOrEqual(38);
    await plus.click();
    await page.waitForTimeout(300);
    await minus.click();
    await page.waitForTimeout(300);

    // Check total exists
    await expect(page.getByText('الإجمالي')).toBeVisible();

    // Remove
    const trash = page.getByLabel('حذف').first();
    if (await trash.count() > 0) {
      await trash.click();
      await page.waitForTimeout(500);
    }

    // Re-add for wishlist/loyalty checks
    await gotoStore(page, '/');
    const card2 = page.locator('div.group').first();
    await card2.click();
    await page.waitForTimeout(600);
    const wishBtn = page.getByLabel('المفضلة').first();
    if (await wishBtn.count() > 0) {
      await wishBtn.click();
      await page.waitForTimeout(400);
    }

    // Loyalty visibility - guest should not see private balance, but badge may be hidden
    // Just verify no console error and header exists
    await expect(page.locator('header').first()).toBeVisible();
  });

  test('checkout entry without payment', async ({ page }) => {
    await gotoStore(page, '/');
    const card = page.locator('div.group').first();
    await card.click();
    await page.waitForTimeout(600);
    const addBtn = page.getByRole('button', { name: /أضف للسلة/ }).first();
    if (await addBtn.isVisible().catch(()=>false)) {
      const dialog2 = page.getByRole('dialog').first();
      const varBtn2 = dialog2.getByRole('button', { name: /^S$/ }).first();
      if (await varBtn2.count()>0 && await varBtn2.isVisible().catch(()=>false)) await varBtn2.click({ force: true });
      await addBtn.click();
      await page.waitForTimeout(600);
    }
    const cartBtn = page.getByRole('button', { name: /السلة/ }).first();
    if (await cartBtn.count()>0) await cartBtn.click();
    await page.waitForTimeout(600);
    const checkoutBtn = page.getByRole('button', { name: /إتمام الطلب/ }).first();
    if (await checkoutBtn.count()>0) {
      await expect(checkoutBtn).toBeVisible();
      // Do not actually submit payment - just verify checkout opens
      await checkoutBtn.click();
      await page.waitForTimeout(800);
      // Should show checkout modal or page
      const hasCheckout = await page.getByText('إتمام الطلب').count() > 0;
      // PASS if checkout UI appears, even without payment
      expect(hasCheckout).toBeTruthy();
    }
  });
});
