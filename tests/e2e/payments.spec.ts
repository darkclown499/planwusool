import { test, expect } from '@playwright/test';

test.describe('Payment Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@company.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');
    await page.waitForURL('**/dashboard');
  });

  test('should display available payment gateways on plans page', async ({ page }) => {
    await page.goto('/plans');
    
    await expect(page.locator('h1')).toContainText('Plans');
    await expect(page.locator('text=Stripe')).toBeVisible();
    await expect(page.locator('text=PayPal')).toBeVisible();
  });

  test('should process Stripe payment for plan upgrade', async ({ page }) => {
    await page.goto('/plans');
    
    // Click upgrade on a plan
    await page.click('button:has-text("Upgrade"):first');
    
    await expect(page).toHaveURL(/.*payments\/stripe/);
    
    // Fill payment form
    await page.fill('input[name="cardholder_name"]', 'John Doe');
    
    // Fill Stripe test card in iframe
    const iframe = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await iframe.locator('input[name="cardnumber"]').fill('4242424242424242');
    await iframe.locator('input[name="exp-date"]').fill('12/30');
    await iframe.locator('input[name="cvc"]').fill('123');
    await iframe.locator('input[name="postal"]').fill('10001');
    
    await page.click('button:has-text("Subscribe")');
    
    // Should redirect back to plans with success message
    await page.waitForURL('**/plans**');
    await expect(page.locator('.toast-success')).toContainText('Payment successful');
  });

  test('should process PayPal payment', async ({ page }) => {
    await page.goto('/plans');
    
    await page.click('button:has-text("Upgrade"):first');
    
    // Select PayPal
    await page.click('button:has-text("PayPal")');
    
    // Should redirect to PayPal
    await expect(page).toHaveURL(/paypal\.com/);
  });

  test('should process bank transfer payment', async ({ page }) => {
    await page.goto('/plans');
    
    await page.click('button:has-text("Upgrade"):first');
    
    // Select Bank Transfer
    await page.click('button:has-text("Bank Transfer")');
    
    // Fill bank transfer form
    await page.fill('input[name="account_holder"]', 'John Doe');
    await page.fill('input[name="bank_name"]', 'Test Bank');
    await page.fill('input[name="account_number"]', '1234567890');
    await page.fill('input[name="routing_number"]', '021000021');
    await page.fill('input[name="amount"]', '100');
    await page.setInputFiles('input[name="receipt"]', 'tests/fixtures/receipt.pdf');
    
    await page.click('button:has-text("Submit Payment")');
    
    await expect(page.locator('.toast-success')).toContainText('Payment submitted');
  });

  test('should handle failed payment gracefully', async ({ page }) => {
    await page.goto('/plans');
    
    await page.click('button:has-text("Upgrade"):first');
    
    // Use declined card
    const iframe = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await iframe.locator('input[name="cardnumber"]').fill('4000000000000002'); // Declined card
    await iframe.locator('input[name="exp-date"]').fill('12/30');
    await iframe.locator('input[name="cvc"]').fill('123');
    await iframe.locator('input[name="postal"]').fill('10001');
    
    await page.click('button:has-text("Subscribe")');
    
    await expect(page.locator('.toast-error')).toContainText('card was declined');
  });
});