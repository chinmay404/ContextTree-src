import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { center, dragPath, openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const marks = (page: Page) => page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'createMark').map((c) => c.args[1] as { id: string; kind: string; anchorId: string | null; noteId: string | null }));
const paths = (page: Page) => page.locator('.inklayer path[data-mark]');

async function frameBoard(page: Page) {
  await page.evaluate(() => { const b = window.__board!, p = b.box('csv'); b.select(null); b.camSnap(700 - p[0] * .7, 450 - p[1] * .7, .7); });
  await page.evaluate(() => window.__board!.settle());
}

test('D turns the pen on, a stroke draws and saves, Esc leaves', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await frameBoard(page);
  await page.keyboard.press('d');
  await expect(page.locator('[data-pb="drawbar"]')).toBeVisible();
  await dragPath(page, [300, 200], [520, 320], 12);
  await expect(paths(page)).toHaveCount(1);
  const [saved] = await marks(page);
  expect(saved.kind).toBe('pen');
  expect(saved.noteId ?? null).toBeNull();
  await page.screenshot({ path: shot('drawing-board') });
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-pb="drawbar"]')).toHaveCount(0);
  expect(errs).toEqual([]);
});

test('with the pen off the board works as before, and a mark never takes a click', async ({ page }) => {
  await openBoard(page);
  await frameBoard(page);
  const c = await center(page, '[data-id="csv"] .face');
  await page.keyboard.press('d');
  await dragPath(page, [c[0] - 40, c[1]], [c[0] + 40, c[1]], 8);
  await page.keyboard.press('Escape');
  await page.mouse.click(c[0], c[1]);
  expect(await page.evaluate(() => window.__board!.selected())).toBe('csv');
});

test('a circle on a card moves with the card; a line on open board stays', async ({ page }) => {
  await openBoard(page);
  await frameBoard(page);
  const c = await center(page, '[data-id="csv"] .face');
  await page.keyboard.press('d');
  await dragPath(page, [c[0] - 20, c[1] - 10], [c[0] + 20, c[1] + 10], 10);
  await dragPath(page, [100, 130], [1340, 120], 8);   // right across the board: on no one card or desk
  const [circle, free] = await marks(page);
  expect(circle.anchorId).toBe('csv');
  expect(free.anchorId ?? null).toBeNull();
  await page.keyboard.press('Escape');
  const before = await page.locator(`[data-mark="${circle.id}"]`).getAttribute('transform');
  const freeBefore = await page.locator(`[data-mark="${free.id}"]`).getAttribute('transform');
  await dragPath(page, c, [c[0] + 150, c[1] + 90], 12);
  await page.evaluate(() => window.__board!.settle());
  expect(await page.locator(`[data-mark="${circle.id}"]`).getAttribute('transform')).not.toBe(before);
  expect(await page.locator(`[data-mark="${free.id}"]`).getAttribute('transform')).toBe(freeBefore);
});

test('the eraser removes a whole mark, and undo takes back the last one', async ({ page }) => {
  await openBoard(page);
  await frameBoard(page);
  await page.keyboard.press('d');
  await dragPath(page, [300, 200], [500, 200], 10);
  await dragPath(page, [300, 400], [500, 400], 10);
  await expect(paths(page)).toHaveCount(2);
  await page.locator('[data-pb="drawbar"] [data-tool="eraser"]').click();
  await dragPath(page, [400, 170], [400, 230], 8);
  await expect(paths(page)).toHaveCount(1);
  await page.locator('[data-pb="drawbar"] [data-act="undo"]').click();
  await expect(paths(page)).toHaveCount(0);
});

test('an arrow and a highlight draw, and hiding takes everything off the board', async ({ page }) => {
  await openBoard(page);
  await frameBoard(page);
  await page.keyboard.press('d');
  await page.locator('[data-pb="drawbar"] [data-tool="arrow"]').click();
  await dragPath(page, [300, 200], [500, 300], 8);
  await page.locator('[data-pb="drawbar"] [data-tool="highlight"]').click();
  await dragPath(page, [300, 400], [500, 400], 8);
  expect((await marks(page)).map((m) => m.kind)).toEqual(['arrow', 'highlight']);
  await page.locator('[data-pb="draw-hide"]').click();
  await expect(page.locator('.inklayer')).toBeHidden();
  await page.locator('[data-pb="draw-hide"]').click();
  await expect(page.locator('.inklayer')).toBeVisible();
});

test('marks survive a reload of the board data', async ({ page }) => {
  await openBoard(page);
  await frameBoard(page);
  await page.keyboard.press('d');
  await dragPath(page, [300, 200], [500, 300], 8);
  await expect(paths(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__board!.reload());
  await expect(paths(page)).toHaveCount(1);
});

test('a note page takes typing and writing on the same sheet', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await page.evaluate(() => window.__board!.openViewer('note'));
  const sheet = page.locator('[data-pb="notepage"]');
  await expect(sheet).toBeVisible();
  await sheet.locator('textarea').fill('Typed on the page');
  await sheet.locator('[data-act="write"]').click();
  const box = (await sheet.boundingBox())!;
  await dragPath(page, [box.x + 60, box.y + 80], [box.x + 300, box.y + 140], 12);
  await expect(sheet.locator('path[data-mark]')).toHaveCount(1);
  const onPage = (await marks(page)).at(-1)!;
  expect(onPage.noteId).toBe('note');
  expect(onPage.anchorId ?? null).toBeNull();
  await page.waitForTimeout(350);
  await page.screenshot({ path: shot('drawing-note') });
  await sheet.locator('[data-act="type"]').click();
  await sheet.locator('textarea').click();
  await page.keyboard.type(' and more');
  await expect(sheet.locator('textarea')).toHaveValue(/and more/);
  expect(errs).toEqual([]);
});

test('ink on a note stays off the board', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.openViewer('note'));
  const sheet = page.locator('[data-pb="notepage"]');
  await sheet.locator('[data-act="write"]').click();
  const box = (await sheet.boundingBox())!;
  await dragPath(page, [box.x + 60, box.y + 80], [box.x + 300, box.y + 140], 12);
  await expect(sheet.locator('path[data-mark]')).toHaveCount(1);
  await expect(paths(page)).toHaveCount(0);
});
