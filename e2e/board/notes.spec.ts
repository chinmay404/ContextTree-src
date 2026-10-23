import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const N = '.card[data-id="note"] .n';
const BAR = '[data-pb="fmtbar"]';
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
const noteText = (page: Page, id = 'note') => page.evaluate((i) => (window.__board!.card(i)!.data as { text?: string }).text ?? '', id);

/** Select characters [a, b) of the note's text (it holds one text node while it is being edited). */
const select = (page: Page, sel: string, a: number, b: number) => page.evaluate(([s, x, y]) => {
  const el = document.querySelector(s as string)!;
  const t = el.firstChild!, r = document.createRange();
  r.setStart(t, x as number); r.setEnd(t, y as number);
  const g = getSelection()!; g.removeAllRanges(); g.addRange(r);
}, [sel, a, b] as const);

const edit = async (page: Page) => { await page.locator(N).click(); await expect(page.locator(N)).not.toHaveClass(/\bmd\b/); };

test('a note shows Markdown when it is not being edited, and its plain text while it is', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__mock!.updateCard('b_seed', 'note', { data: { text: '# Plan\n**Ask** about *annual* plans\n\n- one\n- two' } }));
  await page.evaluate(() => window.__board!.refresh());
  await expect(page.locator(N)).toHaveClass(/\bmd\b/);
  await expect(page.locator(`${N} h3`)).toHaveText('Plan');
  await expect(page.locator(`${N} b`)).toHaveText('Ask');
  await expect(page.locator(`${N} i`)).toHaveText('annual');
  await expect(page.locator(`${N} ul li`)).toHaveCount(2);
  await page.screenshot({ path: shot('note-rendered'), clip: { x: 40, y: 380, width: 300, height: 220 } });
  await edit(page);
  expect(await page.locator(N).evaluate((e) => e.textContent)).toBe('# Plan\n**Ask** about *annual* plans\n\n- one\n- two');
  await page.mouse.click(700, 120);
  await expect(page.locator(N)).toHaveClass(/\bmd\b/);
});

test('a plain note keeps its own line breaks', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__mock!.updateCard('b_seed', 'note', { data: { text: 'line one\nline two' } }));
  await page.evaluate(() => window.__board!.refresh());
  await expect(page.locator(`${N} p br`)).toHaveCount(1);
  await expect(page.locator(N)).toContainText('line one');
});

test('selecting text in a note shows the format bar; Bold writes ** around it and saves Markdown', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await edit(page);
  const text = await noteText(page);
  const i = text.indexOf('active');
  await select(page, N, i, i + 'active'.length);
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'false');
  expect(await page.locator(`${BAR} button`).count()).toBe(7);
  await page.waitForTimeout(300);   // the bar fades in
  await page.screenshot({ path: shot('note-format-bar'), clip: { x: 0, y: 330, width: 520, height: 200 } });
  await page.locator(`${BAR} [data-fmt="bold"]`).click();
  await expect.poll(() => noteText(page)).toContain('per **active** user');
  await page.waitForTimeout(700);                                    // one save after typing stops
  const saved = await page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'updateCard').map((c) => (c.args[2] as { data: { text?: string } }).data.text));
  expect(saved.at(-1)).toContain('per **active** user');
  await page.mouse.click(700, 120);
  await expect(page.locator(`${N} b`)).toHaveText('active');
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'true');
  expect(errs).toEqual([]);
});

test('Ctrl/Cmd+B, I and K', async ({ page }) => {
  await openBoard(page);
  await edit(page);
  const text = await noteText(page);
  const w = (s: string) => { const i = text.indexOf(s); return [i, i + s.length] as const; };
  await select(page, N, ...w('Never'));
  await page.keyboard.press(`${mod}+b`);
  await expect.poll(() => noteText(page)).toContain('**Never**');
  await page.keyboard.press(`${mod}+b`);                               // a second press takes it off again
  await expect.poll(() => noteText(page)).not.toContain('**');
  await select(page, N, ...w('below'));
  await page.keyboard.press(`${mod}+i`);
  await expect.poll(() => noteText(page)).toContain('*below*');
  await select(page, N, ...w('month'));
  await page.keyboard.press(`${mod}+k`);
  await expect.poll(() => noteText(page)).toContain('[month](https://)');
  await page.keyboard.type('example.com');                             // the address is selected, so typing replaces it
  await expect.poll(() => noteText(page)).toContain('[month](example.com)');
});

