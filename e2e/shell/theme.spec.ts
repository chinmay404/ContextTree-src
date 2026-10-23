import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Mock mode (?api=mock) is dev only; the board route needs no sign-in there.
const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const BOARD = '/b/b_seed?api=mock';
const bg = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).backgroundColor);
const attr = (page: Page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
const ready = (page: Page) => expect(page.locator('.pb-root .card[data-id]').first()).toBeVisible();
const choose = async (page: Page, label: 'System' | 'Light' | 'Dark') => {
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('radio', { name: label }).click();
  await page.keyboard.press('Escape');
};

test.describe('light and dark', () => {
  test('follows the system by default: a dark OS gets the dark board, a light one the light board', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(BOARD); await ready(page);
    expect(await attr(page)).toBeNull();
    expect(await bg(page, '.pb-root')).toBe('rgb(0, 0, 0)');
    await page.emulateMedia({ colorScheme: 'light' });
    expect(await bg(page, '.pb-root')).toBe('rgb(245, 245, 247)');
  });

  test('the account menu has System / Light / Dark; a choice applies at once, is remembered, and beats the OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(BOARD); await ready(page);
    await page.getByRole('button', { name: 'Account' }).click();
    const group = page.getByRole('radiogroup', { name: 'Appearance' });
    await expect(group.getByRole('radio')).toHaveText(['System', 'Light', 'Dark']);
    await expect(group.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
    await group.getByRole('radio', { name: 'Dark' }).click();
    expect(await attr(page)).toBe('dark');
    expect(await bg(page, '.pb-root')).toBe('rgb(0, 0, 0)');
    expect(await page.evaluate(() => localStorage.getItem('ct-theme'))).toBe('dark');
    await expect(group.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    await page.waitForTimeout(500);   // the board's colours ease over
    await page.screenshot({ path: shot('dark-account-menu') });
    await page.reload(); await ready(page);
    expect(await attr(page)).toBe('dark');                                    // remembered
    await page.emulateMedia({ colorScheme: 'dark' });
    await choose(page, 'Light');
    expect(await attr(page)).toBe('light');
    expect(await bg(page, '.pb-root')).toBe('rgb(245, 245, 247)');            // an explicit Light beats a dark OS
    await choose(page, 'System');
    expect(await attr(page)).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('ct-theme'))).toBeNull();
    expect(await bg(page, '.pb-root')).toBe('rgb(0, 0, 0)');                  // and System follows the dark OS again
  });

  test('the choice is on <html> before the app starts, so a dark choice never flashes white', async ({ page }) => {
    const res = await page.request.get(BOARD);
    const html = await res.text();
    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
    const i = head.indexOf("localStorage.getItem('ct-theme')");
    expect(i).toBeGreaterThan(-1);
    const tag = head.lastIndexOf('<script', i);
    expect(head.slice(tag, i)).not.toMatch(/(async|defer)/);              // a plain inline script in <head> runs before the first paint
    await page.addInitScript(() => localStorage.setItem('ct-theme', 'dark'));
    await page.goto(BOARD, { waitUntil: 'commit' });
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
  });

  test('the arrow keys move between the three choices', async ({ page }) => {
    await page.goto(BOARD); await ready(page);
    await page.getByRole('button', { name: 'Account' }).click();
    await page.getByRole('radio', { name: 'System' }).focus();
    await page.keyboard.press('ArrowRight');
    expect(await attr(page)).toBe('light');
    await expect(page.getByRole('radio', { name: 'Light' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    expect(await attr(page)).toBe('dark');
    await page.keyboard.press('ArrowRight');                                  // wraps to System
    expect(await attr(page)).toBeNull();
  });

  test('dark: strings, cards and the focus view take the dark palette; screenshots', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ct-theme', 'dark'));
    await page.goto(BOARD); await ready(page);
    await page.waitForTimeout(800);
    // a data-family wire is drawn in the muted dark green, not the pale light one
    const wire = await page.evaluate(() => getComputedStyle(document.querySelector('.pb-tubes .wire')!).stroke);
    expect(wire).toBe('rgb(94, 133, 83)');
    expect(await bg(page, '.card.chat .face')).toBe('rgb(44, 44, 46)');
    await page.screenshot({ path: shot('dark-board') });
    await page.locator('.card.chat').first().click({ position: { x: 20, y: 12 } });
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-pb="focus"]')).toBeVisible();
    await page.waitForTimeout(700);
    expect(await bg(page, '[data-pb="focus"]')).toBe('rgb(44, 44, 46)');
    await page.screenshot({ path: shot('dark-focus') });
    await page.keyboard.press('Escape');
    await page.keyboard.press('v');
    await page.locator('[data-pb="paste"] textarea').fill('example.com/pricing');
    await page.waitForTimeout(700);
    await page.screenshot({ path: shot('dark-paste-box') });
    await page.keyboard.press('Escape');
    await page.locator('.card.src .face').first().click({ button: 'right', position: { x: 10, y: 8 } });
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('dark-colour-menu') });
  });
});
