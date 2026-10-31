import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { closeUp, openBoard, trackErrors } from './helpers';

/** Line breaks survive a paste into a note, Enter, the format bar, and the board's own paste (bug, 2026-10-24). */
const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const PASTE = 'Para one.\n## Heading\nYou want X.';
const textOf = (page: Page, id: string) => page.evaluate((i) => (window.__board!.card(i)!.data as { text?: string }).text ?? '', id);
const saved = (page: Page, id: string) => page.evaluate((i) => window.__mock!.calls
  .filter((c) => c.method === 'updateCard' && c.args[1] === i).map((c) => (c.args[2] as { data?: { text?: string } }).data?.text).filter((t) => t !== undefined).at(-1), id);

/** Add → Note: a new empty note, focused. Returns its id. */
async function newNote(page: Page): Promise<string> {
  const before = await page.evaluate(() => window.__board!.sources().filter((c) => c.sourceType === 'note').map((c) => c.id));
  await page.click('[data-pb="add"]');
  await page.click('[data-pb="menu"] [data-m="note"]');
  await expect.poll(() => page.evaluate(() => document.activeElement?.matches('.note-in .n') ?? false)).toBe(true);
  return page.evaluate((b) => window.__board!.sources().find((c) => c.sourceType === 'note' && !b.includes(c.id))!.id, before);
}

/**
 * A paste event with plain text and (optionally) HTML on the clipboard, at the focused note or the body.
 * Firefox's constructor ignores `clipboardData` and takes the plain text as `dataType` and `data` instead.
 */
const pasteEvent = (page: Page, text: string, html?: string) => page.evaluate(([t, h]) => {
  const dt = new DataTransfer();
  if (h) dt.setData('text/html', h);
  dt.setData('text/plain', t!);
  const init = { clipboardData: dt, dataType: 'text/plain', data: t, bubbles: true, cancelable: true } as ClipboardEventInit;
  (document.activeElement ?? document.body).dispatchEvent(new ClipboardEvent('paste', init));
}, [text, html] as const);
const pasteInto = pasteEvent;

/** Puts text on the real clipboard with a real Ctrl+C from a throwaway field; focus then goes to `then`, or nowhere. */
async function copyReally(page: Page, text: string, then?: string): Promise<void> {
  await page.evaluate((t) => {
    const a = document.createElement('textarea');
    a.id = 'clip'; a.value = t; a.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
    document.body.appendChild(a); a.focus(); a.select();
  }, text);
  await page.keyboard.press('Control+C');
  await page.evaluate((s) => { document.getElementById('clip')!.remove(); if (s) document.querySelector<HTMLElement>(s)!.focus(); }, then);
}

test('a real Ctrl+C and Ctrl+V from another field keeps every line break', async ({ page }) => {
  await openBoard(page);
  const id = await newNote(page);
  await copyReally(page, PASTE, `.card[data-id="${id}"] .n`);
  await page.keyboard.press('Control+V');
  await expect.poll(() => textOf(page, id)).toBe(PASTE);
});

for (const theme of ['light', 'dark'] as const) {
  test(`a paste into a note keeps every line break and draws the heading (${theme})`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.emulateMedia({ colorScheme: theme });
    await openBoard(page);
    const id = await newNote(page);
    await pasteInto(page, PASTE);
    await expect.poll(() => textOf(page, id)).toBe(PASTE);
    await expect.poll(() => saved(page, id), { timeout: 3000 }).toBe(PASTE);   // the debounced save sends it as it is
    await page.mouse.click(700, 60);                                            // leave the note: its Markdown is drawn
    const n = page.locator(`.card[data-id="${id}"] .n`);
    await expect(n).toHaveClass(/\bmd\b/);
    await expect(n.locator('h3, h4')).toHaveText('Heading');
    await expect(n).toContainText('Para one.');
    await expect(n).toContainText('You want X.');
    await page.waitForTimeout(300);
    await closeUp(page, id, shot(`notes-paste-${theme}`));
    expect(errs).toEqual([]);
  });
}

test('a paste in the middle of a note goes in at the caret, and typing carries on after it', async ({ page }) => {
  await openBoard(page);
  const id = await newNote(page);
  await page.keyboard.type('Start. End.');
  await page.evaluate(() => {   // caret after "Start. "
    const el = document.activeElement!, r = document.createRange();
    r.setStart(el.firstChild!, 7); r.collapse(true);
    const s = getSelection()!; s.removeAllRanges(); s.addRange(r);
  });
  await pasteInto(page, 'A\nB\n');
  await page.keyboard.type('C ');
  await expect.poll(() => textOf(page, id)).toBe('Start. A\nB\nC End.');
});

test('pasted HTML still becomes plain text, and keeps its lines', async ({ page }) => {
  await openBoard(page);
  const id = await newNote(page);
  await pasteInto(page, 'Bold line\nsecond line', '<p><b style="color:red">Bold line</b></p><p>second line</p><script>window.__xss=1</script>');
  await expect.poll(() => textOf(page, id)).toBe('Bold line\nsecond line');
  expect(await page.locator(`.card[data-id="${id}"] .n`).evaluate((e) => e.querySelector('b, p, script, span[style]') === null)).toBe(true);
});

test('Enter still makes a new line', async ({ page }) => {
  await openBoard(page);
  const id = await newNote(page);
  await page.keyboard.type('Line one');
  await page.keyboard.press('Enter');
  await page.keyboard.type('## Line two');
  await expect.poll(() => textOf(page, id)).toBe('Line one\n## Line two');
});

test('a note whose editor holds <br> or <div> lines saves them as new lines, and the format bar keeps them', async ({ page }) => {
  await openBoard(page);
  const id = await newNote(page);
  // what some browsers write for Enter in a rich editable: <br> and <div> lines
  await page.evaluate(() => { const el = document.activeElement as HTMLElement; el.innerHTML = 'one<br>two<div>three</div>'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect.poll(() => textOf(page, id)).toBe('one\ntwo\nthree');
  await page.evaluate(() => {   // select "two"
    const el = document.activeElement!, t = el.childNodes[2], r = document.createRange();
    r.setStart(t, 0); r.setEnd(t, 3);
    const s = getSelection()!; s.removeAllRanges(); s.addRange(r);
  });
  await expect(page.locator('[data-pb="fmtbar"]')).toHaveAttribute('aria-hidden', 'false');
  await page.locator('[data-pb="fmtbar"] [data-fmt="bold"]').click();
  await expect.poll(() => textOf(page, id)).toBe('one\n**two**\nthree');
});

test('text pasted on the board becomes a note with all of it, up to what the engine reads', async ({ page }) => {
  await openBoard(page);
  const long = Array.from({ length: 30 }, (_, i) => `Line ${i + 1}: ${'word '.repeat(8).trim()}`).join('\n');   // about 1400 characters
  expect(long.length).toBeGreaterThan(600);
  await copyReally(page, long);
  await page.keyboard.press('Control+V');
  await page.locator('[data-pb="paste"] [data-act="pv-note"]').click();
  const text = await page.evaluate(() => (window.__board!.sources().find((c) => (c.data as { meta?: string }).meta === 'Note · pasted')!.data as { text: string }).text);
  expect(text).toBe(long);
  const huge = 'x'.repeat(5000);
  await copyReally(page, huge);
  await page.keyboard.press('Control+V');
  await page.locator('[data-pb="paste"] [data-act="pv-note"]').click();
  const lens = await page.evaluate(() => window.__board!.sources().filter((c) => (c.data as { meta?: string }).meta === 'Note · pasted').map((c) => (c.data as { text: string }).text.length));
  expect(lens).toContain(4000);
});
