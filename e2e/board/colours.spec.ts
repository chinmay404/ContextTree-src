import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const MENU = '[data-pb="cardmenu"]';
const rightClick = (page: Page, id: string) => page.locator(`[data-id="${id}"] .face`).click({ button: 'right', position: { x: 10, y: 8 } });
const colour = async (page: Page, id: string, c: string) => { await rightClick(page, id); await page.locator(`${MENU} [data-color="${c}"]`).click(); };
const patches = (page: Page) => page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'updateCard').map((c) => ({ id: c.args[1], data: (c.args[2] as { data: object }).data })));
const dataColor = (page: Page, id: string) => page.evaluate((i) => (window.__board!.card(i)!.data as { color?: string | null }).color ?? null, id);
const css = (page: Page, sel: string, prop: string) => page.locator(sel).first().evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);

test('right-click a card: a Colour row of nine swatches, the current one ringed', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await rightClick(page, 'main');
  const menu = page.locator(MENU);
  await expect(menu).toBeVisible();
  await expect(menu).toContainText('Colour');
  await expect(menu.getByRole('radio')).toHaveCount(9);
  await expect(menu.locator('[data-color="none"]')).toHaveAttribute('aria-checked', 'true');
  await expect(menu.getByRole('radiogroup', { name: 'Colour' })).toBeVisible();
  expect(await css(page, `${MENU} [data-color="none"]`, 'width')).toBe('22px');   // the menu is still scaling in, so measure the style
  const b = (await menu.boundingBox())!;
  await page.screenshot({ path: shot('colour-menu'), clip: { x: Math.max(0, b.x - 24), y: Math.max(0, b.y - 24), width: b.width + 48, height: b.height + 48 } });
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-hidden', 'true');
  expect(errs).toEqual([]);
});

test('picking a colour sends one PATCH, tints the face, survives a reload, and Default clears it', async ({ page }) => {
  await openBoard(page);
  await colour(page, 'pdf', 'blue');
  await expect(page.locator('[data-id="pdf"]')).toHaveClass(/tone-blue/);
  expect(await patches(page)).toEqual([{ id: 'pdf', data: { color: 'blue' } }]);
  expect(await css(page, '[data-id="pdf"] .face', 'background-color')).toBe('rgb(220, 233, 247)');   // --fc of Blue
  await expect(page.locator(MENU)).toHaveAttribute('aria-hidden', 'true');
  await page.evaluate(() => window.__remount!());
  await page.waitForFunction(() => document.querySelectorAll('.card[data-id]').length >= 12);
  await expect(page.locator('[data-id="pdf"]')).toHaveClass(/tone-blue/);
  await colour(page, 'pdf', 'none');
  await expect(page.locator('[data-id="pdf"]')).not.toHaveClass(/tone-/);
  expect(await dataColor(page, 'pdf')).toBeNull();
  expect((await patches(page)).map((p) => p.data)).toEqual([{ color: 'blue' }, { color: null }]);
});

test('a coloured chat gets a tinted header strip and a 2 px rim, and keeps a white body', async ({ page }) => {
  await openBoard(page);
  await colour(page, 'side', 'green');
  await expect(page.locator('[data-id="side"]')).toHaveClass(/tone-green/);
  expect(await css(page, '[data-id="side"] .chd', 'background-color')).toBe('rgb(224, 237, 217)');
  expect(await css(page, '[data-id="side"] .face', 'box-shadow')).toContain('rgb(79, 138, 69) 0px 0px 0px 2px');
  expect(await css(page, '[data-id="side"] .face', 'background-color')).toBe('rgb(255, 255, 255)');
});

test('a started chat can be coloured; a pile takes the colour on its face, not its members', async ({ page }) => {
  await openBoard(page);
  await colour(page, 'main', 'orange');
  await expect(page.locator('[data-id="main"]')).toHaveClass(/tone-orange/);
  await colour(page, 'interviews', 'teal');
  await expect(page.locator('[data-id="interviews"]')).toHaveClass(/tone-teal/);
  for (const m of ['interviews_1', 'interviews_2']) expect(await dataColor(page, m)).toBeNull();
  expect((await patches(page)).map((p) => p.id)).toEqual(['main', 'interviews']);
});

test('the swatches are a radio group you can drive from the keyboard', async ({ page }) => {
  await openBoard(page);
  await rightClick(page, 'second');
  await expect(page.locator(`${MENU} [data-color="none"]`)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(`${MENU} [data-color="graphite"]`)).toBeFocused();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(page.locator(`${MENU} [data-color="teal"]`)).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator(`${MENU} [data-color="pink"]`)).toBeFocused();
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft');   // wraps to the last
  await expect(page.locator(`${MENU} [data-color="pink"]`)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-id="second"]')).toHaveClass(/tone-pink/);
  await expect(page.locator(MENU)).toHaveAttribute('aria-hidden', 'true');
  await rightClick(page, 'second');
  await expect(page.locator(`${MENU} [data-color="pink"]`)).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator(`${MENU} [data-color="pink"]`)).toBeFocused();   // opens on the current colour
});

test('right-click on a card keeps the browser menu for text fields', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.select('main'));
  await page.locator('[data-id="main"] .compose textarea').click({ button: 'right' });
  await expect(page.locator(MENU)).toHaveAttribute('aria-hidden', 'true');
});

test('the focus view menu has the same swatches', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.openFocus('deep')); await page.waitForTimeout(700);
  await page.locator('[data-pb="focus"] [data-act="more"]').click();
  const menu = page.locator('[data-pb="focusmenu"]');
  await expect(menu.getByRole('radio')).toHaveCount(9);
  await page.screenshot({ path: shot('colour-focus-menu') });
  await menu.locator('[data-color="red"]').click();
  await expect(menu).toHaveAttribute('aria-hidden', 'true');
  expect(await dataColor(page, 'deep')).toBe('red');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-id="deep"]')).toHaveClass(/tone-red/);
});

test('zoomed out the map keeps the colour; a few coloured cards on the board', async ({ page }) => {
  await openBoard(page);
  await colour(page, 'main', 'blue'); await colour(page, 'side', 'yellow'); await colour(page, 'second', 'pink');
  await colour(page, 'pdf', 'orange'); await colour(page, 'csv', 'green'); await colour(page, 'note', 'graphite');
  await page.mouse.move(700, 880);
  await page.evaluate(() => window.__board!.select(null));
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('colour-board') });
  await page.evaluate(() => { window.__board!.camSnap(300, 300, 0.3); });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__board!.size())).toBe('S');
  await expect(page.locator('[data-id="main"]')).toHaveClass(/tone-blue/);
  await expect(page.locator('[data-id="pdf"]')).toHaveClass(/tone-orange/);
  expect(await css(page, '[data-id="main"] .maplabel', 'background-color')).toBe('rgb(220, 233, 247)');   // the label takes the tone
  await page.screenshot({ path: shot('colour-board-zoomed-out') });
});
