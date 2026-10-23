import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const BOX = '[data-pb="paste"]';
const IN = `${BOX} textarea`;
const sources = (page: Page) => page.evaluate(() => window.__board!.sources().map((c) => ({ id: c.id, type: c.sourceType, desk: c.deskId, data: c.data as { url?: string; text?: string; meta?: string; title?: string } })));
const pasteEvent = (page: Page, text: string) => page.evaluate((t) => {
  const dt = new DataTransfer(); dt.setData('text/plain', t);
  document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}, text);
const open = (page: Page) => openBoard(page, '?ingestMs=200');
const isOpen = (page: Page) => page.locator(BOX).getAttribute('aria-hidden').then((v) => v !== 'true');

test('V opens a centred box with the field focused; Esc closes it and gives focus back', async ({ page }) => {
  const errs = trackErrors(page);
  await open(page);
  await page.keyboard.press('v');
  await expect(page.locator(BOX)).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator(IN)).toBeFocused();
  const box = (await page.locator(`${BOX} .pastebox`).boundingBox())!;
  const vp = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - vp.width / 2)).toBeLessThan(6);
  expect(Math.abs(box.y + box.height / 2 - vp.height / 2)).toBeLessThan(vp.height * 0.2);
  await page.screenshot({ path: shot('paste-box-empty') });
  await page.keyboard.press('Escape');
  await expect(page.locator(BOX)).toHaveAttribute('aria-hidden', 'true');
  expect(errs).toEqual([]);
});

test('V does nothing while typing or with a sheet open', async ({ page }) => {
  await open(page);
  await page.keyboard.press('n'); await page.waitForTimeout(150);     // a new note's field has focus
  await page.keyboard.type('v');
  expect(await isOpen(page)).toBe(false);
  await page.keyboard.press('Escape');
  await page.keyboard.press('q');                                      // the question sheet is open
  await page.keyboard.press('v');
  expect(await isOpen(page)).toBe(false);
});

test('a link is previewed in the same box; clicking it adds a web card on the selected desk', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.__board!.select('main'));
  const n = (await sources(page)).length;
  await page.keyboard.press('v');
  await page.locator(IN).fill('example.com/pricing');
  const pv = page.locator(`${BOX} [data-act="pv-link"]`);
  await expect(pv).toHaveAttribute('data-state', 'ok');
  await expect(pv).toContainText('A page at example.com');
  await expect(pv).toContainText('A short description of what the page is about.');
  await page.screenshot({ path: shot('paste-box-link') });
  await pv.click();
  await expect(page.locator(BOX)).toHaveAttribute('aria-hidden', 'true');
  const all = await sources(page);
  expect(all.length).toBe(n + 1);
  const added = all.find((c) => c.data.url === 'https://example.com/pricing')!;
  expect([added.type, added.desk]).toEqual(['web', 'main']);
  expect(await page.evaluate(() => window.__board!.selected())).toBe(added.id);   // the new card is selected
});

test('Enter adds a link; with nothing selected it lands loose', async ({ page }) => {
  await open(page);
  await page.keyboard.press('v');
  await page.locator(IN).fill('https://example.com/a');
  await page.keyboard.press('Enter');
  const added = (await sources(page)).find((c) => c.data.url === 'https://example.com/a')!;
  expect(added.desk).toBeNull();
});

test('a YouTube link shows its thumbnail and says reading is coming soon', async ({ page }) => {
  await open(page);
  await page.keyboard.press('v');
  await page.locator(IN).fill('https://youtu.be/abc123');
  const pv = page.locator(`${BOX} [data-act="pv-link"]`);
  await expect(pv).toHaveAttribute('data-kind', 'video');
  await expect(pv).toContainText('YouTube');
  await expect(pv).toContainText('coming soon');
  expect(await pv.locator('.tile').evaluate((e) => (e as HTMLElement).style.backgroundImage)).toContain('i.ytimg.com/vi/abc123/hqdefault.jpg');
  await page.keyboard.press('Enter');
  const v = (await sources(page)).find((c) => c.type === 'video');
  expect(v).toBeTruthy();
});

