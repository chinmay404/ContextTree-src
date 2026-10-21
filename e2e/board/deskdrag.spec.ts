import { test, expect, type Page } from '@playwright/test';
import { center, dragPath, openBoard } from './helpers';

type Boxes = Record<string, [number, number, number, number]>;
const boxes = (page: Page, ids: string[]) =>
  page.evaluate((list) => Object.fromEntries(list.flatMap((id) => { try { return [[id, window.__board!.box(id)]]; } catch { return []; } })) as Boxes, ids);
const deskIds = (page: Page, chat: string) =>
  page.evaluate((c) => [c, ...window.__board!.sources().filter((s) => s.deskId === c).map((s) => s.id)], chat);
const saves = (page: Page) => page.evaluate(() => window.__board!.calls().filter((c) => c.method === 'savePositions'));
const camXY = (page: Page) => page.evaluate(() => { const c = window.__board!.cam(); return [c.x, c.y]; });

/** A screen point inside the desk box that no card covers (with a margin), found from the live layout. */
async function emptySpot(page: Page, chat: string): Promise<[number, number]> {
  const p = await page.evaluate((c) => {
    const b = window.__board!, d = b.deskBox(c)!, cam = b.cam();
    const cards = b.cards().filter((k) => k.id === c || k.deskId === c).map((k) => b.box(k.id));
    for (let y = d[1] + 20; y < d[3] - 10; y += 8) for (let x = d[0] + 10; x < d[2] - 10; x += 8) {
      if (cards.every((r) => x < r[0] - 24 || x > r[2] + 24 || y < r[1] - 24 || y > r[3] + 24)) return [x * cam.z + cam.x, y * cam.z + cam.y];
    }
    return null;
  }, chat);
  if (!p) throw new Error('no empty spot on the desk');
  return p as [number, number];
}

async function prep(page: Page): Promise<void> {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.evaluate(() => window.__board!.settle());
}

function expectMovedTogether(before: Boxes, after: Boxes): void {
  const ids = Object.keys(before), c = ids[0];
  const dx = after[c][0] - before[c][0], dy = after[c][1] - before[c][1];
  expect(Math.hypot(dx, dy)).toBeGreaterThan(40);
  for (const id of ids) {
    expect(Math.abs(after[id][0] - before[id][0] - dx), `${id} dx`).toBeLessThan(1.5);
    expect(Math.abs(after[id][1] - before[id][1] - dy), `${id} dy`).toBeLessThan(1.5);
  }
}

test('dragging a desk by its empty area moves the chat and every source by the same delta', async ({ page }) => {
  await prep(page);
  const ids = await deskIds(page, 'main'); expect(ids.length).toBeGreaterThan(2);
  const before = await boxes(page, ids), from = await emptySpot(page, 'main'), cam0 = await camXY(page);
  await dragPath(page, from, [from[0] + 90, from[1] + 70], 20);
  await page.evaluate(() => window.__board!.settle());
  expectMovedTogether(before, await boxes(page, ids));
  expect(await camXY(page)).toEqual(cam0);
});

test('dragging a desk by its title tab does the same', async ({ page }) => {
  await prep(page);
  const ids = await deskIds(page, 'main'), before = await boxes(page, ids), from = await center(page, '.desk[data-chat="main"] .tab');
  const cam0 = await camXY(page);
  await dragPath(page, from, [from[0] + 90, from[1] + 70], 20);
  await page.evaluate(() => window.__board!.settle());
  expectMovedTogether(before, await boxes(page, ids));
  expect(await camXY(page)).toEqual(cam0);
  expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('');
});

test('dragging a desk saves positions exactly once', async ({ page }) => {
  await prep(page);
  const from = await emptySpot(page, 'main');
  await dragPath(page, from, [from[0] + 90, from[1] + 70], 20);
  await page.evaluate(() => window.__board!.settle()); await page.waitForTimeout(900);
  const s = await saves(page); expect(s).toHaveLength(1);
  const saved = (s[0].args[1] as { id: string }[]).map((p) => p.id);
  for (const id of await deskIds(page, 'main')) expect(saved).toContain(id);
});

test('dragging a source card moves only that card', async ({ page }) => {
  await prep(page);
  const ids = await deskIds(page, 'main'), src = ids[1], others = ids.filter((i) => i !== src);
  const before = await boxes(page, ids), from = await center(page, `[data-id="${src}"] .meta`);
  await dragPath(page, from, [from[0] + 20, from[1] + 20], 10);
  await page.evaluate(() => window.__board!.settle());
  const after = await boxes(page, ids);
  expect(Math.hypot(after[src][0] - before[src][0], after[src][1] - before[src][1])).toBeGreaterThan(5);
  // the desk does not follow: the chat stays put, and a neighbour at most gets makeRoom's nudge, never the dragged card's delta
  expect(after.main).toEqual(before.main);
  const d = [after[src][0] - before[src][0], after[src][1] - before[src][1]];
  for (const id of others) expect(Math.hypot(after[id][0] - before[id][0] - d[0], after[id][1] - before[id][1] - d[1]), id).toBeGreaterThan(5);
});

test('dragging empty canvas still pans and moves no card', async ({ page }) => {
  await prep(page);
  const all = (await page.evaluate(() => window.__board!.cards().map((c) => c.id)));
  const before = await boxes(page, all), cam0 = await camXY(page);
  const from: [number, number] = [8, 8];
  await dragPath(page, from, [from[0] + 60, from[1] + 40], 10);
  await page.evaluate(() => window.__board!.settle());
  const cam1 = await camXY(page);
  expect(cam1[0] - cam0[0]).toBeGreaterThan(30);
  expect(await boxes(page, all)).toEqual(before);
});
