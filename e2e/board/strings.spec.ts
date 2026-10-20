import { test, expect } from '@playwright/test';
import { center, dragPath, openBoard } from './helpers';

const stringPodcastToSide = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => window.__board!.camSnap(60, 260, .62)); await page.waitForTimeout(300);
  await dragPath(page, await center(page, '[data-id="podcast"] .port.out'), await center(page, '[data-id="side"] .ttl'));
};

test('dragging from a source port onto a chat strings it', async ({ page }) => {
  await openBoard(page); await stringPodcastToSide(page);
  expect(await page.evaluate(() => window.__board!.hasWire('podcast', 'side'))).toBe(true);
});
test('release on empty board springs back', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.camSnap(60, 260, .62)); await page.waitForTimeout(300);
  const from = await center(page, '[data-id="note"] .port.out');
  await page.mouse.move(from[0], from[1]); await page.mouse.down();
  await page.mouse.move(from[0] + 30, from[1] + 100, { steps: 6 }); await page.mouse.move(from[0] + 60, from[1] + 200, { steps: 6 });
  expect(await page.evaluate(() => window.__board!.live())).toBe(true);
  await expect(page.locator('.pb-root')).toHaveClass(/stringing/);
  await page.mouse.up(); await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__board!.live())).toBe(false);
  await expect(page.locator('.pb-root')).not.toHaveClass(/stringing/);
  expect(await page.evaluate(() => window.__board!.edges().some((e) => e.kind === 'wire' && e.from === 'note' && e.to !== 'main'))).toBe(false);
});
test('chat port to empty board opens the branch sheet there', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(600);
  const from = await center(page, '[data-id="deep"] .port.out');
  await dragPath(page, from, [from[0] + 120, from[1] - 260]);
  const d = await page.evaluate(() => window.__board!.dialog());
  expect(d?.mode).toBe('branch'); expect(d?.parentId).toBe('deep'); expect(d?.at).not.toBeNull();
});
test('chat port onto a chat shares its answer; ancestors are refused', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(600);
  await dragPath(page, await center(page, '[data-id="side"] .port.out'), await center(page, '[data-id="second"] .ttl'));
  expect(await page.evaluate(() => window.__board!.hasAnswer('side', 'second'))).toBe(true);
  await dragPath(page, await center(page, '[data-id="main"] .port.out'), await center(page, '[data-id="deep"] .ttl'));
  expect(await page.evaluate(() => window.__board!.hasAnswer('main', 'deep'))).toBe(false);
});
test('clicking a string shows Disconnect; Disconnect removes it', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => { window.__board!.select(null); window.__board!.fit(false); }); await page.waitForTimeout(600);
  const pt = await page.evaluate(() => window.__board!.wirePoint('s|csv|deep', .35)); await page.mouse.click(pt![0], pt![1]);
  expect(await page.evaluate(() => [window.__board!.selectedWire(), window.__board!.wirePillOn('s|csv|deep')])).toEqual(['s|csv|deep', true]);
  await page.click('.wk[data-key="s|csv|deep"]'); expect(await page.evaluate(() => window.__board!.hasWire('csv', 'deep'))).toBe(false);
});
test('a refused string disappears with a toast', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => { const m = (window as any).__mock; m.failNext('createEdge', new m.constructor.ApiError(409, 'not_allowed')); });
  await stringPodcastToSide(page);
  await expect.poll(() => page.evaluate(() => window.__board!.hasWire('podcast', 'side')), { timeout: 1000 }).toBe(false);
  expect(await page.evaluate(() => (window as any).__toastText)).toBe("Those two can't be strung together.");
});
test('branch strings sway', async ({ page }) => {
  await openBoard(page); const s = await page.evaluate(async () => { const b = window.__board!; b.snapBy('second', 0, 200); await new Promise((r) => setTimeout(r, 60)); return b.stringMid('t|second'); });
  expect(Math.abs(s!.ty - s!.y)).toBeGreaterThan(5);
});
test('tubes bubble while a chat streams', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => { window.__board!.select('deep'); window.__board!.fit(false); }); await page.waitForTimeout(500);
  await page.locator('[data-id="deep"] .compose textarea').fill('hello'); await page.keyboard.press('Enter');
  await expect.poll(() => page.locator('path.bub.flow').count(), { timeout: 3000 }).toBeGreaterThanOrEqual(2);
});
