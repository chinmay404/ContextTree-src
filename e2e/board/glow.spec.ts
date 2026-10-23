import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const DESK = '.desk[data-chat="side"]';
const slow = '?firstTokenMs=1500&wordMs=120';
const ask = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => window.__board!.select('side'));
  await page.locator('[data-id="side"] .compose textarea').fill('And annual plans?');
  await page.keyboard.press('Enter');
};

test('the desk glows while its chat is answering and stops when it is done', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page, slow);
  await expect(page.locator(DESK)).not.toHaveClass(/running/);
  await ask(page);
  await expect(page.locator(DESK)).toHaveClass(/running/);
  expect(await page.locator(DESK).evaluate((e) => getComputedStyle(e).animationName)).toBe('pb-glow');
  expect(await page.locator(DESK).evaluate((e) => getComputedStyle(e).animationDuration)).toBe('1.6s');
  await expect(page.locator('.desk.running')).toHaveCount(1);   // only the chat that is answering
  await page.waitForTimeout(400);
  await page.mouse.move(700, 880);
  await page.screenshot({ path: shot('desk-glow') });
  await expect(page.locator(DESK)).not.toHaveClass(/running/, { timeout: 15000 });
  expect(await page.locator(DESK).evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  expect(errs).toEqual([]);
});

test('an error stops the glow too', async ({ page }) => {
  await openBoard(page, slow);
  await page.evaluate(() => window.__mock!.failNext('streamChat', new (window.__mock!.constructor as unknown as { ApiError: new (s: number, c: string) => never }).ApiError(500, 'boom')));
  await ask(page);
  await expect(page.locator('[data-id="side"] .err')).toBeVisible({ timeout: 10000 });
  await expect(page.locator(DESK)).not.toHaveClass(/running/);
});

test('reduced motion: a steady accent rim, no pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page, slow);
  await ask(page);
  await expect(page.locator(DESK)).toHaveClass(/running/);
  expect(await page.locator(DESK).evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  expect(await page.locator(DESK).evaluate((e) => getComputedStyle(e).boxShadow)).toContain('rgba(0, 113, 227, 0.4)');
});

test('zoomed out the chat label carries an accent dot while it answers', async ({ page }) => {
  await openBoard(page, slow);
  await ask(page);
  await expect(page.locator(DESK)).toHaveClass(/running/);
  await page.evaluate(() => window.__board!.camSnap(300, 300, 0.3));
  await page.waitForTimeout(300);
  const dot = await page.locator('[data-id="side"] .maplabel .rundot').evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, w: getComputedStyle(e).width }));
  expect(dot).toEqual({ bg: 'rgb(0, 113, 227)', w: '8px' });
  await page.screenshot({ path: shot('desk-glow-map') });
});
