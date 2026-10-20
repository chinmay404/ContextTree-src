import { test, expect, type Page } from '@playwright/test';
import { openBoard, trackErrors } from './helpers';

// A first-time visitor: no stored tour state (the config seeds a returning user for every other spec).
test.use({ storageState: { cookies: [], origins: [] } });

const tour = (page: Page) => page.locator('[data-pb="tour"]');
const seen = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('ct-tour') ?? 'null'));

test('the welcome tour opens on the first visit, steps through, and stays shut after', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await expect(tour(page).getByRole('dialog')).toBeVisible();
  await expect(tour(page).locator('h2')).toHaveText('Every question gets its own card');
  await expect(tour(page).locator('[data-act="next"]')).toBeFocused();

  // Board hotkeys stay off while it is up.
  await page.keyboard.press('q');
  await expect(page.getByRole('dialog')).toHaveCount(1);

  await page.keyboard.press('ArrowRight');
  await expect(tour(page).locator('h2')).toHaveText('Bring in what you already know');
  await tour(page).getByRole('button', { name: 'Back' }).click();
  await expect(tour(page).locator('h2')).toHaveText('Every question gets its own card');
  for (let i = 0; i < 5; i++) await tour(page).locator('[data-act="next"]').click();
  await expect(tour(page).locator('h2')).toHaveText('Stack sources into a pile');
  await expect(tour(page).locator('[data-act="next"]')).toHaveText('Start building');
  await tour(page).locator('[data-act="next"]').click();
  await expect(tour(page)).toHaveCount(0);
  expect(await seen(page)).toMatchObject({ version: 1, finished: true });

  await page.reload();
  await openBoard(page);
  await page.waitForTimeout(600);
  await expect(tour(page)).toHaveCount(0);
  expect(errs).toEqual([]);
});

test('skipping is remembered, and the board menu replays the tour', async ({ page }) => {
  await openBoard(page);
  await tour(page).getByRole('button', { name: 'Skip tour' }).click();
  await expect(tour(page)).toHaveCount(0);
  expect(await seen(page)).toMatchObject({ finished: false });

  await page.click('[data-pb="brand"] .lg');
  await page.click('[data-pb="boardmenu"] [data-m="tour"]');
  await expect(tour(page).locator('h2')).toHaveText('Every question gets its own card');
  await page.keyboard.press('Escape');
  await expect(tour(page)).toHaveCount(0);
  await expect(page.locator('[data-pb="brand"] .lg')).toBeFocused();
});
