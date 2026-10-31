import { test, expect, type Page } from '@playwright/test';
import { center, dragPath, openBoard, trackErrors } from './helpers';

/** Frame two cards at a readable zoom, drop one on the other, and report what happened. */
async function dropOn(page: Page, from: string, to: string, z = .6, grab = '.face', onto = '.face') {
  await page.evaluate(([a, b, zoom]) => {
    const h = window.__board!, p = h.box(a as string), q = h.box(b as string), k = zoom as number;
    h.select(null);
    h.camSnap(700 - ((p[0] + q[0]) / 2) * k, 450 - ((p[1] + q[1]) / 2) * k, k);
  }, [from, to, z] as const);
  await page.evaluate(() => window.__board!.settle());
  await dragPath(page, await center(page, `[data-id="${from}"] ${grab}`), await center(page, `[data-id="${to}"] ${onto}`), 25);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__board!.settle());
  return page.evaluate(([a, b]) => {
    const h = window.__board!;
    return { from: h.card(a as string)?.pileId ?? null, to: h.card(b as string)?.pileId ?? null };
  }, [from, to] as const);
}

const stacked = (r: { from: string | null; to: string | null }) => { expect(r.from).toBeTruthy(); expect(r.to).toBe(r.from); };

test('two files stack', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  stacked(await dropOn(page, 'web', 'pdf'));
  expect(errs).toEqual([]);
});

test('a note stacks on a file', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  stacked(await dropOn(page, 'note', 'pdf', .6, '.meta'));   // a note's body is for selecting text; its header drags
  expect(errs).toEqual([]);
});

test('a file stacks on a note', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  stacked(await dropOn(page, 'pdf', 'note'));
  expect(errs).toEqual([]);
});

test('a loose file stacks on a file on a desk', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  stacked(await dropOn(page, 'csv', 'web'));
  expect(errs).toEqual([]);
});

test('two files stack when zoomed out to the small card size', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  stacked(await dropOn(page, 'web', 'csv', .45));
  expect(errs).toEqual([]);
});

test('two loose sources stack on the zoomed-out map of names', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await page.evaluate(() => { window.__board!.card('podcast')!.status = 'ready'; window.__board!.rerender(); });
  stacked(await dropOn(page, 'csv', 'podcast', .25, '.maplabel', '.maplabel'));
  expect(errs).toEqual([]);
});

test('a source still being read does not stack', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => { window.__board!.card('pdf')!.status = 'processing'; window.__board!.rerender(); });
  const r = await dropOn(page, 'web', 'pdf');
  expect(r.from).toBeNull();
});
