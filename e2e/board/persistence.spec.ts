import { test, expect } from '@playwright/test';
import { center, dragPath, openBoard } from './helpers';

const saves = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__board!.calls().filter((c) => c.method === 'savePositions'));
const viewportSaves = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__board!.calls().filter((c) => c.method === 'updateBoard' && !!(c.args[1] as { viewport?: unknown })?.viewport));

test('one save after a drop carries the dragged card and everything it nudged', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(300);
  await dragPath(page, await center(page, '[data-id="podcast"] .meta'), await center(page, '[data-id="second"] .cbody'), 25);
  expect((await saves(page)).length).toBe(0);   // nothing mid-drag / before the settle
  await page.evaluate(() => window.__board!.settle()); await page.waitForTimeout(700);
  const s = await saves(page);
  expect(s).toHaveLength(1);
  const ids = (s[0].args[1] as { id: string }[]).map((p) => p.id);
  expect(ids).toContain('podcast'); expect(ids.length).toBeGreaterThan(1);   // makeRoom / separateDesks moves ride along
});

test('a poll during an unsaved move does not snap the card back', async ({ page }) => {
  await openBoard(page, '?ingestMs=5000');   // keeps a card processing so the board polls
  await page.click('[data-pb="add"]');
  const chooser = page.waitForEvent('filechooser');
  await page.click('[data-m="file"]');
  await (await chooser).setFiles({ name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 a') });
  await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(300);
  await page.evaluate(() => window.__board!.settle());
  await dragPath(page, await center(page, '[data-id="csv"] .meta'), (await center(page, '[data-id="csv"] .meta')).map((v, i) => v + (i ? 0 : 200)) as [number, number], 20);
  await page.evaluate(() => window.__board!.settle());
  // the server copy of csv moves while our drop is unsaved: a poll that lands before the save must not drag the card to it
  await page.evaluate(() => { (window.__mock as any).boards.get('b_seed').cards.get('csv').card.x = -999; });
  const before = await page.evaluate(() => window.__board!.box('csv'));
  await page.waitForTimeout(2100);
  const after = await page.evaluate(() => window.__board!.box('csv'));
  expect(Math.abs(after[0] - before[0])).toBeLessThan(2); expect(Math.abs(after[1] - before[1])).toBeLessThan(2);
});

test('panning saves the viewport once, and mount saves nothing', async ({ page }) => {
  await openBoard(page); await page.waitForTimeout(1300);
  expect(await viewportSaves(page)).toHaveLength(0);
  const spot = await page.evaluate(() => {   // an empty patch of board: the viewport or world itself under the pointer
    for (let y = 150; y < 800; y += 25) for (let x = 100; x < 1300; x += 25) {
      const el = document.elementFromPoint(x, y);
      if (el && (el.classList.contains('pb-vp') || el.classList.contains('pb-world'))) return [x, y] as [number, number];
    }
    return null;
  });
  expect(spot).not.toBeNull();
  await dragPath(page, spot!, [spot![0] - 90, spot![1] - 30], 15);
  await page.evaluate(() => window.__board!.settle()); await page.waitForTimeout(1300);
  const v = await viewportSaves(page);
  expect(v).toHaveLength(1);
  const cam = await page.evaluate(() => window.__board!.cam());
  const vp = (v[0].args[1] as { viewport: { x: number; y: number; zoom: number } }).viewport;
  expect(Math.abs(vp.x - cam.x)).toBeLessThan(2); expect(Math.abs(vp.zoom - cam.z)).toBeLessThan(.01);
});

test('a reload of the same mock keeps the layout', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(300);
  const from = await center(page, '[data-id="csv"] .meta');
  await dragPath(page, from, [from[0] + 150, from[1] + 20], 20);
  await page.evaluate(() => window.__board!.settle()); await page.waitForTimeout(800);
  const before = await page.evaluate(() => window.__board!.box('csv'));
  await page.evaluate(() => window.__remount!());
  await page.waitForFunction(() => !!window.__board && document.querySelectorAll('.card[data-id]').length >= 12);
  await page.evaluate(() => window.__board!.settle());
  const after = await page.evaluate(() => window.__board!.box('csv'));
  expect(Math.abs(after[0] - before[0])).toBeLessThan(1.5); expect(Math.abs(after[1] - before[1])).toBeLessThan(1.5);
});

const emptySpot = (page: import('@playwright/test').Page) => page.evaluate(() => {
  for (let y = 150; y < 800; y += 25) for (let x = 100; x < 1300; x += 25) {
    const el = document.elementFromPoint(x, y);
    if (el && (el.classList.contains('pb-vp') || el.classList.contains('pb-world'))) return [x, y] as [number, number];
  }
  return null;
});

test('a wheel pan saves the viewport once', async ({ page }) => {
  await openBoard(page); await page.waitForTimeout(1300);
  const [x, y] = (await emptySpot(page))!;
  const c0 = await page.evaluate(() => window.__board!.cam());
  await page.mouse.move(x, y);
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(30); }
  await page.waitForTimeout(1500);
  const c1 = await page.evaluate(() => window.__board!.cam());
  expect(Math.abs(c1.y - c0.y)).toBeGreaterThan(5);
  expect(await viewportSaves(page)).toHaveLength(1);
});

