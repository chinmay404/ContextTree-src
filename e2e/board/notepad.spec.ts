import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const F = '[data-pb="focus"]';
const BAR = '[data-pb="selbar"]';
const NOTEPAD = `${F} .notepad`;
const openFocus = async (page: Page, id: string) => { await page.evaluate((i) => window.__board!.openFocus(i), id); await page.waitForTimeout(700); };
const pads = (page: Page, chat = 'main') => page.evaluate((c) => window.__board!.cards().filter((x) => (x.data as { notepadFor?: string }).notepadFor === c).map((x) => ({ id: x.id, deskId: x.deskId, text: (x.data as { text?: string }).text ?? '' })), chat);

/** Select the first `n` characters of the first paragraph of the (first) answer; returns the selected text. */
const selectInAnswer = (page: Page, root = `${F} .art .body`, from = 0, n = 40) => page.evaluate(([sel, a, len]) => {
  const p = document.querySelector(sel as string)!.querySelector('p, li')!, t = p.firstChild as Text;
  const r = document.createRange(); r.setStart(t, a as number); r.setEnd(t, Math.min((a as number) + (len as number), t.length));
  const g = getSelection()!; g.removeAllRanges(); g.addRange(r);
  return g.toString();
}, [root, from, n] as const);

test('selecting text in an answer shows a bar just above it with the two actions', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page); await openFocus(page, 'main');
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'true');
  const text = await selectInAnswer(page);
  expect(text.length).toBeGreaterThan(10);
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator(`${BAR} button`)).toHaveText(['Add to note', 'Ask in a new branch']);
  const [bar, sel] = await page.evaluate((s) => [document.querySelector(s)!.getBoundingClientRect(), getSelection()!.getRangeAt(0).getBoundingClientRect()].map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom })), BAR);
  expect(bar.b).toBeLessThanOrEqual(sel.t + 2);                       // above the selection
  expect(sel.t - bar.b).toBeLessThan(40);                              // and close to it
  expect(await page.locator(BAR).evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0.12s');   // a 120 ms fade, nothing more
  expect(await page.locator(BAR).evaluate((e) => getComputedStyle(e).transitionProperty)).toBe('opacity');
  expect(errs).toEqual([]);
});

test('no bar for a selection outside an answer, a question, or a field', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await page.evaluate(() => { const t = document.querySelector('[data-pb="focus"] .ftitle')!.firstChild as Text; const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 8); const g = getSelection()!; g.removeAllRanges(); g.addRange(r); });
  await page.waitForTimeout(250);
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'true');
  await page.evaluate(() => { const t = document.querySelector('[data-pb="focus"] .ub')!.firstChild as Text; const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 8); const g = getSelection()!; g.removeAllRanges(); g.addRange(r); });
  await page.waitForTimeout(250);
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'true');
});

test('Esc hides the bar first (the view stays); clicking away hides it too; Tab reaches it', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await selectInAnswer(page);
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Tab');                                              // from the selection into the bar
  await expect(page.locator(`${BAR} button`).first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator(`${BAR} button`).nth(1)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'true');
  expect(await page.evaluate(() => window.__board!.focus())).toBe('main');       // Esc closed only the bar
  await selectInAnswer(page);
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'false');
  await page.mouse.click(700, 60);                                               // empty space in the main column's top
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'true');
});

test('Add to note opens the notepad on the right with the quote, cursor after it; the note sits on the desk', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page); await openFocus(page, 'main');
  expect(await pads(page)).toEqual([]);
  await expect(page.locator(`${F} [data-act="notes"]`)).toHaveCount(0);           // nothing to reopen yet
  const text = await selectInAnswer(page);
  await page.locator(`${BAR} [data-sel="note"]`).click();
  await expect(page.locator(NOTEPAD)).toHaveClass(/\bon\b/);
  const ta = page.locator(`${NOTEPAD} textarea`);
  await expect(ta).toHaveValue(`> ${text}\n\n`);
  await expect(ta).toBeFocused();
  expect(await ta.evaluate((e) => [(e as HTMLTextAreaElement).selectionStart, (e as HTMLTextAreaElement).selectionEnd, (e as HTMLTextAreaElement).value.length])).toEqual([text.length + 4, text.length + 4, text.length + 4]);
  const list = await pads(page);
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ deskId: 'main', text: `> ${text}\n\n` });
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'true');
  // on the right of the conversation, the timeline still on the left
  const [side, main, np] = await page.evaluate((f) => ['.side', '.main', '.notepad'].map((s) => { const r = document.querySelector(f + ' ' + s)!.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width }; }), F);
  expect(np.l).toBeGreaterThanOrEqual(main.r - 1);
  expect(side.r).toBeLessThanOrEqual(main.l + 1);
  expect(np.r).toBeGreaterThan(1300);
  await expect(page.locator(`${NOTEPAD} .npstate`)).toHaveText('Saved');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('notepad-open-light') });
  // the board behind has the note on the desk at once
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await expect(page.locator(`.card[data-id="${list[0].id}"]`)).toHaveCount(1);
  expect(errs).toEqual([]);
});

