import { test, expect } from '@playwright/test';
import { center, openBoard } from './helpers';

test('every chat has a desk with its name and source dots', async ({ page }) => {
  await openBoard(page); await expect(page.locator('.desk[data-chat]')).toHaveCount(4);
  await expect(page.locator('.desk[data-chat="main"] .tab .lb')).toHaveText('How should I price Context Tree?');
  await expect(page.locator('.desk[data-chat="main"] .dots i')).toHaveCount(3);
  await expect(page.locator('.desk[data-chat="main"] .dots i.soon')).toHaveCount(1);
});
test('dropping a loose source on a desk puts it on that desk', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.evaluate(() => window.__board!.settle());
  const d = (await page.evaluate(() => window.__board!.deskBox('main')))!;
  const cam = await page.evaluate(() => window.__board!.cam());
  const to: [number, number] = [(d[0] + 60) * cam.z + cam.x, (d[3] - 40) * cam.z + cam.y];
  const from = await center(page, '[data-id="podcast"] .meta');
  await page.mouse.move(from[0], from[1]); await page.mouse.down();
  for (let i = 1; i <= 20; i++) { await page.mouse.move(from[0] + (to[0] - from[0]) * i / 20, from[1] + (to[1] - from[1]) * i / 20); await page.waitForTimeout(16); }
  await expect(page.locator('.desk[data-chat="main"]')).toHaveClass(/hot/);
  await page.mouse.up(); await page.evaluate(() => window.__board!.settle());
  expect(await page.evaluate(() => window.__board!.card('podcast')!.deskId)).toBe('main');
  await expect(page.locator('.desk[data-chat="main"]')).not.toHaveClass(/hot/);
});
test('a new chat shows the empty desk hint', async ({ page }) => {
  await openBoard(page);
  const id = await page.evaluate(() => { window.__board!.openSheet('root'); return window.__board!.confirmDialog(); });
  expect(id).toBeTruthy();
  await expect(page.locator(`.desk[data-chat="${id}"]`)).toHaveClass(/empty/);
  await expect(page.locator('.desk[data-chat="main"]')).not.toHaveClass(/empty/);
});
test('zoomed out, desk names grow but never outgrow their desk', async ({ page }) => {
  // between 42% and 55% the cards are still cards and the desk names already grow; below 42% the board is a map of names and has no desk frames (map-names.spec.ts)
  await openBoard(page); await page.evaluate(() => window.__board!.zoomAt(720, 450, .46, false)); await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__board!.size())).toBe('M');
  const t = await page.locator('.desk[data-chat="main"] .tab').evaluate((e) => (e as HTMLElement).style.transform); expect(t).toMatch(/scale\(/);
  const r = await page.evaluate(() => {
    const d = document.querySelector('.desk[data-chat="main"]')!.getBoundingClientRect(), tb = document.querySelector('.desk[data-chat="main"] .tab')!.getBoundingClientRect();
    return { dw: d.width, tw: tb.width };
  });
  expect(r.tw).toBeLessThanOrEqual(r.dw);
});
test('selecting a chat fades unrelated desks', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.select('side'));
  await expect(page.locator('.desk[data-chat="second"]')).toHaveClass(/faded/);
  await expect(page.locator('.desk[data-chat="main"]')).not.toHaveClass(/faded/);
});
