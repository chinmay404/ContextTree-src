import { test, expect } from '@playwright/test';

test('dev page is reachable without signing in', async ({ page }) => {
  const res = await page.goto('/board-dev');
  expect(res!.status()).toBe(200);
  expect(page.url()).toContain('/board-dev');
});
