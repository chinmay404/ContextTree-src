import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { center, closeUp, dragPath, openBoard, trackErrors } from './helpers';

/** Notes group with notes and with other sources, as a pile or a set, and a chat strung to either reads them (2026-10-24). */
const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const MENU = '[data-pb="cardmenu"]';
const N2_TEXT = '## Second thought\nAsk about seats before the call.';
const members = (page: Page, id: string) => page.evaluate((i) => window.__board!.cards().filter((c) => c.pileId === i).map((c) => c.id).sort(), id);
const pileOf = (page: Page, id: string) => page.evaluate((i) => window.__board!.card(i)?.pileId ?? null, id);
const titleOf = (page: Page, id: string) => page.evaluate((i) => (window.__board!.card(i)!.data as { title?: string }).title, id);
const reads = (page: Page, chat: string) => page.evaluate((c) => window.__mock!.getReads('b_seed', c).then((r) => r.items.map((i) => i.cardId)), chat);

/** A second loose note, `n2`, left of the main desk. */
async function addNote(page: Page, id = 'n2', x = -340, y = 238, text = N2_TEXT): Promise<void> {
  await page.evaluate(async ([i, px, py, t]) => {
    await window.__mock!.createCard('b_seed', { id: i as string, kind: 'source', sourceType: 'note', x: px as number, y: py as number, deskId: null, status: 'ready', data: { text: t as string, meta: 'Note · You' } });
    await window.__board!.reload();
  }, [id, x, y, text] as const);
  await expect(page.locator(`.card[data-id="${id}"]`)).toHaveCount(1);
}

/** Full-size cards with `ids` in view. */
async function frame(page: Page, ids: string[]): Promise<void> {
  await page.evaluate((list) => {
    const b = window.__board!; b.select(null);
    const boxes = list.map((i) => b.box(i));
    const x0 = Math.min(...boxes.map((x) => x[0])), x1 = Math.max(...boxes.map((x) => x[2])), y0 = Math.min(...boxes.map((x) => x[1])), y1 = Math.max(...boxes.map((x) => x[3]));
    const z = Math.min(.8, 1300 / (x1 - x0 + 200), 760 / (y1 - y0 + 200));
    b.camSnap(720 - ((x0 + x1) / 2) * z, 450 - ((y0 + y1) / 2) * z, z);
  }, ids);
  await page.evaluate(() => window.__board!.settle());
  test.skip((await page.evaluate(() => window.__board!.size())) === 'S', 'cards too small at this viewport');
}

/** A note is dragged by its edge (its "Note · You" line); a press on its text edits it. */
const grip = (id: string) => `[data-id="${id}"] .note-in .meta`;
const drag = async (page: Page, from: string, to: string) => {
  await dragPath(page, await center(page, from), await center(page, to), 25);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__board!.settle());
};

for (const theme of ['light', 'dark'] as const) {
  test(`a note dragged onto a note makes a Note pile, named by the front note's first line (${theme})`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.emulateMedia({ colorScheme: theme });
    await openBoard(page);
    await addNote(page);
    await frame(page, ['note', 'n2']);
    await drag(page, grip('n2'), grip('note'));
    const pile = await pileOf(page, 'note');
    expect(pile).not.toBeNull();
    expect(await pileOf(page, 'n2')).toBe(pile);
    expect(await titleOf(page, pile!)).toBe('Note pile');
    const face = page.locator(`.card[data-id="${pile}"]`);
    await expect(face.locator('.meta')).toContainText('Note · 1 of 2');
    await expect(face.locator('.ttl')).toHaveText(/^(Costs ≈ \$0\.40 per active user a m…|Second thought)$/);
    await expect(face.locator('.ttl')).not.toHaveText('Note pile');
    await page.waitForTimeout(300);
    await closeUp(page, pile!, shot(`notes-pile-${theme}`));
    expect(errs).toEqual([]);
  });
}