test('a ctrl+wheel (pinch) zoom saves the viewport once', async ({ page }) => {
  await openBoard(page); await page.waitForTimeout(1300);
  const [x, y] = (await emptySpot(page))!;
  const c0 = await page.evaluate(() => window.__board!.cam());
  await page.mouse.move(x, y);
  await page.keyboard.down('Control');
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, -40); await page.waitForTimeout(30); }
  await page.keyboard.up('Control');
  await page.waitForTimeout(1500);
  const c1 = await page.evaluate(() => window.__board!.cam());
  expect(Math.abs(c1.z - c0.z)).toBeGreaterThan(.01);
  expect(await viewportSaves(page)).toHaveLength(1);
});

test('reduced motion: mount saves nothing, the zoom button saves once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page); await page.waitForTimeout(1500);
  expect(await viewportSaves(page)).toHaveLength(0);
  expect((await saves(page)).length).toBe(0);
  const z0 = (await page.evaluate(() => window.__board!.cam())).z;
  await page.click('[data-z="out"]'); await page.waitForTimeout(1500);
  expect((await page.evaluate(() => window.__board!.cam())).z).toBeLessThan(z0);
  expect(await viewportSaves(page)).toHaveLength(1);
});

test('a move inside the settle window survives an immediate board remount', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(300);
  const from = await center(page, '[data-id="csv"] .meta');
  const start = await page.evaluate(() => window.__board!.box('csv'));
  await dragPath(page, from, [from[0] + 150, from[1] + 20], 20);
  await page.evaluate(() => { (window as any).__old = window.__board; window.__remount!(); });
  await page.waitForFunction(() => !!window.__board && window.__board !== (window as any).__old && document.querySelectorAll('.card[data-id]').length >= 12);
  await page.evaluate(() => window.__board!.settle());
  const after = await page.evaluate(() => window.__board!.box('csv'));
  expect(after[0] - start[0]).toBeGreaterThan(100);   // csv kept the drop (~150 px right), not its old spot
  expect((await saves(page)).length).toBe(1);
});

test('a failed position save is retried on the next settle', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(300);
  await page.evaluate(() => { const m = window.__mock as any; m.failNext('savePositions', new m.constructor.ApiError(500, 'boom')); });
  const from = await center(page, '[data-id="csv"] .meta');
  await dragPath(page, from, [from[0] + 120, from[1] + 10], 20);
  await page.evaluate(() => window.__board!.settle()); await page.waitForTimeout(1000);
  expect((await saves(page)).length).toBe(1);   // the failed attempt
  const f2 = await center(page, '[data-id="podcast"] .meta');
  await dragPath(page, f2, [f2[0] - 60, f2[1] + 200], 20);
  await page.evaluate(() => window.__board!.settle()); await page.waitForTimeout(1000);
  const s = await saves(page);
  expect(s).toHaveLength(2);
  expect((s[1].args[1] as { id: string }[]).map((p) => p.id)).toContain('csv');
});
