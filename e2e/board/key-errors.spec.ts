import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const ask = async (page: import('@playwright/test').Page, id: string, text: string) => {
  await page.evaluate((i) => window.__board!.select(i), id);   // the composer shows on the selected card
  await page.locator(`[data-id="${id}"] .compose textarea`).fill(text);
  await page.keyboard.press('Enter');
};
const board = (page: import('@playwright/test').Page, q = '') => openBoard(page, `?keys=1&firstTokenMs=0&wordMs=0${q}`);

test('a missing key says which key, and Add key asks the shell to open the keys sheet', async ({ page }) => {
  const errs = trackErrors(page);
  await board(page);
  await page.evaluate(() => window.__mock!.setKeys([]));
  await ask(page, 'side', 'And what about annual plans?');
  const err = page.locator('[data-id="side"] .err.keyerr');
  await expect(err).toContainText('Add your OpenAI key to get an answer from GPT-5 mini.');
  await expect(page.locator('[data-id="side"] .qb', { hasText: 'annual plans' })).toHaveCount(0);   // the unanswered question is not kept
  await page.locator('[data-id="side"]').screenshot({ path: shot('key-error-card') });
  await err.locator('[data-act="addkey"]').click();
  expect(await page.evaluate(() => window.__openSettings!.calls)).toEqual(['openai']);
  expect(errs).toEqual([]);
});

test('saving the key re-asks the question on its own', async ({ page }) => {
  await board(page);
  await page.evaluate(() => window.__mock!.setKeys([]));
  await ask(page, 'side', 'And what about annual plans?');
  await expect(page.locator('[data-id="side"] .keyerr')).toBeVisible();
  await page.evaluate(() => { window.__mock!.setKeys('all'); window.__keySaved!('openai'); });
  await expect(page.locator('[data-id="side"] .keyerr')).toHaveCount(0);
  await expect(page.locator('[data-id="side"] .qb', { hasText: 'annual plans' })).toHaveCount(1);
  await expect(page.locator('[data-id="side"] .ans').last()).toContainText('Reading');
});

test('a key saved for another provider leaves the error and the question alone', async ({ page }) => {
  await board(page);
  await page.evaluate(() => window.__mock!.setKeys([]));
  await ask(page, 'side', 'Q?');
  await expect(page.locator('[data-id="side"] .keyerr')).toBeVisible();
  await page.evaluate(() => { window.__mock!.setKeys('all'); window.__keySaved!('google'); });
  await page.waitForTimeout(500);
  await expect(page.locator('[data-id="side"] .keyerr')).toBeVisible();
});

test('without a shell the error has no button; the focus view shows the same error with its button', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=0&wordMs=0');
  await page.evaluate(() => window.__mock!.setKeys([]));
  await ask(page, 'side', 'Q?');
  await expect(page.locator('[data-id="side"] .keyerr')).toContainText('Add your OpenAI key');
  await expect(page.locator('[data-id="side"] .keyerr button')).toHaveCount(0);
  await page.goto('/board-dev?keys=1&firstTokenMs=0&wordMs=0');
  await page.waitForFunction(() => !!window.__board && document.querySelectorAll('.card[data-id]').length >= 12);
  await page.evaluate(() => window.__mock!.setKeys([]));
  await page.evaluate(() => window.__board!.openFocus('side')); await page.waitForTimeout(700);
  await page.locator('[data-pb="focus"] .fcomp textarea').fill('Hello?');
  await page.keyboard.press('Enter');
  const err = page.locator('[data-pb="focus"] .keyerr');
  await expect(err).toContainText('Add your OpenAI key to get an answer from GPT-5 mini.');
  await page.screenshot({ path: shot('key-error-focus') });
  await err.locator('[data-act="addkey"]').click();
  expect(await page.evaluate(() => window.__openSettings!.calls)).toEqual(['openai']);
});
