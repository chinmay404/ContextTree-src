import { test, expect, type Page } from '@playwright/test';

// Mock mode (?api=mock) is dev only. Needs no sign-in; the board route is reachable without NEXT_PUBLIC_BOARD_V3.
const HOME = '/boards?api=mock&keys=all';

const openFirstBoard = async (page: Page) => {
  await page.goto(HOME);
  await page.locator('[data-board-card]').first().click();
  await expect(page).toHaveURL(/\/b\//);
  await expect(page.locator('.pb-root .card[data-id]').first()).toBeVisible();
};

test.describe('browser Back from a board', () => {
  test('one press leaves the board for the boards home, whatever was opened on it', async ({ page }) => {
    await openFirstBoard(page);
    const chat = page.locator('.pb-root .card.chat').first();
    await chat.click({ position: { x: 20, y: 12 } });
    await page.keyboard.press('Enter');                                   // the focus view
    await expect(page.locator('[data-pb="focus"]')).toBeVisible();
    await page.locator('[data-pb="focus"] [data-b]').first().click();     // the branch sheet over it
    await expect(page.locator('[data-pb="sheet"]')).toHaveAttribute('aria-hidden', 'false');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');                                  // back on the board
    await page.keyboard.press('v');                                       // the paste box
    await expect(page.locator('[data-pb="paste"]')).toHaveAttribute('aria-hidden', 'false');
    await page.keyboard.press('Escape');
    const src = page.locator('.pb-root .card.src[data-id]').first();
    await src.locator('.meta, .ttl').first().dblclick();                  // a source viewer
    await expect(page.locator('[data-pb="viewer"]')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/boards/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('switching boards from the logo menu does not stack history: New board, then one Back is the home', async ({ page }) => {
    await openFirstBoard(page);
    const first = page.url();
    await page.click('[data-pb="brand"] .lg');
    await page.locator('[data-pb="boardmenu"]').getByText('New board').click();
    await page.waitForURL((u) => u.toString() !== first && /\/b\//.test(u.toString()));
    await expect(page.locator('.pb-root .card.chat')).toHaveCount(1);
    await page.goBack();
    await expect(page).toHaveURL(/\/boards/);
  });

  test('opening a board from the home is still one entry, so Forward returns to it', async ({ page }) => {
    await openFirstBoard(page);
    const url = page.url();
    await page.goBack();
    await expect(page).toHaveURL(/\/boards/);
    await page.goForward();
    await expect(page).toHaveURL(url);
  });
});
