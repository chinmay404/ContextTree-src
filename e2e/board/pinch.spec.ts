import { test, expect, type CDPSession, type Page } from '@playwright/test';
import { center, openBoard } from './helpers';

test.use({ hasTouch: true });

const session = (page: Page) => page.context().newCDPSession(page);
const cam = (page: Page) => page.evaluate(() => window.__board!.cam());
type P = { x: number; y: number };

async function pinch(cdp: CDPSession, from: [P, P], to: [P, P], steps = 10): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from[0], id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from[0], id: 0 }, { ...from[1], id: 1 }] });
  for (let i = 1; i <= steps; i++) {
    const at = (k: 0 | 1) => ({ x: from[k].x + (to[k].x - from[k].x) * i / steps, y: from[k].y + (to[k].y - from[k].y) * i / steps, id: k });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [at(0), at(1)] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const OPEN: [P, P] = [{ x: 400, y: 420 }, { x: 800, y: 420 }];
const SHUT: [P, P] = [{ x: 560, y: 420 }, { x: 640, y: 420 }];

async function clearBoard(page: Page) {
  await openBoard(page);
  await page.evaluate(() => { const b = window.__board!; b.select(null); b.camSnap(-400, 1100, .6); });
  await page.evaluate(() => window.__board!.settle());
}

test('spreading two fingers zooms in, pinching zooms out', async ({ page }) => {
  await clearBoard(page);
  const cdp = await session(page);
  const start = (await cam(page)).z;
  await pinch(cdp, SHUT, OPEN);
  const bigger = (await cam(page)).z;
  expect(bigger).toBeGreaterThan(start * 1.5);
  await pinch(cdp, OPEN, SHUT);
  expect((await cam(page)).z).toBeLessThan(bigger * .6);
});

test('the point between the fingers stays put', async ({ page }) => {
  await clearBoard(page);
  const cdp = await session(page);
  const before = await cam(page);
  const world = [(600 - before.x) / before.z, (420 - before.y) / before.z];
  await pinch(cdp, SHUT, OPEN);
  const after = await cam(page);
  expect(world[0] * after.z + after.x).toBeCloseTo(600, 0);
  expect(world[1] * after.z + after.y).toBeCloseTo(420, 0);
});

test('moving both fingers together pans', async ({ page }) => {
  await clearBoard(page);
  const cdp = await session(page);
  const before = await cam(page);
  await pinch(cdp, OPEN, [{ x: 500, y: 520 }, { x: 900, y: 520 }]);
  const after = await cam(page);
  expect(after.x - before.x).toBeCloseTo(100, 0);
  expect(after.y - before.y).toBeCloseTo(100, 0);
  expect(after.z).toBeCloseTo(before.z, 3);
});

test('lifting one finger leaves the board where the pinch put it', async ({ page }) => {
  await clearBoard(page);
  const cdp = await session(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...SHUT[0], id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...SHUT[0], id: 0 }, { ...SHUT[1], id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...OPEN[0], id: 0 }, { ...OPEN[1], id: 1 }] });
  const pinched = await cam(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ ...OPEN[0], id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: OPEN[0].x + 90, y: OPEN[0].y + 60, id: 0 }] });
  expect(await cam(page)).toEqual(pinched);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
});

test('a pinch that starts on a card does not drag the card', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => { const b = window.__board!, p = b.box('csv'); b.select(null); b.camSnap(600 - p[0] * .7, 420 - p[1] * .7, .7); });
  await page.evaluate(() => window.__board!.settle());
  const before = await page.evaluate(() => window.__board!.box('csv'));
  const c = await center(page, '[data-id="csv"] .face');
  const cdp = await session(page);
  await pinch(cdp, [{ x: c[0], y: c[1] }, { x: c[0] + 90, y: c[1] }], [{ x: c[0] - 160, y: c[1] }, { x: c[0] + 250, y: c[1] }]);
  await page.evaluate(() => window.__board!.settle());
  expect(await page.evaluate(() => window.__board!.box('csv'))).toEqual(before);
});

test('with the pen on, two fingers still zoom and leave no mark', async ({ page }) => {
  await clearBoard(page);
  await page.evaluate(() => localStorage.removeItem('ct-stylus'));
  await page.reload();
  await clearBoard(page);
  const cdp = await session(page);
  await page.keyboard.press('d');
  const start = (await cam(page)).z;
  await pinch(cdp, SHUT, OPEN);
  expect((await cam(page)).z).toBeGreaterThan(start * 1.5);
  await expect(page.locator('.inklayer path')).toHaveCount(0);
});

test('with the pen on, a palm of two close contacts does not zoom', async ({ page }) => {
  await clearBoard(page);
  const cdp = await session(page);
  await page.keyboard.press('d');
  const start = (await cam(page)).z;
  await pinch(cdp, [{ x: 600, y: 420 }, { x: 640, y: 430 }], [{ x: 590, y: 420 }, { x: 650, y: 430 }]);
  expect((await cam(page)).z).toBe(start);
});
