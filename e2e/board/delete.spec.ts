import { test, expect, type Page } from '@playwright/test';
import { center, dragPath, openBoard, trackErrors } from './helpers';

const C = '[data-pb="confirm"]';
const confirmBtn = (page: Page, name: 'Delete' | 'Cancel') => page.locator(C).getByRole('button', { name });
const select = (page: Page, id: string | null) => page.evaluate((i) => window.__board!.select(i), id);
const calls = (page: Page, m: string) => page.evaluate((x) => window.__board!.calls().filter((c) => c.method === x).length, m);

test('deleting a chat asks once, names its branches, and can be undone', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page); await select(page, 'second'); await page.keyboard.press('Delete');
  await expect(page.locator(`${C} h2`)).toHaveText('Delete Q1.2 and its 1 branch? Sources on their desks stay on the board.');
  await expect(page.locator(C)).toHaveClass(/on/);
  await confirmBtn(page, 'Delete').click();
  await expect(page.locator('.card[data-id="second"], .card[data-id="deep"]')).toHaveCount(0);
  await expect(page.locator('.card[data-id="web"]')).toHaveCount(1);            // sources stay, loose
  expect(await page.evaluate(() => window.__board!.card('web')!.deskId)).toBeNull();
  await expect(page.locator(C)).not.toHaveClass(/on/);
  await page.click('.pb-toast [data-act="undo"]');
  await expect(page.locator('.card[data-id="deep"]')).toHaveCount(1);
  expect(await page.evaluate(() => window.__board!.card('web')!.deskId)).toBe('second');
  expect(errs).toEqual([]);
});

test('removing a source needs no confirm and offers Undo for 10 s', async ({ page }) => {
  test.slow(); await openBoard(page); await page.hover('[data-id="csv"] .face'); await page.click('[data-id="csv"] [data-act="del"]');
  await expect(page.locator(C)).not.toHaveClass(/on/); await expect(page.locator('.pb-toast')).toContainText('Removed Competitor prices');
  await expect(page.locator('.pb-toast')).toHaveClass(/on/);
  await expect(page.locator('.pb-toast [data-act="undo"]')).toHaveCount(1);
  await page.waitForTimeout(10_300); await expect(page.locator('.pb-toast [data-act="undo"]')).toHaveCount(0);
  await expect(page.locator('.pb-toast')).not.toHaveClass(/on/);
});

test('Escape cancels the confirm', async ({ page }) => {
  await openBoard(page); await select(page, 'deep'); await page.keyboard.press('Backspace');
  await expect(page.locator(C)).toHaveClass(/on/);
  await page.keyboard.press('Escape');
  await expect(page.locator(C)).not.toHaveClass(/on/);
  await expect(page.locator('.card[data-id="deep"]')).toHaveCount(1);
  expect(await calls(page, 'deleteCard')).toBe(0);
});

test('Enter confirms the delete, with focus on the board or on the Delete button', async ({ page }) => {
  await openBoard(page); await select(page, 'deep'); await page.keyboard.press('Delete');
  await expect(page.locator(C)).toHaveClass(/on/);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());   // exercises the document keydown path
  await page.keyboard.press('Enter');
  await expect(page.locator('.card[data-id="deep"]')).toHaveCount(0);
  expect(await calls(page, 'deleteCard')).toBe(1);
});

