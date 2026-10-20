import { test, expect } from '@playwright/test';

// Runs against `next dev` with ?api=mock (dev-only MockEngineApi, no engine, no session).

test('/b/b_seed renders the seed board with 4 chats', async ({ page }) => {
  await page.goto('/b/b_seed?api=mock');
  await expect(page.locator('[data-board="b_seed"]')).toBeVisible();
  await expect(page.locator('[data-board="b_seed"] .card.chat')).toHaveCount(4);
});

test('body paints the Pebble board colour, not the V2 dark background', async ({ page }) => {
  await page.goto('/b/b_seed?api=mock');
  await expect(page.locator('.pb-root')).toBeVisible();
  // The scope applies after hydration; the SSR paint is still the app's dark background.
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(237, 232, 245)');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('a missing board says so', async ({ page }) => {
  await page.goto('/b/missing?api=mock');
  await expect(page.getByText("This board doesn't exist or isn't yours")).toBeVisible();
  await expect(page.getByRole('link', { name: 'Your boards' })).toBeVisible();
});

test('New board creates a board and opens it', async ({ page }) => {
  await page.goto('/boards?api=mock');
  await page.getByRole('button', { name: 'New board' }).click();
  await expect(page).toHaveURL(/\/b\/b_[a-z0-9]+_[a-z0-9]{6}/);
  await expect(page.locator('.pb-root')).toBeVisible();
});

test('rename, delete with confirm, and Undo', async ({ page }) => {
  await page.goto('/boards?api=mock');
  const rows = page.locator('[data-board-row]');
  await expect(rows.first()).toBeVisible();
  const before = await rows.count();

  await rows.first().getByRole('button', { name: 'Rename' }).click();
  const input = page.getByRole('textbox', { name: 'Board name' });
  await input.fill('Renamed by test');
  await input.press('Enter');
  await expect(page.getByText('Renamed by test')).toBeVisible();

  await rows.first().getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete board' }).click();
  await expect(rows).toHaveCount(before - 1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(rows).toHaveCount(before);
  await expect(page.getByText('Renamed by test')).toBeVisible();
});
