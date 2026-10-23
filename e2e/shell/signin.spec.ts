import { test, expect } from '@playwright/test';

// Needs the app running with NEXT_PUBLIC_BOARD_V3=1.
test('sign-in sheet shows the V3 content', async ({ page }) => {
  await page.goto('/auth/signin');
  await expect(page.getByRole('heading', { name: 'Sign in to Context Tree' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue with Google/ })).toBeVisible();
  await expect(page.getByText('We store your boards and your encrypted API keys. Never sold, never used for training.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Privacy' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Terms' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'contexttree.tech' })).toHaveAttribute('href', '/');
});

test('?error= shows the provider error text', async ({ page }) => {
  await page.goto('/auth/signin?error=OAuthCallback');
  await expect(page.locator('.si-err')).toHaveText('Error handling response from provider.');
});

test('no horizontal scroll at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/auth/signin');
  await expect(page.getByRole('heading', { name: 'Sign in to Context Tree' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
