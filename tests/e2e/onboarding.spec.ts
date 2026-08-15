import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding');
  });

  test('should display onboarding welcome step', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome');
    await expect(page.locator('button:has-text("Get Started")')).toBeVisible();
  });

  test('should complete store information step', async ({ page }) => {
    await page.click('button:has-text("Get Started")');
    
    await page.fill('input[name="store_name"]', 'Test Store');
    await page.fill('input[name="store_subdomain"]', 'test-store');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.selectOption('select[name="timezone"]', 'UTC');
    
    await page.click('button:has-text("Next")');
    
    await expect(page.locator('h2')).toContainText('Plan Selection');
  });

  test('should select a plan and proceed', async ({ page }) => {
    await page.goto('/onboarding');
    await page.click('button:has-text("Get Started")');
    await page.fill('input[name="store_name"]', 'Test Store');
    await page.fill('input[name="store_subdomain"]', 'test-store-2');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.selectOption('select[name="timezone"]', 'UTC');
    await page.click('button:has-text("Next")');
    
    await page.click('button:has-text("Start Free Trial")');
    await page.click('button:has-text("Next")');
    
    await expect(page.locator('h2')).toContainText('Account Setup');
  });

  test('should create admin account', async ({ page }) => {
    await page.goto('/onboarding');
    await page.click('button:has-text("Get Started")');
    await page.fill('input[name="store_name"]', 'Test Store');
    await page.fill('input[name="store_subdomain"]', 'test-store-3');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.selectOption('select[name="timezone"]', 'UTC');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Start Free Trial")');
    await page.click('button:has-text("Next")');
    
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@teststore.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="password_confirmation"]', 'SecurePass123!');
    
    await page.click('button:has-text("Create Account")');
    
    await expect(page.locator('h2')).toContainText('Welcome');
  });

  test('should complete onboarding and redirect to dashboard', async ({ page }) => {
    await page.goto('/onboarding');
    await page.click('button:has-text("Get Started")');
    await page.fill('input[name="store_name"]', 'Test Store');
    await page.fill('input[name="store_subdomain"]', 'test-store-final');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.selectOption('select[name="timezone"]', 'UTC');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Start Free Trial")');
    await page.click('button:has-text("Next")');
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@teststore-final.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="password_confirmation"]', 'SecurePass123!');
    await page.click('button:has-text("Create Account")');
    
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});