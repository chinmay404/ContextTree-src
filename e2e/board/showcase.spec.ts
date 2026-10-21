import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const BOX = '[data-pb="showcase-box"]';
const open = async (page: Page) => {
  await page.goto('/board-dev?showcase=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__board && document.querySelectorAll('[data-mode="showcase"] .card[data-id]').length >= 12);
  await page.evaluate(() => window.__board!.settle());
};
const allInside = (page: Page) => page.evaluate((sel) => {
  const box = document.querySelector(sel)!.getBoundingClientRect();
  return [...document.querySelectorAll('[data-mode="showcase"] .card')].map((c) => {
    const r = c.getBoundingClientRect();
    return r.left >= box.left - 1 && r.top >= box.top - 1 && r.right <= box.right + 1 && r.bottom <= box.bottom + 1;
  });
}, BOX);

test('every card of the board is inside the box, and there is no chrome', async ({ page }) => {
  const errs = trackErrors(page);
  await open(page);
  await expect(page.locator('[data-mode="showcase"]')).toHaveClass(/pb-showcase/);
  await expect(page.locator('[data-mode="showcase"] .card')).toHaveCount(12);   // the seed's 16 cards minus the 4 pile members
  const inside = await allInside(page);
  expect(inside.length).toBe(12);
  expect(inside.every(Boolean)).toBe(true);
  for (const s of ['[data-pb="brand"]', '[data-pb="add"]', '[data-pb="zoom"]', '[data-pb="chatbar"]', '[data-pb="sheet"]', '[data-pb="focus"]']) await expect(page.locator(s)).toHaveCount(0);
  expect(await page.evaluate(() => window.__board!.size())).toBe('M');   // never the zoomed-out map
  mkdirSync(SHOTS, { recursive: true });
  await page.locator(BOX).screenshot({ path: `${SHOTS}/showcase.png` });
  expect(errs).toEqual([]);
});

test('it takes no input: keys, paste, clicks and drags change nothing', async ({ page }) => {
  await open(page);
  const n = await page.locator('[data-mode="showcase"] .card').count();
  const cam = await page.evaluate(() => window.__board!.cam());
  await page.locator(BOX).hover();
  await page.keyboard.press('n'); await page.keyboard.press('q');
  await page.evaluate(() => {
    const dt = new DataTransfer(); dt.setData('text/plain', 'pasted into the landing');
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  const b = (await page.locator('[data-mode="showcase"] .card').first().boundingBox())!;
  await page.mouse.dblclick(b.x + b.width / 2, b.y + 20);
  await page.mouse.move(b.x + 20, b.y + 20); await page.mouse.down(); await page.mouse.move(b.x + 200, b.y + 120, { steps: 6 }); await page.mouse.up();
  await page.keyboard.press('Escape');
  expect(await page.locator('[data-mode="showcase"] .card').count()).toBe(n);
  expect(await page.evaluate(() => window.__board!.cam())).toEqual(cam);
  expect(await page.evaluate(() => window.__board!.dialog())).toBeNull();
  expect(await page.evaluate(() => window.__board!.focus())).toBeNull();
  expect(await page.locator('[data-mode="showcase"] [tabindex="0"]:focus, [data-mode="showcase"] textarea:focus').count()).toBe(0);
  expect(await page.evaluate((sel) => (document.querySelector(sel) as HTMLElement & { inert: boolean }).querySelector<HTMLElement>('.pb-vp')!.inert, BOX)).toBe(true);
});

test('the wheel over the box scrolls the page', async ({ page }) => {
  await open(page);
  const b = (await page.locator(BOX).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  const y0 = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y0);
});

test('nothing is written to the board: no saves, no board update, no new card', async ({ page }) => {
  await open(page);
  await page.waitForTimeout(2500);
  const writes = await page.evaluate(() => window.__mock!.calls.map((c) => c.method).filter((m) => ['savePositions', 'updateBoard', 'createCard', 'updateCard', 'createEdge', 'createBoard'].includes(m)));
  expect(writes).toEqual([]);
});

test('the board refits when its box changes size', async ({ page }) => {
  await open(page);
  await page.evaluate((sel) => { const el = document.querySelector<HTMLElement>(sel)!; el.style.width = '600px'; el.style.height = '700px'; }, BOX);
  await page.waitForTimeout(500);
  const inside = await allInside(page);
  expect(inside.every(Boolean)).toBe(true);
  const w = await page.evaluate(() => { const r = document.querySelector('[data-mode="showcase"]')!.getBoundingClientRect(); return Math.round(r.width); });
  expect(w).toBe(600);
});
