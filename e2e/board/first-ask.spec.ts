import { test, expect } from '@playwright/test';
import { trackErrors } from './helpers';

const fresh = async (page: import('@playwright/test').Page, q: string) => {
  await page.goto(`/board-dev?fresh=1&firstTokenMs=0&wordMs=0&${q}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__board && document.querySelectorAll('.card[data-id]').length >= 1);
};

test('initialAsk is asked once in the first question of a new board', async ({ page }) => {
  const errs = trackErrors(page);
  await fresh(page, 'ask=Why%20is%20the%20sky%20blue%3F');
  await expect(page.locator('[data-id="b_fresh_q1"] .qb')).toHaveText('Why is the sky blue?');
  await expect(page.locator('[data-id="b_fresh_q1"] .qb')).toHaveCount(1);
  await page.waitForTimeout(600);
  await expect(page.locator('[data-id="b_fresh_q1"] .qb')).toHaveCount(1);   // not asked again
  expect(await page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'streamChat').length)).toBe(1);
  expect(errs).toEqual([]);
});

test('defaultModel is what a new question starts with', async ({ page }) => {
  await fresh(page, 'model=gemini');
  await page.evaluate(() => window.__board!.settle());
  await page.keyboard.press('q');
  await page.waitForFunction(() => window.__board!.dialog()?.mode === 'root');
  await expect(page.locator('[data-model="gemini"]').first()).toHaveAttribute('aria-pressed', 'true');
});

test('no initialAsk: nothing is sent', async ({ page }) => {
  await fresh(page, '');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'streamChat').length)).toBe(0);
});
