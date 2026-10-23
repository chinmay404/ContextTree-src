import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { center, dragPath, openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const SET = '.card.src.set';
const sets = (page: Page) => page.evaluate(() => window.__board!.cards().filter((c) => c.sourceType === 'pile' && (c.data as { layout?: string }).layout === 'open').map((c) => c.id));
const members = (page: Page, id: string) => page.evaluate((i) => window.__board!.cards().filter((c) => c.pileId === i).map((c) => c.id).sort(), id);
const data = (page: Page, id: string) => page.evaluate((i) => window.__board!.card(i)!.data as { title?: string; meta?: string; layout?: string | null }, id);

/** Full-size cards with the new set and a couple of loose sources in view. */
const frame = async (page: Page, ids: string[]) => {
  await page.evaluate((list) => {
    const b = window.__board!; b.select(null);
    const boxes = list.map((i) => b.box(i));
    const x0 = Math.min(...boxes.map((x) => x[0])), x1 = Math.max(...boxes.map((x) => x[2])), y0 = Math.min(...boxes.map((x) => x[1])), y1 = Math.max(...boxes.map((x) => x[3]));
    const z = Math.min(.8, 1300 / (x1 - x0 + 200), 760 / (y1 - y0 + 200));
    b.camSnap(720 - ((x0 + x1) / 2) * z, 450 - ((y0 + y1) / 2) * z, z);
  }, ids);
  await page.evaluate(() => window.__board!.settle());
};
const newSet = async (page: Page): Promise<string> => {
  await page.click('[data-pb="add"]'); await page.click('[data-pb="menu"] [data-m="set"]');
  await expect(page.locator(SET)).toHaveCount(1);
  return (await sets(page))[0];
};

test('Add has "New set": an empty open box with a name, ready for documents', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await page.click('[data-pb="add"]');
  await expect(page.locator('[data-pb="menu"] [data-m]')).toHaveText(['NoteN', 'New questionQ', 'New set', 'Upload files', 'Paste a link or textV']);
  await page.click('[data-pb="menu"] [data-m="set"]');
  await expect(page.locator(SET)).toHaveCount(1);
  const id = (await sets(page))[0];
  expect(await data(page, id)).toMatchObject({ title: 'New set', layout: 'open' });
  await expect(page.locator(`${SET} .setname`)).toHaveValue('New set');
  await expect(page.locator(`${SET} .sethint`)).toContainText('Drop sources here');
  await expect(page.locator(`${SET} .port.out[data-port="src"]`)).toHaveCount(1);
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot('set-empty') });
  expect(errs).toEqual([]);
});

test('dragging sources onto a set fills it as a grid, and the set can be renamed', async ({ page }) => {
  await openBoard(page);
  const id = await newSet(page);
  await frame(page, [id, 'csv', 'web', 'pdf']);
  test.skip((await page.evaluate(() => window.__board!.size())) === 'S', 'cards too small at this viewport');
  for (const src of ['csv', 'web']) {
    await dragPath(page, await center(page, `[data-id="${src}"] .meta`), await center(page, `[data-id="${id}"] .sethd`), 25);
    await page.waitForTimeout(400);
  }
  expect(await members(page, id)).toEqual(['csv', 'web']);
  await expect(page.locator(`[data-id="${id}"] .setm`)).toHaveCount(2);
  await expect(page.locator(`[data-id="${id}"] .setmeta`)).toHaveText('2 sources');
  await expect(page.locator('[data-id="csv"].card, [data-id="web"].card')).toHaveCount(0);   // inside the set now
  const tiles = await page.locator(`[data-id="${id}"] .setm`).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(tiles).size).toBe(2);                                                         // side by side: a grid, not a stack
  await page.locator(`[data-id="${id}"] .setname`).fill('Pricing papers');
  await page.waitForTimeout(800);
  expect((await data(page, id)).title).toBe('Pricing papers');
  await page.screenshot({ path: shot('set-with-sources') });
});

test('a set stays one box: dragging it moves its sources with it', async ({ page }) => {
  await openBoard(page);
  const id = await newSet(page);
  await frame(page, [id, 'csv']);
  test.skip((await page.evaluate(() => window.__board!.size())) === 'S', 'cards too small at this viewport');
  await page.evaluate(([s]) => window.__board!.select(s), [id]);
  await dragPath(page, await center(page, `[data-id="${id}"] .sethd`), await center(page, '[data-id="csv"] .meta'), 25);
  await page.waitForTimeout(300);
  const before = await page.evaluate((i) => window.__board!.box(i), id);
  await page.evaluate((i) => window.__board!.snapBy(i, 120, 60), id);
  const after = await page.evaluate((i) => window.__board!.box(i), id);
  expect(after[0] - before[0]).toBe(120);
});

