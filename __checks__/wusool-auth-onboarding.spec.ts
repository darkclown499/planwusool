import { test, expect } from '@playwright/test'

test('Wusool login page is accessible and interactive', async ({ page }) => {
  const targetUrl = process.env.ENVIRONMENT_URL ?? 'https://wusool.ps'
  await page.goto(`${targetUrl}/login`)

  await expect(page).toHaveURL(/\/login/)

  const emailInput = page.locator('input[type="email"], input[name="email"], input[type="text"]').first()
  await expect(emailInput).toBeVisible()

  const passwordInput = page.locator('input[type="password"]').first()
  await expect(passwordInput).toBeVisible()

  const submitButton = page.locator('button[type="submit"]').first()
  await expect(submitButton).toBeVisible()
})