test('Enter on the focused Delete button confirms once', async ({ page }) => {
  await openBoard(page); await select(page, 'deep'); await page.keyboard.press('Delete');
  await expect(confirmBtn(page, 'Delete')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.card[data-id="deep"]')).toHaveCount(0);
  expect(await calls(page, 'deleteCard')).toBe(1);
});

test('Delete is ignored while typing or with an overlay open', async ({ page }) => {
  await openBoard(page); await select(page, 'deep');
  await page.evaluate(() => window.__board!.openSheet('root'));
  await page.waitForTimeout(300);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());   // only the overlay guard is left
  expect(await page.evaluate(() => !!window.__board!.dialog())).toBe(true);
  await page.keyboard.press('Delete');
  await expect(page.locator(C)).not.toHaveClass(/on/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.wrap.on')).toHaveCount(0);
  await select(page, 'deep');
  await page.evaluate(() => { const t = document.createElement('input'); t.id = 'tmp-in'; document.querySelector('.pb-root')!.appendChild(t); t.focus(); });
  await page.keyboard.press('Backspace');
  await expect(page.locator(C)).not.toHaveClass(/on/);
});

test('Delete is ignored while the board menu is open', async ({ page }) => {
  await openBoard(page); await select(page, 'deep');
  await page.click('[data-pb="brand"] .lg');
  await expect(page.locator('[data-pb="boardmenu"]')).toHaveClass(/on/);
  await page.keyboard.press('Delete');
  await expect(page.locator(C)).not.toHaveClass(/on/);
});

test('focus returns to the card after Escape, into the focus view after Cancel, and to the board after a delete', async ({ page }) => {
  await openBoard(page);
  await page.click('.card[data-id="deep"] .face'); await page.keyboard.press('Delete');
  await expect(page.locator(C)).toHaveClass(/on/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.card[data-id="deep"]')).toBeFocused();

  await page.evaluate(() => window.__board!.openFocus('deep')); await page.waitForTimeout(700);
  await page.click('[data-pb="focus"] [data-act="more"]');
  await page.locator('[data-pb="focusmenu"]').getByRole('menuitem', { name: 'Delete question' }).click();
  await expect(page.locator(C)).toHaveClass(/on/);
  await confirmBtn(page, 'Cancel').click();
  await expect(page.locator('[data-pb="focus"] [data-act="more"]')).toBeFocused();

  await page.click('[data-pb="focus"] [data-act="more"]');
  await page.locator('[data-pb="focusmenu"]').getByRole('menuitem', { name: 'Delete question' }).click();
  await confirmBtn(page, 'Delete').click();
  await expect(page.locator('.card[data-id="deep"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120))).toContain('pb-root');
});

for (const how of ['Enter', 'the Delete button'] as const) {
  test(`after a confirmed Delete-key delete (${how}) focus rests on the board root`, async ({ page }) => {
    await openBoard(page);
    await page.click('.card[data-id="deep"] .face'); await page.keyboard.press('Delete');
    await expect(page.locator(C)).toHaveClass(/on/);
    if (how === 'Enter') await page.keyboard.press('Enter'); else await confirmBtn(page, 'Delete').click();
    await expect(page.locator('.card[data-id="deep"]')).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.activeElement?.classList.contains('pb-root'))).toBe(true);
  });
}

test('deleting a chat that is answering stops it', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=2000&wordMs=5');
  await page.evaluate(() => window.__board!.openFocus('side')); await page.waitForTimeout(700);
  const F = '[data-pb="focus"]';
  await expect(page.locator(`${F} .fcomp textarea`)).toBeEnabled();
  const before = await page.locator(`${F} .amsg`).count();
  const msgsBefore = await page.evaluate(() => window.__board!.card('side')!.messageCount ?? 0);
  await page.locator(`${F} .fcomp textarea`).fill('Hold on'); await page.keyboard.press('Enter');
  await expect.poll(() => calls(page, 'streamChat')).toBe(1);
  await page.keyboard.press('Escape');
  await expect(page.locator(F)).not.toHaveClass(/on/);
  await page.locator(`${F} .fcomp textarea`).blur().catch(() => {});
  await select(page, 'side'); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Delete');
  await confirmBtn(page, 'Delete').click();
  await expect(page.locator('.card[data-id="side"]')).toHaveCount(0);
  await page.waitForTimeout(2500);
  expect(await calls(page, 'deleteCard')).toBe(1);
  expect(await calls(page, 'streamChat')).toBe(1);
  await page.click('.pb-toast [data-act="undo"]');
  await expect(page.locator('.card[data-id="side"]')).toHaveCount(1);
  await page.evaluate(() => window.__board!.openFocus('side')); await page.waitForTimeout(700);
  await expect(page.locator(`${F} .amsg`)).toHaveCount(before);
  // The mock's stored chat: the question went in, but the aborted answer was never stored.
  const side = await page.evaluate(async () => { await window.__board!.refresh(); return window.__board!.card('side'); });
  expect(side!.lastMessage!.role).toBe('user');
  expect(side!.messageCount).toBe(msgsBefore + 1);
});

// ---- board final review R1 ----

const server = (page: Page, id: string) => page.evaluate(async (i) => { await window.__board!.refresh(); return window.__board!.card(i); }, id);

test('a note typed a moment before Delete keeps its text through Undo', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  const n = page.locator('.card[data-id="note"] .n');
  await n.click(); await page.keyboard.press('End'); await page.keyboard.type(' ZZTOP');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Delete');
  await expect(page.locator('.card[data-id="note"]')).toHaveCount(0);
  await page.click('.pb-toast [data-act="undo"]');
  await expect(page.locator('.card[data-id="note"] .n')).toContainText('ZZTOP');
  const c = await server(page, 'note');
  expect((c!.data as { text?: string }).text).toContain('ZZTOP');
  expect(errs).toEqual([]);
});

