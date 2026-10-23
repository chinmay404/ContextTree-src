import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Needs the app running with NEXT_PUBLIC_BOARD_V3=1. A first-time visitor: no stored tour state.
test.use({ storageState: { cookies: [], origins: [] } });

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const EMPTY = '/boards?api=mock&mock=empty';
const boardCount = (page: Page) => page.evaluate(async () => (await window.__mock!.listBoards()).length);
const box = (page: Page) => page.getByRole('textbox', { name: 'What are you trying to figure out?' });

test('first visit: empty desk, the question waits for a key, then the board is made and asks', async ({ page }) => {
  await page.goto(EMPTY);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome, Sam');
  await expect(box(page)).toBeVisible();
  await expect(page.getByText('Answers need an API key from any provider')).toBeVisible();
  await page.screenshot({ path: shot('task21-1-empty') });

  await box(page).fill('Is a heat pump worth it?');
  await box(page).press('Enter');
  const sheet = page.getByRole('dialog', { name: 'Settings' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'API keys' })).toBeVisible();
  expect(await boardCount(page)).toBe(0);
  await page.screenshot({ path: shot('task21-2-keys-sheet') });

  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(box(page)).toHaveValue('Is a heat pump worth it?');
  await expect(page.getByText('Add a key to get an answer. Your question is kept.')).toBeVisible();
  await page.screenshot({ path: shot('task21-3-kept') });

  await box(page).press('Enter');
  await expect(sheet).toBeVisible();
  await sheet.locator('.prow[data-provider="google"]').getByRole('button', { name: 'Add key' }).click();
  await page.getByLabel('Google API key').fill('AIza-good-1234');
  await page.getByRole('button', { name: 'Save key' }).click();

  await expect(page).toHaveURL(/\/b\/b_[a-z0-9]+_[a-z0-9]{6}/);
  expect(await boardCount(page)).toBe(1);
  const model = await page.evaluate(async () => {
    const id = location.pathname.split('/').pop()!;
    const b = await window.__mock!.getBoard(id);
    return (b.cards.find((c) => c.id === `${id}_q1`)!.data as { model: string }).model;
  });
  expect(model).toBe('gemini/gemini-3-flash-preview');
  const tour = page.locator('[data-pb="tour"]');
  await expect(tour.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: shot('task21-4-tour') });
  await page.keyboard.press('Escape');
  await expect(tour.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-id$="_q1"] .qb')).toHaveText('Is a heat pump worth it?');
  await expect(page.locator('[data-id$="_q1"] .ans').last()).toBeVisible();
  await page.screenshot({ path: shot('task21-5-asked') });

  // the tour does not come back on the next board
  await page.goto('/boards?api=mock');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('with a key, Enter twice quickly makes exactly one board', async ({ page }) => {
  await page.goto('/boards?api=mock&keys=all&mock=empty');
  await expect(box(page)).toBeVisible();
  await box(page).fill('One question');
  await box(page).press('Enter');
  await box(page).press('Enter').catch(() => undefined);
  await expect(page).toHaveURL(/\/b\/b_/);
  expect(await boardCount(page)).toBe(1);
});

test('Shift+Enter is a newline and does not submit', async ({ page }) => {
  await page.goto(EMPTY);
  await box(page).fill('line one');
  await box(page).press('Shift+Enter');
  await box(page).pressSequentially('line two');
  await expect(box(page)).toHaveValue('line one\nline two');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
});