test('a second selection is added to the same note, after what is already there', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  const a = await selectInAnswer(page, `${F} .art .body`, 0, 30);
  await page.locator(`${BAR} [data-sel="note"]`).click();
  await page.locator(`${NOTEPAD} textarea`).pressSequentially('Why? ');
  const b = await selectInAnswer(page, `${F} .art .body`, 5, 25);
  await page.locator(`${BAR} [data-sel="note"]`).click();
  const list = await pads(page);
  expect(list).toHaveLength(1);
  expect(list[0].text).toBe(`> ${a}\n\nWhy? \n\n> ${b}\n\n`);
  await expect(page.locator(`${NOTEPAD} textarea`)).toHaveValue(list[0].text);
});

test('the notepad is a note: editable with the format bar, saved after typing stops, closable, reopened from the header', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await selectInAnswer(page);
  await page.locator(`${BAR} [data-sel="note"]`).click();
  const ta = page.locator(`${NOTEPAD} textarea`);
  await ta.pressSequentially('This matters');
  await expect(page.locator(`${NOTEPAD} .npstate`)).toHaveText('Saving…');
  await expect(page.locator(`${NOTEPAD} .npstate`)).toHaveText('Saved', { timeout: 3000 });
  const [pad] = await pads(page);
  expect(pad.text.endsWith('This matters')).toBe(true);
  expect(await page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'updateCard').length)).toBeGreaterThan(0);
  // the P15 format bar and shortcuts work in it
  await ta.evaluate((e) => { const t = e as HTMLTextAreaElement; t.setSelectionRange(t.value.length - 7, t.value.length); });
  await expect(page.locator('[data-pb="fmtbar"]')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Control+b');
  await expect.poll(async () => (await pads(page))[0].text).toContain('**matters**');
  // close, and reopen from the header
  await page.locator(`${NOTEPAD} [data-act="npclose"]`).click();
  await expect(page.locator(NOTEPAD)).not.toHaveClass(/\bon\b/);
  await expect(page.locator(NOTEPAD)).toHaveAttribute('aria-hidden', 'true');
  const notes = page.locator(`${F} [data-act="notes"]`);
  await expect(notes).toHaveText('Notes');
  await notes.click();
  await expect(page.locator(NOTEPAD)).toHaveClass(/\bon\b/);
  await expect(page.locator(`${NOTEPAD} textarea`)).toHaveValue((await pads(page))[0].text);
});

test('the panel slides in from the right and leaves the same way; reduced motion only fades', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await selectInAnswer(page);
  await page.locator(`${BAR} [data-sel="note"]`).click();
  const css = (sel: string) => page.locator(sel).evaluate((e) => ({ tp: getComputedStyle(e).transitionProperty, td: getComputedStyle(e).transitionDuration, tf: getComputedStyle(e).transitionTimingFunction }));
  const on = await css(`${NOTEPAD} .npad`);
  expect(on.tp).toContain('transform');
  expect(on.tp).toContain('opacity');
  await page.locator(`${NOTEPAD} [data-act="npclose"]`).click();
  const off = await css(`${NOTEPAD} .npad`);
  expect(off.td.split(',').map((x) => parseFloat(x)).every((s) => s <= 0.16)).toBe(true);        // leaving is quicker than arriving
  expect(await page.locator(`${NOTEPAD} .npad`).evaluate((e) => getComputedStyle(e).transform)).not.toBe('none');   // it is off to the side, not just hidden
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator(`${F} [data-act="notes"]`).click();
  const rm = await css(`${NOTEPAD} .npad`);
  expect(rm.tp).not.toContain('transform');
  expect(await page.locator(`${NOTEPAD} .npad`).evaluate((e) => getComputedStyle(e).transform)).toBe('none');
});