test('pressing on a note\'s text edits it and never drags it into a pile', async ({ page }) => {
  await openBoard(page);
  await addNote(page);
  await frame(page, ['note', 'n2']);
  await drag(page, `[data-id="n2"] .note-in .n`, grip('note'));
  expect(await pileOf(page, 'n2')).toBeNull();
  expect(await pileOf(page, 'note')).toBeNull();
});

test('a note dragged onto a PDF makes a Mixed pile; a note dragged onto a pile joins it', async ({ page }) => {
  await openBoard(page);
  await frame(page, ['note', 'pdf']);
  await drag(page, grip('note'), '[data-id="pdf"] .ttl');
  const mixed = await pileOf(page, 'note');
  expect(mixed).not.toBeNull();
  expect(await members(page, mixed!)).toEqual(['note', 'pdf']);
  expect(await titleOf(page, mixed!)).toBe('Mixed pile');

  await addNote(page, 'n3', 1140, 160, 'Interview follow-ups\n- ask Priya');
  await frame(page, ['n3', 'interviews']);
  await drag(page, grip('n3'), '[data-id="interviews"] .ttl');
  expect(await members(page, 'interviews')).toEqual(['interviews_1', 'interviews_2', 'interviews_3', 'interviews_4', 'n3']);
});

test('a note dragged onto an open set joins it, and its tile shows its first line', async ({ page }) => {
  await openBoard(page);
  await page.click('[data-pb="add"]'); await page.click('[data-pb="menu"] [data-m="set"]');
  const set = await page.evaluate(() => window.__board!.cards().find((c) => c.sourceType === 'pile' && (c.data as { layout?: string }).layout === 'open')!.id);
  await addNote(page);
  await frame(page, [set, 'n2']);
  await drag(page, grip('n2'), `[data-id="${set}"] .sethd`);
  expect(await members(page, set)).toEqual(['n2']);
  await expect(page.locator(`[data-id="${set}"] .setm b`)).toHaveText('Second thought');
});

for (const theme of ['light', 'dark'] as const) {
  test(`"Start a set with this" on a note; with a PDF dropped in and strung to a chat, the chat reads the note (${theme})`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.emulateMedia({ colorScheme: theme });
    await openBoard(page);
    await frame(page, ['note', 'pdf', 'side']);
    await page.locator(grip('note')).click({ button: 'right' });
    await expect(page.locator(`${MENU} [data-m="set-start"]`)).toHaveText(/Start a set with this/);
    await page.locator(`${MENU} [data-m="set-start"]`).click();
    await page.waitForTimeout(400);
    const set = (await pileOf(page, 'note'))!;
    expect(set).not.toBeNull();
    await frame(page, [set, 'pdf', 'side']);
    await drag(page, '[data-id="pdf"] .meta', `[data-id="${set}"] .sethd`);
    expect(await members(page, set)).toEqual(['note', 'pdf']);
    const tile = page.locator(`[data-id="${set}"] .setm b`);
    await expect(tile).toHaveCount(2);
    await expect(tile.filter({ hasText: 'Costs ≈ $0.40 per active user a m…' })).toHaveCount(1);   // the note, by its first line
    await expect(tile.filter({ hasText: 'Pricing survey 2025' })).toHaveCount(1);
    await page.evaluate((i) => window.__board!.select(i), set);
    await dragPath(page, await center(page, `[data-id="${set}"] .port.out`), await center(page, '[data-id="side"] .ttl'), 30);
    await page.waitForTimeout(400);
    expect(await page.evaluate((i) => window.__board!.hasWire(i, 'side'), set)).toBe(true);
    expect(await reads(page, 'side')).toEqual(expect.arrayContaining(['note', 'pdf']));
    await page.evaluate(() => window.__board!.select(null));
    await page.waitForTimeout(300);
    await closeUp(page, set, shot(`notes-set-${theme}`));
    expect(errs).toEqual([]);
  });
}

