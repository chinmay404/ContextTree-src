import { test, expect, type CDPSession, type Page } from '@playwright/test';
import { openBoard } from './helpers';

/** Real pen and touch input through the browser's input system, not synthetic events. */
const session = (page: Page) => page.context().newCDPSession(page);

async function pen(cdp: CDPSession, type: string, x: number, y: number): Promise<void> {
  await cdp.send('Input.dispatchMouseEvent', {
    type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1,
    pointerType: 'pen', force: .6,
  } as never);
}
async function penLine(cdp: CDPSession, x0: number, y0: number, x1: number, y1: number): Promise<void> {
  await pen(cdp, 'mousePressed', x0, y0);
  for (let i = 1; i <= 8; i++) await pen(cdp, 'mouseMoved', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8);
  await pen(cdp, 'mouseReleased', x1, y1);
}
async function touchLine(cdp: CDPSession, x0: number, y0: number, x1: number, y1: number): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 6, y: y0 + (y1 - y0) * i / 6 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const paths = (page: Page) => page.locator('.inklayer path[data-mark]');
const lastMark = (page: Page) => page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'createMark').at(-1)?.args[1] as { points: number[][] } | undefined);
const clearMemory = (page: Page) => page.evaluate(() => localStorage.removeItem('ct-stylus'));

test.use({ hasTouch: true });

test('a stylus stroke keeps its pressure', async ({ page }) => {
  await openBoard(page);
  await clearMemory(page);
  await page.reload();
  await openBoard(page);
  const cdp = await session(page);
  await page.keyboard.press('d');
  await penLine(cdp, 300, 200, 560, 330);
  await expect(paths(page)).toHaveCount(1);
  expect((await lastMark(page))!.points[0]).toHaveLength(3);
});

test('after a stylus, a palm on the board draws nothing and erases nothing', async ({ page }) => {
  await openBoard(page);
  const cdp = await session(page);
  await page.keyboard.press('d');
  await penLine(cdp, 300, 200, 560, 330);
  await expect(paths(page)).toHaveCount(1);
  await touchLine(cdp, 300, 480, 560, 520);
  await page.waitForTimeout(150);
  await expect(paths(page)).toHaveCount(1);
  await page.locator('[data-pb="drawbar"] [data-tool="eraser"]').click();
  await touchLine(cdp, 400, 240, 440, 290);
  await page.waitForTimeout(150);
  await expect(paths(page)).toHaveCount(1);
});

test('the stylus is remembered, so a palm on the next visit does nothing either', async ({ page }) => {
  await openBoard(page);
  const cdp = await session(page);
  await page.keyboard.press('d');
  await penLine(cdp, 300, 200, 560, 330);
  await page.reload();
  await openBoard(page);
  const again = await session(page);
  await page.keyboard.press('d');
  const before = await paths(page).count();
  await touchLine(again, 300, 480, 560, 520);
  await page.waitForTimeout(150);
  await expect(paths(page)).toHaveCount(before);
});

test('on a note page, a palm does nothing after a stylus', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.openViewer('note'));
  const sheet = page.locator('[data-pb="notepage"]');
  await sheet.locator('[data-act="write"]').click();
  const box = (await sheet.boundingBox())!;
  const cdp = await session(page);
  await penLine(cdp, box.x + 60, box.y + 80, box.x + 300, box.y + 140);
  await expect(sheet.locator('path[data-mark]')).toHaveCount(1);
  await touchLine(cdp, box.x + 60, box.y + 240, box.x + 300, box.y + 300);
  await page.waitForTimeout(150);
  await expect(sheet.locator('path[data-mark]')).toHaveCount(1);
});

test('the live line ends where the pen is, with no lag behind it', async ({ page }) => {
  await openBoard(page);
  const cdp = await session(page);
  await page.keyboard.press('d');
  await pen(cdp, 'mousePressed', 300, 300);
  for (const x of [340, 380, 420, 460, 500, 540]) await pen(cdp, 'mouseMoved', x, 300);
  await page.waitForTimeout(60);
  const reach = await page.evaluate(() => {
    const live = [...document.querySelectorAll('.inklayer path:not([data-mark])')].at(-1) as SVGGraphicsElement;
    return live.getBoundingClientRect().right;
  });
  expect(reach).toBeGreaterThan(530);
  await pen(cdp, 'mouseReleased', 540, 300);
});

const selected = (page: Page) => page.evaluate(() => window.getSelection()!.toString());
const userSelect = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).userSelect);
const selectText = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => { window.getSelection()!.selectAllChildren(el); });

test('with the pen on, a card\'s text cannot be selected, and it can again once the pen is off', async ({ page }) => {
  await openBoard(page);
  expect(await userSelect(page, '[data-id="main"] .cbody')).toBe('text');
  await page.keyboard.press('d');
  expect(await userSelect(page, '[data-id="main"] .cbody')).toBe('none');
  await page.keyboard.press('d');
  expect(await userSelect(page, '[data-id="main"] .cbody')).toBe('text');
});

test('a selection that slips through while the pen is on goes away at once', async ({ page }) => {
  await openBoard(page);
  await page.keyboard.press('d');
  await selectText(page, '[data-id="main"] .cbody');
  await expect.poll(() => selected(page)).toBe('');
});

test('turning the pen on clears a selection made before it', async ({ page }) => {
  await openBoard(page);
  await selectText(page, '[data-id="main"] .cbody');
  expect(await selected(page)).not.toBe('');
  await page.keyboard.press('d');
  await expect.poll(() => selected(page)).toBe('');
});

test('with the pen off, a selection stays', async ({ page }) => {
  await openBoard(page);
  await selectText(page, '[data-id="main"] .cbody');
  await page.waitForTimeout(100);
  expect(await selected(page)).not.toBe('');
});

test('with the pen on, the chat bar can still be typed in and selected', async ({ page }) => {
  await openBoard(page);
  await page.keyboard.press('d');
  const field = page.locator('[data-pb="chatbar"] textarea');
  expect(await userSelect(page, '[data-pb="chatbar"] textarea')).toBe('text');
  await field.click();
  await page.keyboard.type('hello');
  await expect(field).toHaveValue('hello');
  await field.evaluate((el: HTMLTextAreaElement) => el.select());
  await page.waitForTimeout(100);
  expect(await field.evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart)).toBe(5);
});

test('on a note page, the pen takes the text out of reach until Type is pressed', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.openViewer('note'));
  const sheet = page.locator('[data-pb="notepage"]'), editor = sheet.locator('textarea.editor');
  await expect(editor).toBeVisible();
  const reach = () => editor.evaluate((el) => { const c = getComputedStyle(el); return `${c.userSelect} ${c.pointerEvents}`; });
  expect(await reach()).toBe('auto auto');
  await sheet.locator('[data-act="write"]').click();
  expect(await reach()).toBe('none none');
  await selectText(page, '.vw');
  await expect.poll(() => selected(page)).toBe('');
  await sheet.locator('[data-act="type"]').click();
  expect(await reach()).toBe('auto auto');
});