test('lists and a heading apply to every line of the selection', async ({ page }) => {
  await openBoard(page);
  await page.keyboard.press('n'); await page.waitForTimeout(200);       // a new note, in edit
  await page.keyboard.type('apples');
  await page.keyboard.press('Enter');
  await page.keyboard.type('pears');
  const sel = '.card.src .n:focus, .card .n:focus';
  await page.evaluate(() => { const el = document.activeElement as HTMLElement, r = document.createRange(); r.selectNodeContents(el); const g = getSelection()!; g.removeAllRanges(); g.addRange(r); });
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'false');
  await page.locator(`${BAR} [data-fmt="bullet"]`).click();
  await expect.poll(() => page.locator(sel).evaluate((e) => e.textContent)).toBe('- apples\n- pears');
  await page.locator(`${BAR} [data-fmt="number"]`).click();
  await expect.poll(() => page.locator(sel).evaluate((e) => e.textContent)).toBe('1. apples\n2. pears');
  await page.mouse.click(700, 120);
  await expect(page.locator('.card .n.md ol li')).toHaveCount(2);
});

test('pasted HTML is cleaned to plain text', async ({ page }) => {
  await openBoard(page);
  await edit(page);
  await page.evaluate((s) => {
    const el = document.querySelector(s)!, r = document.createRange();
    r.selectNodeContents(el); r.collapse(false);
    const g = getSelection()!; g.removeAllRanges(); g.addRange(r);
    const dt = new DataTransfer();
    dt.setData('text/html', '<b style="color:red">bold</b><script>window.__xss=1</script>');
    dt.setData('text/plain', ' plain paste');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, N);
  await expect.poll(() => noteText(page)).toContain('plain paste');
  expect(await page.locator(N).evaluate((e) => e.querySelector('b, script, span[style]') === null)).toBe(true);
});

test('markup in a note is text, never markup', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__mock!.updateCard('b_seed', 'note', { data: { text: '<img src=x onerror="window.__xss=1"> **b** [x](javascript:window.__xss=1) <script>window.__xss=1</script>' } }));
  await page.evaluate(() => window.__board!.refresh());
  await expect(page.locator(`${N} b`)).toHaveText('b');
  expect(await page.locator(N).evaluate((e) => ({ img: e.querySelectorAll('img').length, script: e.querySelectorAll('script').length, js: e.querySelectorAll('a[href^="javascript"]').length }))).toEqual({ img: 0, script: 0, js: 0 });
  await expect(page.locator(N)).toContainText('<img src=x');
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test('the note viewer has the same bar and shortcuts', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.openViewer('note'));
  const ed = page.locator('[data-pb="viewer"] textarea.editor');
  await expect(ed).toBeVisible();
  await ed.focus();
  await ed.evaluate((e) => { const t = e as HTMLTextAreaElement; const i = t.value.indexOf('active'); t.setSelectionRange(i, i + 6); });
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'false');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('note-viewer-format-bar') });
  await page.locator(`${BAR} [data-fmt="bold"]`).click();
  await expect(ed).toHaveValue(/per \*\*active\*\* user/);
  await ed.evaluate((e) => { const t = e as HTMLTextAreaElement; const i = t.value.indexOf('Never'); t.setSelectionRange(i, i + 5); });
  await page.keyboard.press(`${mod}+i`);
  await expect(ed).toHaveValue(/\*Never\*/);
  await page.waitForTimeout(700);
  expect(await noteText(page)).toContain('**active**');
});