test('files dropped on a set go into it', async ({ page }) => {
  await openBoard(page, '?ingestMs=200');
  const id = await newSet(page);
  await frame(page, [id, 'csv']);
  const pt = await center(page, `[data-id="${id}"] .setgrid`);
  await page.evaluate(([x, y]) => {
    const dt = new DataTransfer(); dt.items.add(new File(['# notes'], 'notes.md', { type: 'text/markdown' }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }, pt);
  await page.waitForTimeout(500);
  const f = await page.evaluate(() => window.__board!.cards().find((x) => (x.data as { fileName?: string }).fileName === 'notes.md')!.pileId);
  expect(f).toBe(id);
  await expect(page.locator(`[data-id="${id}"] .setm`)).toHaveCount(1);
});

test('a link dropped on a set goes into it', async ({ page }) => {
  await openBoard(page);
  const id = await newSet(page);
  await frame(page, [id, 'csv']);
  const pt = await center(page, `[data-id="${id}"] .setgrid`);
  await page.evaluate(([x, y]) => {
    const dt = new DataTransfer(); dt.setData('text/uri-list', 'https://example.org/report');
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }, pt);
  await page.waitForTimeout(400);
  const c = await page.evaluate(() => window.__board!.cards().find((x) => (x.data as { url?: string }).url === 'https://example.org/report')!.pileId);
  expect(c).toBe(id);
});

test('strung to two chats, both read every member', async ({ page }) => {
  await openBoard(page);
  const id = await newSet(page);
  await frame(page, [id, 'csv', 'web', 'side', 'second']);
  // put two sources in by dragging, then string the set from its port to each chat
  const dragIn = async (src: string) => { await dragPath(page, await center(page, `[data-id="${src}"] .meta`), await center(page, `[data-id="${id}"] .sethd`), 25); await page.waitForTimeout(400); };
  test.skip((await page.evaluate(() => window.__board!.size())) === 'S', 'cards too small at this viewport');
  await dragIn('csv'); await dragIn('web');
  for (const chat of ['side', 'second']) {
    await page.evaluate((i) => window.__board!.select(i), id);
    await dragPath(page, await center(page, `[data-id="${id}"] .port.out`), await center(page, `[data-id="${chat}"] .ttl`), 30);
    await page.waitForTimeout(400);
  }
  expect(await page.evaluate((i) => window.__board!.hasWire(i, 'side') && window.__board!.hasWire(i, 'second'), id)).toBe(true);
  for (const chat of ['side', 'second']) {   // the engine reads the set's members for each chat
    const read = await page.evaluate((c) => window.__mock!.getReads('b_seed', c).then((r) => r.items.map((i) => i.cardId)), chat);
    expect(read, chat).toEqual(expect.arrayContaining(['csv', 'web']));
  }
});

test('a source can be taken back out of a set', async ({ page }) => {
  await openBoard(page);
  const id = await newSet(page);
  await frame(page, [id, 'csv', 'web']);
  test.skip((await page.evaluate(() => window.__board!.size())) === 'S', 'cards too small at this viewport');
  await dragPath(page, await center(page, '[data-id="csv"] .meta'), await center(page, `[data-id="${id}"] .sethd`), 25);
  await page.waitForTimeout(400);
  expect(await members(page, id)).toEqual(['csv']);
  await page.locator(`[data-id="${id}"] .setm`).hover();
  await page.locator(`[data-id="${id}"] .setm [data-act="takeout"]`).click();
  await page.waitForTimeout(400);
  expect(await members(page, id)).toEqual([]);
  await expect(page.locator('[data-id="csv"].card')).toHaveCount(1);
  expect(await data(page, id)).toMatchObject({ meta: 'Empty set' });
});

test('a member opens in the viewer from the set', async ({ page }) => {
  await openBoard(page);
  const id = await newSet(page);
  await frame(page, [id, 'csv']);
  test.skip((await page.evaluate(() => window.__board!.size())) === 'S', 'cards too small at this viewport');
  await dragPath(page, await center(page, '[data-id="csv"] .meta'), await center(page, `[data-id="${id}"] .sethd`), 25);
  await page.waitForTimeout(400);
  await page.locator(`[data-id="${id}"] .setm`).click();
  expect(await page.evaluate(() => window.__board!.viewer())).toMatchObject({ cardId: id, memberId: 'csv' });
});

test('the card menu opens a pile as a set, closes a set into a pile, and starts a set from a source', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => { window.__board!.select(null); window.__board!.camSnap(-500, 0, .9); });
  await page.waitForTimeout(300);
  const MENU = '[data-pb="cardmenu"]';
  await page.locator('[data-id="interviews"] .face').click({ button: 'right', position: { x: 10, y: 8 } });
  await page.locator(`${MENU} [data-m="set-open"]`).click();
  await expect(page.locator('[data-id="interviews"]')).toHaveClass(/\bset\b/);
  await expect(page.locator('[data-id="interviews"] .setm')).toHaveCount(4);
  expect((await data(page, 'interviews')).layout).toBe('open');
  await page.screenshot({ path: shot('set-opened-from-pile') });
  await page.locator('[data-id="interviews"] .face').click({ button: 'right', position: { x: 10, y: 8 } });
  await expect(page.locator(`${MENU} [data-m="set-open"]`)).toHaveCount(0);
  await page.locator(`${MENU} [data-m="set-close"]`).click();
  await expect(page.locator('[data-id="interviews"]')).not.toHaveClass(/\bset\b/);
  expect(await members(page, 'interviews')).toHaveLength(4);
  // a single loose source: start a set from it
  await page.evaluate(() => { window.__board!.fit(false); });
  await page.waitForTimeout(300);
  await page.locator('[data-id="csv"] .face').click({ button: 'right', position: { x: 10, y: 8 } });
  await page.locator(`${MENU} [data-m="set-start"]`).click();
  await page.waitForTimeout(400);
  const id = (await sets(page))[0];
  expect(await members(page, id)).toEqual(['csv']);
  await expect(page.locator(`[data-id="${id}"] .setm`)).toHaveCount(1);
  // a chat's menu has no set rows
  await page.locator('[data-id="main"] .face').click({ button: 'right', position: { x: 10, y: 8 } });
  await expect(page.locator(`${MENU} [data-m^="set-"]`)).toHaveCount(0);
});

