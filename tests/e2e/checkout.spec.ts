import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a test store
    await page.goto('/test-store');
    
    // Add a product to cart
    await page.click('button:has-text("Add to Cart"):first');
    await page.waitForSelector('.cart-drawer');
  });

  test('should open cart drawer when product added', async ({ page }) => {
    await expect(page.locator('.cart-drawer')).toBeVisible();
    await expect(page.locator('.cart-drawer h2')).toContainText('Shopping Cart');
  });

  test('should update item quantity in cart', async ({ page }) => {
    const quantityInput = page.locator('.cart-drawer input[type="number"]').first();
    await quantityInput.fill('3');
    await page.waitForTimeout(500);
    
    await expect(page.locator('.cart-drawer .total')).toContainText('$');
  });

  test('should remove item from cart', async ({ page }) => {
    const removeButton = page.locator('.cart-drawer button[aria-label="Remove item"]').first();
    await removeButton.click();
    
    await expect(page.locator('.cart-drawer')).toContainText('Your cart is empty');
  });

  test('should proceed to checkout', async ({ page }) => {
    await page.click('button:has-text("Proceed to Checkout")');
    
    await expect(page).toHaveURL(/.*checkout/);
    await expect(page.locator('h1')).toContainText('Checkout');
  });

  test('should fill shipping information', async ({ page }) => {
    await page.goto('/test-store/checkout');
    
    await page.fill('input[name="first_name"]', 'John');
    await page.fill('input[name="last_name"]', 'Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.fill('input[name="address"]', '123 Main St');
    await page.fill('input[name="city"]', 'New York');
    await page.fill('input[name="state"]', 'NY');
    await page.fill('input[name="postal_code"]', '10001');
    await page.selectOption('select[name="country"]', 'US');
    
    await page.click('button:has-text("Continue to Shipping")');
    
    await expect(page).toHaveURL(/.*shipping/);
  });

  test('should select shipping method', async ({ page }) => {
    await page.goto('/test-store/checkout');
    
    // Fill minimal required info
    await page.fill('input[name="first_name"]', 'John');
    await page.fill('input[name="last_name"]', 'Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.fill('input[name="address"]', '123 Main St');
    await page.fill('input[name="city"]', 'New York');
    await page.fill('input[name="state"]', 'NY');
    await page.fill('input[name="postal_code"]', '10001');
    await page.selectOption('select[name="country"]', 'US');
    
    await page.click('button:has-text("Continue to Shipping")');
    
    // Select shipping method
    await page.click('input[name="shipping_method"]:first');
    await page.click('button:has-text("Continue to Payment")');
    
    await expect(page).toHaveURL(/.*payment/);
  });

  test('should complete payment with Stripe', async ({ page }) => {
    await page.goto('/test-store/checkout');
    
    // Fill minimal required info
    await page.fill('input[name="first_name"]', 'John');
    await page.fill('input[name="last_name"]', 'Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.fill('input[name="address"]', '123 Main St');
    await page.fill('input[name="city"]', 'New York');
    await page.fill('input[name="state"]', 'NY');
    await page.fill('input[name="postal_code"]', '10001');
    await page.selectOption('select[name="country"]', 'US');
    
    await page.click('button:has-text("Continue to Shipping")');
    await page.click('input[name="shipping_method"]:first');
    await page.click('button:has-text("Continue to Payment")');
    
    // Select Stripe
    await page.click('button:has-text("Credit Card (Stripe)")');
    
    // Fill Stripe test card
    const iframe = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await iframe.locator('input[name="cardnumber"]').fill('4242424242424242');
    await iframe.locator('input[name="exp-date"]').fill('12/30');
    await iframe.locator('input[name="cvc"]').fill('123');
    await iframe.locator('input[name="postal"]').fill('10001');
    
    await page.click('button:has-text("Pay Now")');
    
    await expect(page).toHaveURL(/.*order-confirmation/);
    await expect(page.locator('h1')).toContainText('Order Confirmed');
  });
});