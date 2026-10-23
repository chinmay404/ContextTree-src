import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const zoomTo = async (page: Page, z: number) => {
  await page.evaluate((zz) => {
    const b = window.__board!, boxes = b.cards().filter((c) => !c.pileId).map((c) => b.box(c.id));
    const x0 = Math.min(...boxes.map((x) => x[0])), x1 = Math.max(...boxes.map((x) => x[2])), y0 = Math.min(...boxes.map((x) => x[1])), y1 = Math.max(...boxes.map((x) => x[3]));
    b.select(null);
    b.camSnap(720 - ((x0 + x1) / 2) * zz, 450 - ((y0 + y1) / 2) * zz, zz);
  }, z);
  await page.waitForTimeout(400);
};
/** On-screen font size of an element in px: its CSS size times the transform that scales it. */
const screenFont = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => {
  const r = e.getBoundingClientRect(), own = e.getBoundingClientRect().width / (e as HTMLElement).offsetWidth;
  return parseFloat(getComputedStyle(e).fontSize) * (isFinite(own) && own > 0 ? own : 1) + 0 * r.width;
});

test('zoomed out, every card is a name: chats by their question, sources by their title', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await zoomTo(page, 0.3);
  expect(await page.evaluate(() => window.__board!.size())).toBe('S');
  const labels = await page.locator('.card.size-s .maplabel').evaluateAll((els) => els.map((e) => ({ id: (e.closest('.card') as HTMLElement).dataset.id!, text: e.textContent!.trim() })));
  const by = Object.fromEntries(labels.map((l) => [l.id, l.text]));
  expect(labels.length).toBe(12);                                           // the 12 cards on the board: chats, sources and the pile
  expect(by.main).toContain('How should I price Context Tree?');
  expect(by.side).toContain('What does value-based pricing mean?');
  expect(by.second).toContain('Second opinion with real customers');
  expect(by.deep).toContain('Would a team plan change this?');
  expect(by.pdf).toContain('Pricing survey 2025');
  expect(by.csv).toContain('Competitor prices');
  expect(by.web).toContain('Why we doubled our price');
  expect(by.interviews).toContain('Customer interviews');
  expect(by.interviews).toContain('4');                                     // a pile says how many it holds
  await expect(page.locator('.card.size-s')).toHaveCount(12);               // the class the acceptance specs lean on stays
  await expect(page.locator('.card.size-s .s.blob')).toHaveCount(0);        // no blobs any more
  await page.screenshot({ path: shot('map-of-names') });
  expect(errs).toEqual([]);
});

test('no desk frames in the map; strings still join the names', async ({ page }) => {
  await openBoard(page);
  const strings = await page.evaluate(() => document.querySelectorAll('.pb-tubes .tube, .pb-tubes .wire').length);
  expect(strings).toBeGreaterThan(0);
  await zoomTo(page, 0.3);
  for (const d of await page.locator('.desk').all()) await expect(d).toBeHidden();
  expect(await page.evaluate(() => document.querySelectorAll('.pb-tubes .tube, .pb-tubes .wire').length)).toBe(strings);
  for (const p of await page.locator('.pb-tubes .tube').all()) expect(await p.evaluate((e) => (e as SVGPathElement).getTotalLength())).toBeGreaterThan(20);
  await zoomTo(page, 0.6);                                                   // back above 50%: the desks and the cards come back
  expect(await page.evaluate(() => window.__board!.size())).toBe('M');
  await expect(page.locator('.desk[data-chat="main"]')).toBeVisible();
  await expect(page.locator('.card .maplabel')).toHaveCount(0);
});

test('the labels stay readable at any zoom: 11 to 16 px on screen at 20% and at 40%', async ({ page }) => {
  await openBoard(page);
  for (const z of [0.2, 0.4]) {
    await zoomTo(page, z);
    const chat = await screenFont(page, '[data-id="main"] .maplabel .nm');
    const src = await screenFont(page, '[data-id="pdf"] .maplabel .nm');
    for (const px of [chat, src]) { expect(px, `z ${z}`).toBeGreaterThanOrEqual(11); expect(px, `z ${z}`).toBeLessThanOrEqual(16); }
    expect(chat).toBeGreaterThan(src);                                       // a question outranks a source
  }
});

test('a chat label carries its model mark in its colour; a source label its type icon; a long name stops at two lines', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__mock!.updateCard('b_seed', 'main', { data: { name: 'A very long question that goes on and on about pricing, packaging, tiers, seats, annual discounts and what founders in the first year should charge for it' } }));
  await page.evaluate(() => window.__board!.refresh());
  await zoomTo(page, 0.3);
  await expect(page.locator('[data-id="main"] .maplabel svg.mmark')).toHaveCount(1);
  expect(await page.locator('[data-id="main"] .maplabel').evaluate((e) => getComputedStyle(e).getPropertyValue('--c').trim())).toBe('#E0673A');   // Claude's colour
  await expect(page.locator('[data-id="pdf"] .maplabel .i')).toHaveCount(1);
  const lines = await page.locator('[data-id="main"] .maplabel .nm').evaluate((e) => { const s = getComputedStyle(e); return Math.round(e.getBoundingClientRect().height / (parseFloat(s.lineHeight) * (e.getBoundingClientRect().width / (e as HTMLElement).offsetWidth))); });
  expect(lines).toBeLessThanOrEqual(2);
});

test('labels can still be selected, opened and dragged', async ({ page }) => {
  await openBoard(page);
  await zoomTo(page, 0.3);
  await page.locator('[data-id="second"] .maplabel').click();
  expect(await page.evaluate(() => window.__board!.selected())).toBe('second');
  await page.locator('[data-id="second"] .maplabel').dblclick();
  await expect.poll(() => page.evaluate(() => window.__board!.focus())).toBe('second');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
});

test('a chat that is answering shows a dot on its label', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=1500&wordMs=120');
  await page.evaluate(() => window.__board!.select('side'));
  await page.locator('[data-id="side"] .compose textarea').fill('And annual plans?');
  await page.keyboard.press('Enter');
  await expect(page.locator('.desk[data-chat="side"]')).toHaveClass(/running/);
  await zoomTo(page, 0.3);
  await expect(page.locator('[data-id="side"] .maplabel .rundot')).toHaveCount(1);
  await expect(page.locator('[data-id="main"] .maplabel .rundot')).toHaveCount(0);
});

test('a coloured card keeps its colour in the map', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__mock!.updateCard('b_seed', 'pdf', { data: { color: 'blue' } }));
  await page.evaluate(() => window.__board!.refresh());
  await zoomTo(page, 0.3);
  expect(await page.locator('[data-id="pdf"] .maplabel').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(220, 233, 247)');
});

test('sets and notes are named too', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.refresh());
  await zoomTo(page, 0.3);
  await expect(page.locator('[data-id="note"] .maplabel')).toContainText('Costs');
});