test('text is shown as a note and added as one', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.__board!.select('main'));
  await page.keyboard.press('v');
  await page.locator(IN).fill('Ask Marco about the team plan.\nAnd the annual discount.');
  const note = page.locator(`${BOX} [data-act="pv-note"]`);
  await expect(note).toContainText('Ask Marco about the team plan.');
  await page.screenshot({ path: shot('paste-box-note') });
  await page.keyboard.press('Enter');
  const c = (await sources(page)).find((x) => x.data.text?.startsWith('Ask Marco'))!;
  expect([c.type, c.data.meta, c.desk]).toEqual(['note', 'Note · pasted', 'main']);
});

test('Shift+Enter is a new line, not an add', async ({ page }) => {
  await open(page);
  const n = (await sources(page)).length;
  await page.keyboard.press('v');
  await page.locator(IN).fill('first line');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('second line');
  expect(await page.locator(IN).inputValue()).toBe('first line\nsecond line');
  expect((await sources(page)).length).toBe(n);
});

test('several links make a list; each can be added, or all at once', async ({ page }) => {
  await open(page);
  const n = (await sources(page)).length;
  await page.keyboard.press('v');
  await page.locator(IN).fill('https://a.example.com/x\nhttps://b.example.com/y\nc.example.org');
  await expect(page.locator(`${BOX} [data-act="pv-link"]`)).toHaveCount(3);
  await expect(page.locator(`${BOX} [data-act="pb-add"]`)).toHaveText('Add all');
  await page.screenshot({ path: shot('paste-box-list') });
  await page.locator(`${BOX} [data-act="pv-link"]`).nth(1).click();    // just the second one
  const one = await sources(page);
  expect(one.length).toBe(n + 1);
  expect(one.some((c) => c.data.url === 'https://b.example.com/y')).toBe(true);
  await page.keyboard.press('v');
  await page.locator(IN).fill('https://a.example.com/x\nhttps://c.example.org');
  await expect(page.locator(`${BOX} [data-act="pv-link"]`)).toHaveCount(2);
  await page.keyboard.press('Enter');
  expect((await sources(page)).length).toBe(n + 3);
});

test('a link that cannot be opened says so and offers to add it as a note', async ({ page }) => {
  await open(page);
  const n = (await sources(page)).length;
  await page.keyboard.press('v');
  await page.locator(IN).fill('https://blocked.example.com/secret');
  const err = page.locator(`${BOX} .pverr`);
  await expect(err).toContainText("Couldn't open that link");
  await expect(page.locator(`${BOX} [data-act="pb-add"]`)).toBeDisabled();
  await page.screenshot({ path: shot('paste-box-blocked') });
  await err.locator('[data-act="pv-asnote"]').click();
  const c = (await sources(page)).find((x) => x.data.text === 'https://blocked.example.com/secret')!;
  expect(c.type).toBe('note');
  expect((await sources(page)).length).toBe(n + 1);
});

test('a plain paste on the board opens the box with the clipboard in it; nothing is added until Enter', async ({ page }) => {
  await open(page);
  const n = (await sources(page)).length;
  await pasteEvent(page, 'https://example.com/from-clipboard');
  await expect(page.locator(BOX)).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator(IN)).toHaveValue('https://example.com/from-clipboard');
  await expect(page.locator(`${BOX} [data-act="pv-link"]`)).toBeVisible();
  expect((await sources(page)).length).toBe(n);
  await page.keyboard.press('Enter');
  expect((await sources(page)).length).toBe(n + 1);
});

test('a paste while typing in a field is left alone', async ({ page }) => {
  await open(page);
  await page.keyboard.press('n'); await page.waitForTimeout(150);     // a new note, its field focused
  const n = (await sources(page)).length;
  await page.evaluate(() => {
    const dt = new DataTransfer(); dt.setData('text/plain', 'https://example.com/x');
    document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(200);
  expect(await isOpen(page)).toBe(false);
  expect((await sources(page)).length).toBe(n);
});

test('the scrim closes the box, and the text is not kept for the next opening', async ({ page }) => {
  await open(page);
  await page.keyboard.press('v');
  await page.locator(IN).fill('half-typed');
  await page.mouse.click(8, 8);
  await expect(page.locator(BOX)).toHaveAttribute('aria-hidden', 'true');
  await page.keyboard.press('v');
  await expect(page.locator(IN)).toHaveValue('');
});