test('a pile of notes strung to a chat makes the chat read both notes', async ({ page }) => {
  await openBoard(page);
  await addNote(page);
  await frame(page, ['note', 'n2', 'side']);
  await drag(page, grip('n2'), grip('note'));
  const pile = (await pileOf(page, 'note'))!;
  await frame(page, [pile, 'side']);
  await page.evaluate((i) => window.__board!.select(i), pile);
  await dragPath(page, await center(page, `[data-id="${pile}"] .port.out`), await center(page, '[data-id="side"] .ttl'), 30);
  await page.waitForTimeout(400);
  expect(await reads(page, 'side')).toEqual(expect.arrayContaining(['note', 'n2']));
});

test('a note opened from a set opens the note viewer and stays editable; taken out, it is a normal note again', async ({ page }) => {
  await openBoard(page);
  await addNote(page);
  await page.click('[data-pb="add"]'); await page.click('[data-pb="menu"] [data-m="set"]');
  const set = await page.evaluate(() => window.__board!.cards().find((c) => c.sourceType === 'pile' && (c.data as { layout?: string }).layout === 'open')!.id);
  await frame(page, [set, 'n2']);
  await drag(page, grip('n2'), `[data-id="${set}"] .sethd`);
  expect(await members(page, set)).toEqual(['n2']);

  await page.locator(`[data-id="${set}"] .setm .sm-open`).click();
  expect(await page.evaluate(() => window.__board!.viewer())).toMatchObject({ cardId: set, memberId: 'n2' });
  await expect(page.locator('[data-pb="viewer"] h2')).toHaveText('Second thought');
  const ed = page.locator('[data-pb="viewer"] textarea.editor');
  await expect(ed).toHaveValue(N2_TEXT);
  await ed.focus();
  await ed.press('Control+End');
  await ed.pressSequentially(' Done.');
  await expect.poll(() => page.evaluate(() => (window.__board!.card('n2')!.data as { text: string }).text), { timeout: 3000 }).toBe(`${N2_TEXT} Done.`);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-pb="viewer"]')).toHaveAttribute('aria-hidden', 'true');

  await page.locator(`[data-id="${set}"] .setm`).hover();
  await page.locator(`[data-id="${set}"] .setm [data-act="takeout"]`).click();
  await page.waitForTimeout(400);
  expect(await pileOf(page, 'n2')).toBeNull();
  const n = page.locator('.card[data-id="n2"] .note-in .n');
  await expect(n).toHaveCount(1);
  await n.click();
  await expect(n).not.toHaveClass(/\bmd\b/);
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Again.');
  await expect.poll(() => page.evaluate(() => (window.__board!.card('n2')!.data as { text: string }).text)).toBe(`${N2_TEXT} Done. Again.`);
});

test('in the focus view, Connected sources names a note by its first line without Markdown marks', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(async () => {
    await window.__mock!.updateCard('b_seed', 'note', { data: { text: 'Putting `/security-review` **in** a hook\nSecond line.' } });
    await window.__board!.refresh();
    window.__board!.openFocus('main');
  });
  const row = page.locator('[data-pb="focus"] .srow[data-view="note"] .tx b');
  await expect(row).toHaveText('Putting /security-review in a hook');
  await expect(row).not.toContainText('`');
  await expect(row).not.toContainText('**');
});

test('renaming a note by editing its first line in the viewer updates its tile in the set', async ({ page }) => {
  await openBoard(page);
  await addNote(page);
  await page.click('[data-pb="add"]'); await page.click('[data-pb="menu"] [data-m="set"]');
  const set = await page.evaluate(() => window.__board!.cards().find((c) => c.sourceType === 'pile' && (c.data as { layout?: string }).layout === 'open')!.id);
  await frame(page, [set, 'n2']);
  await drag(page, grip('n2'), `[data-id="${set}"] .sethd`);
  await page.locator(`[data-id="${set}"] .setm .sm-open`).click();
  await page.locator('[data-pb="viewer"] textarea.editor').fill('# A new name\nBody.');
  await expect(page.locator('[data-pb="viewer"] h2')).toHaveText('A new name');
  await page.keyboard.press('Escape');
  await expect(page.locator(`[data-id="${set}"] .setm b`)).toHaveText('A new name');
});
