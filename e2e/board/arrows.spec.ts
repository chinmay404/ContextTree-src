import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const T = '.pb-tubes';
const pouring = (page: Page) => page.evaluate(() => [...document.querySelectorAll('.pb-tubes .bub.pour')].map((e) => (e as SVGElement).dataset.key!).sort());
const select = async (page: Page, id: string | null) => { await page.evaluate((i) => window.__board!.select(i), id); await page.waitForTimeout(150); };

test('every kind of string has an arrowhead at its receiving end', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  // seed: 3 branch strings (lineage), 1 source wire, 1 answer string
  const arrows = await page.evaluate(() => [...document.querySelectorAll('.pb-tubes .arrow')].map((a) => {
    const bb = (a as SVGGraphicsElement).getBBox(), to = (a as SVGElement).dataset.to!, kind = (a as SVGElement).dataset.kind!;
    return { kind, to, x0: bb.x, x1: bb.x + bb.width, y: bb.y + bb.height / 2, box: window.__board!.box(to) };
  }));
  expect(arrows.map((a) => a.kind).sort()).toEqual(['answer', 'lineage', 'lineage', 'lineage', 'wire']);
  expect(arrows.filter((a) => a.kind === 'lineage').map((a) => a.to).sort()).toEqual(['deep', 'second', 'side']);
  for (const a of arrows) {
    const [bx0, by0, bx1, by1] = a.box;
    // the head is a few px outside the receiving card's edge, level with the string's end, and clear of the card itself
    const left = a.x1 <= bx0, right = a.x0 >= bx1;
    expect(left || right, `${a.kind} -> ${a.to} is beside the card`).toBe(true);
    expect(Math.min(Math.abs(bx0 - a.x1), Math.abs(a.x0 - bx1)), `${a.kind} -> ${a.to} is near the port`).toBeLessThan(20);
    expect(a.y).toBeGreaterThan(by0); expect(a.y).toBeLessThan(by1);
  }
  await page.screenshot({ path: shot('string-arrows') });
  await page.screenshot({ path: shot('string-arrows-detail'), clip: { x: 380, y: 160, width: 420, height: 340 } });
  expect(errs).toEqual([]);
});

test('arrows are drawn with the strings: still there after a drag, and gone with a deleted string', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.snapBy('second', 0, 200));
  await page.waitForTimeout(300);
  await expect(page.locator(`${T} .arrow`)).toHaveCount(5);
  await page.evaluate(() => window.__board!.clickDisconnect('s|csv|deep'));
  await expect(page.locator(`${T} .arrow`)).toHaveCount(4);
  await expect(page.locator(`${T} .arrow[data-kind="wire"]`)).toHaveCount(0);
});

test('selecting a chat animates exactly its own strings', async ({ page }) => {
  await openBoard(page);
  expect(await pouring(page)).toEqual([]);
  await select(page, 'second');
  expect(await pouring(page)).toEqual(['t|deep', 't|second']);   // the string in from Q1 and the one out to Q1.2.1
  await select(page, 'deep');
  expect(await pouring(page)).toEqual(['a|side|deep', 's|csv|deep', 't|deep']);
  expect(await page.locator(`${T} .bub.pour`).first().evaluate((e) => getComputedStyle(e).animationName)).toBe('pb-bubbles');
  expect(await page.locator(`${T} .bub.pour`).first().evaluate((e) => getComputedStyle(e).animationDuration)).toBe('1.2s');
  await select(page, null);
  expect(await pouring(page)).toEqual([]);
  await select(page, 'csv');   // a source: its wire
  expect(await pouring(page)).toEqual(['s|csv|deep']);
});

test('a hovered string flows and says where it goes', async ({ page }) => {
  await openBoard(page);
  const pt = await page.evaluate(() => window.__board!.wirePoint('s|csv|deep', 0.5)!);
  await page.mouse.move(pt[0], pt[1]);
  await expect(page.locator('.strlabel.on')).toHaveText('Competitor prices → Would a team plan change this?');
  expect(await pouring(page)).toEqual(['s|csv|deep']);
  await page.screenshot({ path: shot('string-hover-label') });
  await page.mouse.move(700, 880);
  await expect(page.locator('.strlabel.on')).toHaveCount(0);
  expect(await pouring(page)).toEqual([]);
  // a branch string too
  const tp = await page.evaluate(() => {
    const hit = document.querySelector<SVGPathElement>('.pb-tubes .hit[data-key="t|second"]')!, len = hit.getTotalLength(), p = hit.getPointAtLength(len * 0.5), c = window.__board!.cam();
    return [p.x * c.z + c.x, p.y * c.z + c.y];
  });
  await page.mouse.move(tp[0], tp[1]);
  await expect(page.locator('.strlabel.on')).toHaveText('How should I price Context Tree? → Second opinion with real customers');
  expect(await pouring(page)).toEqual(['t|second']);
});

test('the flowing frames: a selected chat, three moments', async ({ page }) => {
  await openBoard(page);
  await select(page, 'second');
  await page.mouse.move(700, 880);
  for (const i of [1, 2, 3]) { await page.screenshot({ path: shot(`string-flow-${i}`), clip: { x: 380, y: 200, width: 700, height: 340 } }); await page.waitForTimeout(260); }
});

test('reduced motion: arrows only, no flowing dots', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page);
  await select(page, 'deep');
  const pour = page.locator(`${T} .bub.pour`).first();
  expect(await pour.evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  expect(await pour.evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
  await expect(page.locator(`${T} .arrow`)).toHaveCount(5);
  await expect(page.locator(`${T} .arrow`).first()).toBeVisible();
});

test('arrows hide when the board is zoomed far out', async ({ page }) => {
  await openBoard(page);
  await expect(page.locator(`${T} .arrow`).first()).toBeVisible();
  await page.evaluate(() => window.__board!.camSnap(300, 300, 0.3));
  await page.waitForTimeout(300);
  await expect(page.locator(`${T} .arrow`).first()).toBeHidden();
  await page.evaluate(() => window.__board!.camSnap(300, 300, 0.5));
  await page.waitForTimeout(300);
  await expect(page.locator(`${T} .arrow`).first()).toBeVisible();
});
