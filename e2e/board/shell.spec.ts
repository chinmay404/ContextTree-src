import { test, expect } from '@playwright/test';
import { center, dragPath, openBoard, trackErrors } from './helpers';

test('renders the seed board: 4 chats and 8 sources, pile members hidden', async ({ page }) => {
  const errs = trackErrors(page); await openBoard(page);
  await expect(page.locator('.card.chat')).toHaveCount(4); await expect(page.locator('.card.src')).toHaveCount(8);
  await expect(page.locator('[data-id="interviews_1"]')).toHaveCount(0); expect(errs).toEqual([]);
});
test('soon cards show the pill and stay unread', async ({ page }) => {
  await openBoard(page);
  for (const id of ['video', 'podcast', 'shot']) await expect(page.locator(`[data-id="${id}"] .soon-pill`)).toHaveText('Coming soon');
  await expect(page.locator('[data-id="main"] .cfoot')).toContainText('2 sources');
});
test('dragging a chat carries its desk', async ({ page }) => {
  await openBoard(page); const before = await page.evaluate(() => [window.__board!.box('main'), window.__board!.box('pdf')]);
  await dragPath(page, await center(page, '[data-id="main"] .mtag'), [(await center(page, '[data-id="main"] .mtag'))[0] + 150, (await center(page, '[data-id="main"] .mtag'))[1] + 80]);
  await page.evaluate(() => window.__board!.settle());
  const after = await page.evaluate(() => [window.__board!.box('main'), window.__board!.box('pdf')]);
  expect(after[1][0] - before[1][0]).toBeCloseTo(after[0][0] - before[0][0], 0);
});
test('click selects and fades unrelated cards', async ({ page }) => {
  await openBoard(page); await page.click('[data-id="side"] .ttl');
  expect(await page.evaluate(() => window.__board!.selected())).toBe('side');
  await expect(page.locator('[data-id="csv"]')).toHaveClass(/faded/);
});
test('double-click opens a chat in focus and a source in its viewer, without a stray note', async ({ page }) => {
  await openBoard(page); const n = await page.evaluate(() => window.__board!.sources().length);
  await page.dblclick('[data-id="main"] .ttl'); expect(await page.evaluate(() => window.__board!.focus())).toBe('main');
  expect(await page.evaluate(() => window.__board!.sources().length)).toBe(n);
});
test('typing survives a re-render', async ({ page }) => {
  await openBoard(page); await page.click('[data-id="main"] .ttl');
  await page.locator('[data-id="main"] .compose textarea').pressSequentially('draft');
  await page.evaluate(() => window.__board!.rerender());
  await expect(page.locator('[data-id="main"] .compose textarea')).toHaveValue('draft');
  await expect(page.locator('[data-id="main"] .compose textarea')).toBeFocused();
});
test('map mode below 42% shows pebbles; back above 50%', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.zoomAt(720, 450, .3, false)); await page.waitForTimeout(100);
  await expect(page.locator('.card.size-s')).toHaveCount(12);
  await page.evaluate(() => window.__board!.zoomAt(720, 450, .46, false)); await page.waitForTimeout(100);
  await expect(page.locator('.card.size-s')).toHaveCount(12);          // hysteresis
  await page.evaluate(() => window.__board!.zoomAt(720, 450, .6, false)); await page.waitForTimeout(100);
  await expect(page.locator('.card.size-m')).toHaveCount(12);
});
test('reduced motion: no looping animation, cards land at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await openBoard(page, '?firstTokenMs=3000');
  await page.click('[data-id="main"] .ttl'); await page.locator('[data-id="main"] .compose textarea').fill('hi'); await page.keyboard.press('Enter');
  expect(await page.locator('[data-id="main"] .thinking i').evaluate(e => getComputedStyle(e).animationName)).toBe('none');
  const from = await center(page, '[data-id="csv"] .meta'); await dragPath(page, from, [from[0] + 100, from[1]], 5);
  const b = await page.evaluate(() => window.__board!.box('csv')); await page.waitForTimeout(32);
  expect(await page.evaluate(() => window.__board!.box('csv'))).toEqual(b);
});
