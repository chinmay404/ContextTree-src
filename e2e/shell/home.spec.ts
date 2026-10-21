import { test, expect, type Page } from '@playwright/test';

// Needs the app running with NEXT_PUBLIC_BOARD_V3=1. Mock mode (?api=mock) is dev only.
const URL = '/boards?api=mock&keys=all';

/** Adds boards to the shared mock, then leaves the page and comes back client-side (a reload would reset the mock). */
async function addBoards(page: Page, titles: string[]) {
  await page.evaluate(async (ts) => {
    const m = window.__mock as unknown as { createBoard(i: { id: string; title: string }): Promise<unknown> };
    for (const [i, title] of ts.entries()) await m.createBoard({ id: `b_test_${i}x${Date.now().toString(36)}`, title });
  }, titles);
  await page.getByRole('button', { name: 'Blank board' }).click(); // also adds one "Untitled board"
  await expect(page).toHaveURL(/\/b\//);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

const cards = (page: Page) => page.locator('[data-board-card]');
const rows = (page: Page) => page.locator('[data-board-row]');

test.describe('boards home', () => {
  test('greeting, starters and a map on every card', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Good (morning|afternoon|evening), Sam$/);
    await expect(page.getByRole('heading', { name: 'Start something new' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Blank board' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Jump back in' })).toBeVisible();
    await expect(cards(page).first()).toBeVisible();
    const n = await cards(page).count();
    await expect(page.locator('[data-board-card] svg[aria-label^="Map of"]')).toHaveCount(n);
  });

  test('hostile titles render as text', async ({ page }) => {
    await page.goto(URL);
    await expect(cards(page).first()).toBeVisible();
    await addBoards(page, ['<img src=x onerror=alert(1)>']);
    await expect(page.getByText('<img src=x onerror=alert(1)>').first()).toBeVisible();
    await expect(page.locator('.ct-home img')).toHaveCount(0);
  });

  test('search, sort and the list view survive', async ({ page }) => {
    await page.goto(URL);
    await expect(cards(page).first()).toBeVisible();
    await addBoards(page, ['Zebra notes', 'Apple pricing']);
    await expect(cards(page)).toHaveCount(4); // seed + two + the Untitled board

    await page.getByRole('searchbox', { name: 'Search boards' }).fill('pric');
    await expect(cards(page)).toHaveCount(2);
    await page.getByRole('searchbox', { name: 'Search boards' }).fill('zzzz');
    await expect(page.getByText('No boards match “zzzz”.')).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search boards' }).fill('');

    await page.getByRole('combobox', { name: 'Sort' }).selectOption('name');
    const titles = await cards(page).locator('.ttl').allTextContents();
    expect(titles).toEqual([...titles].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));

    await page.getByRole('button', { name: 'List view' }).click();
    await expect(rows(page)).toHaveCount(4);
    await page.reload(); // the mock resets, the chosen view does not
    await expect(rows(page).first()).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });

  test('rename through the menu', async ({ page }) => {
    await page.goto(URL);
    await cards(page).first().getByRole('button', { name: /^Options for/ }).click();
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const input = page.getByRole('textbox', { name: 'Board name' });
    await input.fill('Renamed by test');
    await input.press('Enter');
    await expect(page.locator('.ttl').filter({ hasText: 'Renamed by test' })).toBeVisible();
  });

  test('delete, Undo brings it back', async ({ page }) => {
    await page.goto(URL);
    await expect(cards(page).first()).toBeVisible();
    const before = await cards(page).count();
    await cards(page).first().getByRole('button', { name: /^Options for/ }).click();
    await page.getByRole('menuitem', { name: 'Delete board' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete board' }).click();
    await expect(page.getByText('Board deleted')).toBeVisible();
    await expect(cards(page)).toHaveCount(before - 1);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(cards(page)).toHaveCount(before);
  });

  test('Blank board creates a board and opens it', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'Blank board' }).click();
    await expect(page).toHaveURL(/\/b\/b_[a-z0-9]+_[a-z0-9]{6}/);
  });

  test('390 px: list layout, no sideways scroll, pill visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(URL);
    await expect(rows(page).first()).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  });

  test('?fail=listBoards shows the error and Try again recovers', async ({ page }) => {
    await page.goto(URL + '&fail=listBoards');
    await expect(page.getByText("Couldn't reach your boards.")).toBeVisible();
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(cards(page).first()).toBeVisible();
  });

  test('Compare answers makes a board with four chats', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('button', { name: 'Compare answers' })).toBeVisible();
    await page.getByRole('button', { name: 'Compare answers' }).click();
    await expect(page).toHaveURL(/\/b\/b_[a-z0-9]+_[a-z0-9]{6}/);
    await expect(page.locator('.card.chat')).toHaveCount(4);
  });

  test('a failed starter says so and leaves no half-made board', async ({ page }) => {
    await page.goto(URL);
    await expect(cards(page).first()).toBeVisible();
    const before = await cards(page).count();
    await page.evaluate(() => {
      const m = window.__mock as unknown as { failNext(method: string, err: unknown): void; constructor: { ApiError: new (s: number, c: string) => unknown } };
      m.failNext('createCard', new m.constructor.ApiError(500, 'boom'));
    });
    await page.getByRole('button', { name: 'Plan from notes' }).click();
    await expect(page.getByText("Couldn't make that board. Try again.")).toBeVisible();
    await expect(page).toHaveURL(/\/boards/);
    await expect(cards(page)).toHaveCount(before);
  });
});