test('a card dragged and deleted inside the settle window comes back where it was dropped', async ({ page }) => {
  await openBoard(page);
  const from = await center(page, '[data-id="csv"] .meta');
  await dragPath(page, from, [from[0] - 160, from[1] - 40], 12, 10);
  const wantY = 700 - 40 / (await page.evaluate(() => window.__board!.cam().z));   // where the drop put it (a desk may nudge x, never y here)
  expect(await page.evaluate(() => window.__board!.calls().filter((c) => c.method === 'savePositions').length)).toBe(0);   // inside the 600 ms window
  await select(page, 'csv'); await page.keyboard.press('Delete');
  await expect(page.locator('.card[data-id="csv"]')).toHaveCount(0);
  await page.click('.pb-toast [data-act="undo"]');
  await expect(page.locator('.card[data-id="csv"]')).toHaveCount(1);
  await page.evaluate(() => window.__board!.settle()); await page.waitForTimeout(800);
  const c = await server(page, 'csv');
  expect(Math.abs(c!.y - wantY)).toBeLessThan(3);
  expect(Math.abs(c!.x - 1300)).toBeGreaterThan(50);   // not the seed spot
  const b = await page.evaluate(() => window.__board!.box('csv'));
  expect(Math.abs(b[0] - c!.x)).toBeLessThan(5);
});

const members = (page: Page) => page.evaluate(() => window.__board!.cards().filter((c) => c.pileId === 'interviews').map((c) => c.id));
const noStack = async (page: Page) => {
  const spots = await page.evaluate(() => window.__board!.cards().filter((c) => !c.pileId).map((c) => `${c.x},${c.y}:${c.id}`));
  const keys = spots.map((s) => s.split(':')[0]);
  expect(keys.length, spots.join(' ')).toBe(new Set(keys).size);
};
const ONE = 'Delete "Priya, indie developer"';

test('deleting a pile asks which: the front file is focused, Enter removes just that file', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page); await select(page, 'interviews'); await page.keyboard.press('Delete');
  await expect(page.locator(C)).toHaveClass(/on/);
  await expect(page.locator(C).getByRole('button', { name: ONE })).toBeFocused();
  await expect(page.locator(C).getByRole('button', { name: 'Delete all 4' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator(C)).not.toHaveClass(/on/);
  await expect.poll(() => members(page)).toHaveLength(3);
  expect(await page.evaluate(() => window.__board!.card('interviews_1'))).toBeUndefined();
  await expect(page.locator('.card[data-id="interviews"] .meta')).toContainText('of 3');
  await noStack(page);
  await page.click('.pb-toast [data-act="undo"]');
  await expect.poll(() => members(page)).toHaveLength(4);
  expect(errs).toEqual([]);
});

test('arrow keys move between the two buttons; Enter on Delete all removes the pile and its files; one Undo restores them piled', async ({ page }) => {
  await openBoard(page); await select(page, 'interviews'); await page.keyboard.press('Delete');
  const one = page.locator(C).getByRole('button', { name: ONE }), all = page.locator(C).getByRole('button', { name: 'Delete all 4' });
  await expect(one).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(all).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(one).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('.card[data-id="interviews"]')).toHaveCount(0);
  await expect.poll(() => members(page)).toHaveLength(0);
  await expect(page.locator('.pb-toast')).toContainText('Removed Customer interviews and its 4 files');
  await noStack(page);
  await page.click('.pb-toast [data-act="undo"]');
  await expect(page.locator('.card[data-id="interviews"]')).toHaveCount(1);
  await expect.poll(() => members(page)).toHaveLength(4);
  await noStack(page);
});

test("a pile's Remove button asks the same, and Escape cancels", async ({ page }) => {
  await openBoard(page);
  await page.locator('[data-id="interviews"]').hover(); await page.locator('[data-id="interviews"] [data-act="del"]').click();
  await expect(page.locator(C).getByRole('button', { name: ONE })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator(C)).not.toHaveClass(/on/);
  expect(await members(page)).toHaveLength(4);
  expect(await calls(page, 'deleteCard')).toBe(0);
});

test('deleting a chat still shows the single Delete button', async ({ page }) => {
  await openBoard(page); await select(page, 'deep'); await page.keyboard.press('Delete');
  await expect(page.locator(C).getByRole('button')).toHaveCount(2);
  await expect(confirmBtn(page, 'Delete')).toBeFocused();
});
