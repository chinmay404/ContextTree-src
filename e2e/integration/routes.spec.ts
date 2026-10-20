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

const deletes = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'deleteBoard').length);

async function deleteFirstRow(page: import('@playwright/test').Page) {
  const rows = page.locator('[data-board-row]');
  await expect(rows.first()).toBeVisible();
  await rows.first().getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete board' }).click();
}

test('the Undo window expiring sends exactly one DELETE', async ({ page }) => {
  await page.clock.install();
  await page.goto('/boards?api=mock');
  await deleteFirstRow(page);
  expect(await deletes(page)).toBe(0);
  await page.clock.runFor(9_000);
  expect(await deletes(page)).toBe(0);
  await page.clock.runFor(1_500);
  await expect.poll(() => deletes(page)).toBe(1);
  await page.clock.runFor(20_000);
  expect(await deletes(page)).toBe(1);
});

test('leaving /boards inside the Undo window flushes the DELETE once', async ({ page }) => {
  await page.clock.install();
  await page.goto('/boards?api=mock');
  await deleteFirstRow(page);
  expect(await deletes(page)).toBe(0);
  await page.getByRole('button', { name: 'New board' }).click();
  await expect(page).toHaveURL(/\/b\/b_[a-z0-9]+_[a-z0-9]{6}/);
  expect(await deletes(page)).toBe(1);
  await page.clock.runFor(20_000);
  expect(await deletes(page)).toBe(1);
});

test('Escape closes the delete confirm sheet without deleting', async ({ page }) => {
  await page.goto('/boards?api=mock');
  await page.locator('[data-board-row]').first().getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await deletes(page)).toBe(0);
});
