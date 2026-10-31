import { test, expect, type Page } from '@playwright/test';
import { openBoard } from './helpers';

const SHOTS = process.env.PW_SHOTS;
const upload = async (page: Page, name: string) => {
  await page.click('[data-pb="add"]');
  const chooser = page.waitForEvent('filechooser');
  await page.click('[data-m="file"]');
  await (await chooser).setFiles({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
};

test('reading shows a turning arc on the tile, then a check, then the type icon', async ({ page }) => {
  await openBoard(page, '?ingestMs=1800');
  await upload(page, 'survey.pdf');
  const card = page.locator('.card.src.processing');
  await expect(card.locator('.tile .smark[data-state="reading"]')).toBeVisible();
  await expect(card.locator('.prog')).toHaveCount(0);
  await expect(card.locator('.meta')).toHaveText('Reading…');
  expect(await card.locator('.sm-arc').evaluate((el) => getComputedStyle(el).animationName)).toBe('sm-spin');
  const id = await card.getAttribute('data-id');
  const done = page.locator(`.card.src[data-id="${id}"] .tile .smark[data-state="done"]`);
  await expect(done).toBeVisible({ timeout: 8000 });
  await expect(done).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator(`.card.src[data-id="${id}"] .tile .i`)).toBeVisible();
});

test('a failed read shows the exclamation, and Retry still works', async ({ page }) => {
  await openBoard(page, '?ingestMs=200');
  await upload(page, 'broken.pdf');
  const failed = page.locator('.card.failed');
  await expect(failed.locator('.tile .smark[data-state="failed"]')).toBeVisible({ timeout: 6000 });
  await expect(failed.locator('[data-retry]')).toBeVisible();
});

test('a card that was already ready when the board loaded shows no check', async ({ page }) => {
  await openBoard(page);
  await page.waitForTimeout(300);
  await expect(page.locator('.smark')).toHaveCount(0);
});

test('reduced motion: nothing turns, and the check is simply there', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page, '?ingestMs=1200');
  await upload(page, 'survey.pdf');
  const card = page.locator('.card.src.processing');
  expect(await card.locator('.sm-arc').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  const glyph = page.locator('.smark[data-state="done"] .sm-glyph');
  await expect(glyph).toBeVisible({ timeout: 8000 });
  expect(await glyph.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

for (const theme of ['light', 'dark'] as const) {
  test(`the mark's states in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await openBoard(page, '?ingestMs=1200');
    await upload(page, 'survey.pdf');
    const card = page.locator('.card.src.processing');
    await expect(card.locator('.smark')).toBeVisible();
    const id = await card.getAttribute('data-id');
    if (SHOTS) await page.locator(`.card.src[data-id="${id}"]`).screenshot({ path: `${SHOTS}/mark-reading-${theme}.png` });
    await expect(page.locator(`.card.src[data-id="${id}"] .smark[data-state="done"]`)).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(600);
    if (SHOTS) await page.locator(`.card.src[data-id="${id}"]`).screenshot({ path: `${SHOTS}/mark-done-${theme}.png` });
  });
}
