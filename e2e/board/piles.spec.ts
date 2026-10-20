import { test, expect } from '@playwright/test';
import { center, dragPath, openBoard, trackErrors } from './helpers';

test('scrolling over a pile flips it with a slide', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => { window.__board!.select(null); window.__board!.camSnap(-500, 0, .9); }); await page.waitForTimeout(300);
  const ttl = page.locator('[data-id="interviews"] .ttl'); await page.mouse.move(...await center(page, '[data-id="interviews"] .ttl'));
  const t0 = await ttl.innerText(); await page.mouse.wheel(0, 30); await page.mouse.wheel(0, 40); await page.waitForTimeout(90);
  await expect(page.locator('[data-id="interviews"] .face.ghost')).toHaveCount(1); await page.waitForTimeout(300);
  expect(await ttl.innerText()).not.toBe(t0); await expect(page.locator('[data-id="interviews"] .meta')).toContainText('2 of 4');
  await expect(page.locator('[data-id="interviews"] .face.ghost')).toHaveCount(0);
});

test('dropping a source on another makes a pile on that desk', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page); await page.evaluate(() => { window.__board!.select(null); window.__board!.camSnap(300, 100, .45); });
  await page.evaluate(() => window.__board!.settle());
  // zoom so cards are full cards (not pebbles) and both are on screen
  await page.evaluate(() => { const b = window.__board!, w = b.box('web'), p = b.box('pdf'); const z = .6; b.camSnap(700 - ((w[0] + p[0]) / 2) * z, 450 - ((w[1] + p[1]) / 2) * z, z); });
  await page.waitForTimeout(200);
  const size = await page.evaluate(() => window.__board!.size());
  test.skip(size === 'S', 'cards too small at this viewport');
  await dragPath(page, await center(page, '[data-id="web"] .meta'), await center(page, '[data-id="pdf"] .ttl'), 25);
  await page.waitForTimeout(500); await page.evaluate(() => window.__board!.settle());
  const r = await page.evaluate(() => {
    const b = window.__board!, pile = b.cards().find((c) => c.sourceType === 'pile' && c.data && (c.data as { title?: string }).title === 'Mixed pile');
    return { pile: pile && { id: pile.id, deskId: pile.deskId, status: pile.status }, web: b.card('web')!.pileId, pdf: b.card('pdf')!.pileId };
  });
  expect(r.pile).toMatchObject({ deskId: 'main', status: 'ready' });
  expect(r.web).toBe(r.pile!.id); expect(r.pdf).toBe(r.pile!.id);
  await expect(page.locator(`[data-id="${r.pile!.id}"]`)).toHaveCount(1);
  await expect(page.locator('[data-id="web"], [data-id="pdf"]')).toHaveCount(0);
  expect(errs).toEqual([]);
});

test('Unpile puts the members back on the board', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => { window.__board!.select(null); window.__board!.camSnap(-500, 0, .9); }); await page.waitForTimeout(300);
  await page.locator('[data-id="interviews"]').hover(); await page.locator('[data-id="interviews"] [data-act="unstack"]').click();
  await page.evaluate(() => window.__board!.settle());
  await expect(page.locator('[data-id^="interviews_"].card.src')).toHaveCount(4);
  await expect(page.locator('[data-id="interviews"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__board!.card('interviews_1')!.deskId)).toBe('second');
});

test('switching a member off removes it from what the chat reads (the pile still counts as one source)', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => { window.__board!.select(null); window.__board!.camSnap(-500, 0, .9); }); await page.waitForTimeout(300);
  const foot = page.locator('[data-id="second"] .cfoot'); const num = async () => +(/^(\d+) source/.exec(await foot.innerText())?.[1] ?? NaN); const before = await num();
  const tokens = async () => { await page.evaluate(() => window.__board!.openFocus('second')); await page.waitForTimeout(500);
    const t = Number(/([\d.]+)k tokens/.exec(await page.locator('[data-pb="focus"] .fmeta').innerText())![1]);
    await page.keyboard.press('Escape'); await page.waitForTimeout(500); return t; };
  const tok0 = await tokens();
  await page.locator('[data-id="interviews"]').hover(); await page.locator('[data-id="interviews"] [data-act="expand"]').click();
  await page.locator('[data-id="interviews"] [data-mem="1"]').click();
  expect(await page.evaluate(() => (window.__board!.card('interviews_2')!.data as { off?: boolean }).off)).toBe(true);
  await page.waitForTimeout(300);
  expect(await num()).toBe(before);                 // the pile is still one source
  expect(await tokens()).toBeLessThan(tok0);        // but the member's tokens are no longer read
});
