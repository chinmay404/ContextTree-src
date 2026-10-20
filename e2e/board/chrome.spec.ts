import { test, expect } from '@playwright/test';
import { openBoard, trackErrors } from './helpers';

test('zoom buttons and label', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.camSnap(0, 0, 1));
  await page.click('[data-pb="zoom"] [data-z="in"]'); await page.waitForTimeout(900); await expect(page.locator('[data-pb="zoom"] .z')).toHaveText('125%');
  await page.click('[data-pb="zoom"] [data-z="out"]'); await page.waitForTimeout(900); await expect(page.locator('[data-pb="zoom"] .z')).toHaveText('100%');
  await page.evaluate(() => window.__board!.camSnap(0, 0, 1.6));
  await page.click('[data-pb="zoom"] [data-z="fit"]'); await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.__board!.cam().z)).toBeLessThan(1.1);
});
test('resizing the window fits the board again', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.camSnap(0, 0, 1.6));
  await page.setViewportSize({ width: 1000, height: 700 }); await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.__board!.cam().z)).toBeLessThan(1.1);
});
test('the trail shows the path and flies to a step', async ({ page }) => {
  await openBoard(page);
  await expect(page.locator('[data-pb="trail"]')).toContainText('Pick a chat to see the questions that led to it.');
  await page.evaluate(() => window.__board!.select('deep'));
  await expect(page.locator('[data-pb="trail"] button')).toHaveCount(3); await expect(page.locator('[data-pb="trail"] button.here')).toContainText('Q1.2.1');
  const before = await page.evaluate(() => window.__board!.cam());
  await page.locator('[data-pb="trail"] button').first().click(); await page.waitForTimeout(900);
  const after = await page.evaluate(() => window.__board!.cam());
  expect(after.x !== before.x || after.y !== before.y || after.z !== before.z).toBe(true);
  expect(await page.evaluate(() => window.__board!.selected())).toBe('main');
});
test('the brand shows and renames the board', async ({ page }) => {
  const errs = trackErrors(page); await openBoard(page); await expect(page.locator('[data-pb="brand"]')).toContainText('Pricing study');
  await page.click('[data-pb="brand"] .bt'); await page.keyboard.press('End'); await page.keyboard.type(' 2'); await page.keyboard.press('Enter');
  await expect(page.locator('[data-pb="brand"]')).toContainText('Pricing study 2');
  const calls = await page.evaluate(() => window.__board!.calls());
  expect(calls.some((c) => c.method === 'updateBoard' && (c.args[1] as { title?: string }).title === 'Pricing study 2')).toBe(true);
  expect(errs).toEqual([]);
});
test('the logo lists boards; New board creates and opens it', async ({ page }) => {
  await openBoard(page);
  await page.click('[data-pb="brand"] .lg');
  const menu = page.locator('[data-pb="boardmenu"]');
  await expect(menu).toContainText('Pricing study'); await expect(menu.locator('[data-current="true"]')).toHaveCount(1);
  await expect(menu).not.toContainText('API keys');
  await page.keyboard.press('Escape'); await expect(menu).toHaveAttribute('aria-hidden', 'true');
  await page.click('[data-pb="brand"] .lg'); await menu.getByText('New board').click();
  const seed = await page.locator('.pb-root').getAttribute('data-board');
  await page.waitForFunction((id) => document.querySelector('.pb-root')?.getAttribute('data-board') !== id && document.querySelectorAll('.card.chat').length === 1, seed);
  expect(await page.evaluate(() => window.__board!.calls().some((c) => c.method === 'createBoard'))).toBe(true);
});
test('Enter on the focused title starts a rename, not the focus view', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.select('main'));
  await page.locator('[data-pb="brand"] .bt').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-pb="brand"] input.bt')).toBeFocused();
  expect(await page.evaluate(() => window.__board!.focus())).toBeNull();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-pb="brand"] button.bt')).toBeFocused();
});
test('N and Q are ignored while the board menu has focus', async ({ page }) => {
  await openBoard(page); const n = await page.locator('.card').count();
  await page.click('[data-pb="brand"] .lg'); await expect(page.locator('[data-pb="boardmenu"] button').first()).toBeFocused();
  await page.keyboard.press('n'); await page.keyboard.press('q');
  expect(await page.locator('.card').count()).toBe(n);
  expect(await page.evaluate(() => window.__board!.dialog())).toBeNull();
  await page.keyboard.press('Escape'); await expect(page.locator('[data-pb="brand"] .lg')).toBeFocused();
});