test('the note is context: the next question reads it, with no engine change', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=0&wordMs=0'); await openFocus(page, 'main');
  const before = await page.evaluate(() => window.__mock!.getReads('b_seed', 'main').then((r) => r.items.map((i) => i.cardId)));
  await selectInAnswer(page);
  await page.locator(`${BAR} [data-sel="note"]`).click();
  const [pad] = await pads(page);
  expect(before).not.toContain(pad.id);
  await page.keyboard.press('Escape');                                 // out of the textarea, panel stays
  await page.locator(`${F} .fcomp textarea`).fill('And what about annual plans?');
  await page.keyboard.press('Enter');
  await expect(page.locator(`${F} .art`)).toHaveCount(2, { timeout: 8000 });
  const after = await page.evaluate(() => window.__mock!.getReads('b_seed', 'main').then((r) => r.items.map((i) => i.cardId)));
  expect(after).toContain(pad.id);                                      // a desk source: the chat reads it
  const asked = await page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'streamChat').length);
  expect(asked).toBeGreaterThan(0);
});

test('Ask in a new branch opens the branch sheet with the selection quoted, then lands on the branch', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  const text = await selectInAnswer(page);
  const before = await page.evaluate(() => window.__board!.chats().map((c) => c.id));
  await page.locator(`${BAR} [data-sel="branch"]`).click();
  expect(await page.evaluate(() => window.__board!.dialog())).toMatchObject({ mode: 'branch', parentId: 'main' });
  const first = page.locator('#d-first');
  await expect(first).toHaveValue(`> ${text}\n\n`);
  await expect(first).toBeFocused();
  expect(await first.evaluate((e) => (e as HTMLTextAreaElement).selectionStart === (e as HTMLTextAreaElement).value.length)).toBe(true);
  await first.pressSequentially('What does this mean for annual plans?');
  await page.click('#d-ok');
  await expect.poll(async () => (await page.evaluate(() => window.__board!.chats().length))).toBe(before.length + 1);
  const id = (await page.evaluate(() => window.__board!.chats().map((c) => c.id))).find((c) => !before.includes(c))!;
  await expect.poll(() => page.evaluate(() => window.__board!.focus())).toBe(id);   // P4: the view moves to the new branch
});

test('the bar works in the compare sheet too, adding to that column chat\'s notes', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'side');
  await page.locator(`${F} [data-act="more"]`).click(); await page.getByText('Compare with siblings').click();
  await expect(page.locator('[data-pb="compare"] .cmp-col')).toHaveCount(2);
  const text = await selectInAnswer(page, '[data-pb="compare"] .cmp-col[data-id="second"] .art .body');
  await expect(page.locator(BAR)).toHaveAttribute('aria-hidden', 'false');
  await page.locator(`${BAR} [data-sel="note"]`).click();
  const list = await pads(page, 'second');
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ deskId: 'second', text: `> ${text}\n\n` });
  expect(await pads(page, 'side')).toEqual([]);
});

test('a branch has its own notepad; the parent\'s note is inherited as desk context', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await selectInAnswer(page);
  await page.locator(`${BAR} [data-sel="note"]`).click();
  const [parentPad] = await pads(page);
  await page.keyboard.press('Escape');
  await openFocus(page, 'side');                                       // a child of main
  await selectInAnswer(page);
  await page.locator(`${BAR} [data-sel="note"]`).click();
  const own = await pads(page, 'side');
  expect(own).toHaveLength(1);
  expect(own[0].id).not.toBe(parentPad.id);
  expect(own[0].deskId).toBe('side');
  const read = await page.evaluate(() => window.__mock!.getReads('b_seed', 'side').then((r) => r.items.map((i) => i.cardId)));
  expect(read).toEqual(expect.arrayContaining([parentPad.id, own[0].id]));
});

test('dark: the bar and the panel', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ct-theme', 'dark'));
  await openBoard(page); await openFocus(page, 'main');
  await selectInAnswer(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('selection-bar-dark') });
  await page.locator(`${BAR} [data-sel="note"]`).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('notepad-open-dark') });
  expect(await page.locator(`${NOTEPAD} .npad`).evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe('rgb(255, 255, 255)');
});

test('light: the bar over a selection', async ({ page }) => {
  await openBoard(page); await openFocus(page, 'main');
  await selectInAnswer(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('selection-bar-light') });
});