test('deleting a set asks: keep its sources, or delete them too; an empty set just goes', async ({ page }) => {
  await openBoard(page);
  const id2 = await newSet(page);
  await frame(page, [id2, 'csv', 'web']);
  test.skip((await page.evaluate(() => window.__board!.size())) === 'S', 'cards too small at this viewport');
  for (const src of ['csv', 'web']) { await dragPath(page, await center(page, `[data-id="${src}"] .meta`), await center(page, `[data-id="${id2}"] .sethd`), 25); await page.waitForTimeout(400); }
  await page.evaluate((i) => window.__board!.select(i), id2);
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-pb="confirm"] h2')).toHaveText('Delete the set "New set"?');
  await expect(page.locator('[data-pb="confirm"] .btn.primary')).toHaveText(['Keep the 2 sources', 'Delete all 2']);
  // Cancel, keep and delete-all share one row (one baseline), not a stranded third button
  const rows = await page.locator('[data-pb="confirm"] .row .btn').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().bottom)));
  expect(rows).toHaveLength(3);
  expect(new Set(rows).size).toBe(1);
  // fully open (not mid-fade): opaque, in front, and no toast of any kind yet
  await expect.poll(() => page.locator('[data-pb="confirm"]').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  await expect(page.locator('.pb-toast')).toHaveText('');
  await page.waitForTimeout(250);
  await page.screenshot({ path: shot('set-delete-ask') });
  await page.locator('[data-pb="confirm"] .btn.primary').first().click();
  await page.waitForTimeout(500);
  await expect(page.locator(SET)).toHaveCount(0);
  await expect(page.locator('[data-id="csv"].card')).toHaveCount(1);     // the sources are back on the board
  await expect(page.locator('[data-id="web"].card')).toHaveCount(1);
  await expect(page.locator('.pb-toast')).toContainText('Set deleted · 2 sources kept');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('set-delete-kept') });
  // an empty set has nothing to ask about: it goes at once, with Undo
  const id = await newSet(page);
  await page.evaluate((i) => window.__board!.select(i), id);
  await page.keyboard.press('Delete');
  await expect(page.locator(SET)).toHaveCount(0);
  await expect(page.locator('.pb-toast')).toContainText('Removed');
});

test('the delete question is opaque once open, and no Removed toast shows before anything is deleted', async ({ page }) => {
  await openBoard(page);
  const id = await newSet(page);
  await frame(page, [id, 'csv', 'web']);
  test.skip((await page.evaluate(() => window.__board!.size())) === 'S', 'cards too small at this viewport');
  for (const src of ['csv', 'web']) { await dragPath(page, await center(page, `[data-id="${src}"] .meta`), await center(page, `[data-id="${id}"] .sethd`), 25); await page.waitForTimeout(400); }
  await expect(page.locator('.pb-toast')).toHaveText('');
  await page.evaluate((i) => window.__board!.select(i), id);
  await page.keyboard.press('Delete');
  const box = page.locator('[data-pb="confirm"]');
  await expect(box).toHaveAttribute('aria-hidden', 'false');
  await expect.poll(() => box.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  await expect(page.locator('.pb-toast')).toHaveText('');              // nothing is deleted, so nothing to undo
  expect(await page.locator(SET).count()).toBe(1);                      // the set is still on the board
  const sheet = await page.locator('[data-pb="confirm"] .sheetbox').evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, op: getComputedStyle(e).opacity }));
  expect(sheet.op).toBe('1');
  expect(sheet.bg).toMatch(/^rgb\(/);                                  // a solid sheet, not a see-through one
  await page.locator('[data-pb="confirm"] .btn:not(.primary)').click(); // Cancel
  await expect(box).toHaveAttribute('aria-hidden', 'true');
  expect(await page.locator(SET).count()).toBe(1);
  await expect(page.locator('.pb-toast')).toHaveText('');
});

test('zoomed out a set is a name like any source, with its count', async ({ page }) => {
  await openBoard(page);
  const id = await newSet(page);
  await page.evaluate(() => window.__board!.camSnap(300, 300, .3));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__board!.size())).toBe('S');
  await expect(page.locator(`[data-id="${id}"] .maplabel`)).toContainText('New set (0)');
});
