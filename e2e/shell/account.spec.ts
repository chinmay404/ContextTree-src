import { test, expect } from '@playwright/test';

// Needs the app running with NEXT_PUBLIC_BOARD_V3=1. Mock mode (?api=mock) is dev only.
test.describe('account pill and menu', () => {
  test('board: pill shows initials and the menu has every row', async ({ page }) => {
    await page.goto('/b/b_seed?api=mock');
    const pill = page.getByRole('button', { name: 'Account' });
    await expect(pill).toHaveText('SR');
    await pill.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByText('Sam Rivera')).toBeVisible();
    await expect(menu.getByText('sam.rivera@example.com')).toBeVisible();
    await expect(menu.getByText('Free plan')).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /API keys/ })).toContainText('No keys yet');
    const exp = menu.getByRole('menuitem', { name: /Export my boards/ });
    await expect(exp).toHaveAttribute('aria-disabled', 'true');
    await expect(exp).toContainText('Soon');
    await expect(menu.getByRole('menuitem', { name: /Help & feedback/ })).toHaveAttribute('href', /^mailto:/);
    await expect(menu.getByRole('menuitem', { name: /Sign out/ })).toBeVisible();
  });

  test('keyboard: ArrowDown focuses the first item, Esc closes and refocuses the pill', async ({ page }) => {
    await page.goto('/b/b_seed?api=mock');
    const pill = page.getByRole('button', { name: 'Account' });
    await pill.click();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(pill).toBeFocused();
  });

  test('Esc with the menu open leaves a selected card selected', async ({ page }) => {
    await page.goto('/b/b_seed?api=mock');
    await expect(page.locator('.card[data-id]')).toHaveCount(12);
    await page.locator('.card.chat[data-id="main"] .face').click();
    await expect(page.locator('.pb-root .card.selected')).toHaveCount(1);
    await page.getByRole('button', { name: 'Account' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.locator('.pb-root .card.selected')).toHaveCount(1);
  });

  test('a click outside closes the menu', async ({ page }) => {
    await page.goto('/b/b_seed?api=mock');
    await page.getByRole('button', { name: 'Account' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.mouse.click(300, 600);
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('/boards shows the pill too', async ({ page }) => {
    await page.goto('/boards?api=mock');
    await expect(page.getByRole('button', { name: 'Account' })).toHaveText('SR');
  });
});
