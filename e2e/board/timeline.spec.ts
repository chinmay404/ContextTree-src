import { test, expect, type Page } from '@playwright/test';
import { openBoard, trackErrors } from './helpers';

const F = '[data-pb="focus"] .in:not(.fx-out)';
const SHOTS = process.env.PW_SHOTS;
const openFocus = async (page: Page, id: string) => { await page.evaluate((i) => window.__board!.openFocus(i), id); await page.waitForTimeout(700); };
const addRoot = (page: Page, name: string) => page.evaluate((n) => {
  window.__board!.openSheet('root'); window.__board!.setDialogFirst(n); return window.__board!.confirmDialog();
}, name);

test('the whole family hangs off its root, with a line traced to the current chat', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page); await openFocus(page, 'deep');
  await expect(page.locator(`${F} .tl .tr-head`)).toHaveCount(1);
  await expect(page.locator(`${F} .tl .tr-head`)).toContainText('Q1');
  await expect(page.locator(`${F} .tl .tr-row`)).toHaveCount(3);       // Q1.1, Q1.2, Q1.2.1
  await expect(page.locator(`${F} .tl .tr-base`)).toHaveCount(3);
  await expect(page.locator(`${F} .tl .tr-reach`)).toHaveCount(2);     // Q1 to Q1.2 to Q1.2.1, not Q1.1
  await expect(page.locator(`${F} .tl .cur`)).toContainText('Q1.2.1');
  await expect(page.locator(`${F} .tl .cur`)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator(`${F} .tl .tr-sec[data-here] .tr-mark`)).toHaveCount(1);
  expect(errs).toEqual([]);
});

test('every branch ends at its own row, just before the icon', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'deep');
  const ends = await page.$$eval(`${F} .tl .tr-tree`, (trees) => trees.flatMap((t) => {
    const rows = [...t.querySelectorAll('.tr-row')], paths = [...t.querySelectorAll<SVGPathElement>('.tr-base')];
    return paths.map((p, i) => {
      const end = p.getPointAtLength(p.getTotalLength()).matrixTransform(p.getScreenCTM()!);
      const icon = rows[i].querySelector('svg')!.getBoundingClientRect(), row = rows[i].getBoundingClientRect();
      return { gap: icon.left - end.x, y: end.y, top: row.top, bottom: row.bottom };
    });
  }));
  expect(ends.length).toBe(3);
  for (const e of ends) {
    expect(e.gap).toBeGreaterThanOrEqual(0);
    expect(e.gap).toBeLessThanOrEqual(6);
    expect(e.y).toBeGreaterThan(e.top);
    expect(e.y).toBeLessThan(e.bottom);
  }
});

test('other root questions show as closed sections, and any row opens its chat', async ({ page }) => {
  await openBoard(page);
  const other = await addRoot(page, 'Another question');
  await page.waitForTimeout(300);
  await openFocus(page, 'deep');
  await expect(page.locator(`${F} .tl .tr-head`)).toHaveCount(2);
  await page.locator(`${F} .tl [data-go="${other}"]`).click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__board!.focus())).toBe(other);
  await page.locator(`${F} .tl [data-go="main"]`).click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__board!.focus())).toBe('main');
});

test('a section folds with its chevron, leaves the keyboard order, and stays folded when you switch chat', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'deep');
  const fold = page.locator(`${F} .tl .tr-fold`).first();
  await expect(fold).toHaveAttribute('aria-expanded', 'true');
  await fold.click();
  await expect(fold).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator(`${F} .tl .tr-body`).first()).toHaveAttribute('inert', '');
  await page.waitForTimeout(450);
  expect(await page.locator(`${F} .tl .tr-fold-in`).first().evaluate((el) => el.getBoundingClientRect().height)).toBe(0);
  await page.locator(`${F} .tl [data-go="main"]`).click();
  await page.waitForTimeout(500);
  await expect(page.locator(`${F} .tl .tr-fold`).first()).toHaveAttribute('aria-expanded', 'false');
});

test('a long question shortens instead of widening the panel, and the row tells the full story on hover', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(async () => {
    await window.__mock!.updateCard('b_seed', 'second', { data: { name: 'A very long question about pricing that goes on and on well past the width of any panel' } });
    await window.__board!.refresh();
  });
  await openFocus(page, 'deep');
  const tl = page.locator(`${F} .tl`);
  expect(await tl.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const row = page.locator(`${F} .tl [data-go="second"]`);
  await expect(row).toHaveAttribute('title', /Q1\.2 · .* · Asked with \d+ sources? · Branched/);
  expect(await row.locator('.t').evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
});

test('reduced motion: the line is simply there, nothing draws', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page); await openFocus(page, 'deep');
  const reach = page.locator(`${F} .tl .tr-reach`).first();
  expect(await reach.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  expect(await reach.evaluate((el) => getComputedStyle(el).strokeDashoffset)).toMatch(/^0(px)?$/);
});

for (const theme of ['light', 'dark'] as const) {
  test(`the timeline reads in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await openBoard(page);
    await addRoot(page, 'Another question');
    await page.waitForTimeout(300);
    await openFocus(page, 'deep');
    await page.waitForTimeout(900);
    const reach = await page.locator(`${F} .tl .tr-reach`).first().evaluate((el) => getComputedStyle(el).stroke);
    const base = await page.locator(`${F} .tl .tr-base`).first().evaluate((el) => getComputedStyle(el).stroke);
    expect(reach).not.toBe(base);
    if (SHOTS) await page.locator('[data-pb="focus"] .panel').screenshot({ path: `${SHOTS}/timeline-${theme}.png` });
  });
}
