import { test, expect, type Page } from '@playwright/test';

// Needs the app running with NEXT_PUBLIC_BOARD_V3=1. Mock mode (?api=mock) is dev only and starts with no keys.
const BOARD = '/b/b_seed?api=mock';

async function openFromMenu(page: Page) {
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: /API keys/ }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
}
const row = (page: Page, name: string) => page.locator('.prow').filter({ has: page.locator('.pn', { hasText: name }) });

test.describe('settings sheet', () => {
  test('opens from the avatar with seven empty rows and an empty picker preview', async ({ page }) => {
    await page.goto(BOARD);
    await openFromMenu(page);
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog.getByRole('heading', { name: 'API keys' })).toBeVisible();
    await expect(dialog.locator('.prow .ks.none')).toHaveCount(7);
    await expect(dialog.locator('.cnt')).toHaveText('No keys yet');
    await expect(dialog.locator('[data-model-row][data-state="locked"]')).toHaveCount(7);
    await expect(dialog.getByText('Needs a key', { exact: true })).toBeVisible();
    await expect(dialog.getByText('How keys are kept:')).toBeVisible();
  });

  test('add, replace with a rejected key, then remove', async ({ page }) => {
    await page.goto(BOARD);
    await openFromMenu(page);
    const openai = row(page, 'OpenAI');
    await openai.getByRole('button', { name: 'Add key' }).click();
    const field = page.getByLabel('OpenAI API key');
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute('type', 'password');
    await expect(field).toHaveAttribute('autocomplete', 'off');
    await field.fill('sk-good-1234');
    await openai.getByRole('button', { name: 'Save key' }).click();
    await expect(openai.getByRole('button', { name: 'Checking with OpenAI…' })).toBeVisible();
    await expect(openai.locator('.ks.ok')).toContainText('•••• 1234');
    await expect(page.locator('.cnt')).toHaveText('1 of 7 working');
    await expect(page.locator('[data-model-row="gpt"][data-state="ready"]')).toHaveCount(1);
    expect(await page.content()).not.toContain('sk-good-1234');

    await openai.getByRole('button', { name: 'Replace' }).click();
    await page.getByLabel('OpenAI API key').fill('sk-bad-0000');
    await openai.getByRole('button', { name: 'Save key' }).click();
    await expect(openai.getByRole('alert')).toHaveText('This key was turned down. Check that you copied all of it.');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(openai.locator('.ks.ok')).toContainText('•••• 1234');

    await openai.getByRole('button', { name: 'Remove' }).click();
    await expect(openai.getByText('Remove your OpenAI key? GPT-5 mini stops working until you add one.')).toBeVisible();
    await openai.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(openai.locator('.ks.none')).toHaveText('Not set');
    await expect(page.locator('.cnt')).toHaveText('No keys yet');
  });

  test('a locked model in the Branch sheet opens Settings on that provider with its field focused', async ({ page }) => {
    await page.goto(BOARD);
    await expect(page.locator('.card[data-id]')).toHaveCount(12);
    await page.click('[data-id="main"] .apill[data-act="branch"]');
    const claude = page.locator('[data-model="claude"]');
    await expect(claude).toHaveClass(/locked/);
    await claude.click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await expect(page.getByLabel('Anthropic API key')).toBeFocused();
  });

  test('Escape closes it, refocuses the opener and leaves a selected card selected', async ({ page }) => {
    await page.goto(BOARD);
    await expect(page.locator('.card[data-id]')).toHaveCount(12);
    await page.locator('.card.chat[data-id="main"] .face').click();
    await expect(page.locator('.pb-root .card.selected')).toHaveCount(1);
    await openFromMenu(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Account' })).toBeFocused();
    await expect(page.locator('.pb-root .card.selected')).toHaveCount(1);
  });

  test('a scrim click closes it; Export is Soon; there is no Defaults', async ({ page }) => {
    await page.goto(BOARD);
    await openFromMenu(page);
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    const exp = dialog.locator('.ni', { hasText: 'Export & data' });
    await expect(exp).toHaveAttribute('aria-disabled', 'true');
    await expect(exp).toContainText('Soon');
    await expect(dialog.getByText('Defaults')).toHaveCount(0);
    await page.mouse.click(8, 8);
    await expect(dialog).toHaveCount(0);
  });

  test('each open makes one non-forced check', async ({ page }) => {
    await page.goto(BOARD);
    await openFromMenu(page);
    await page.waitForTimeout(600);
    const checks = () => page.evaluate(() => window.__mockKeys!.calls.filter((c) => c.method === 'check'));
    expect(await checks()).toEqual([{ method: 'check', force: false }]);
  });

  test('390 px: fits, no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BOARD);
    await openFromMenu(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const box = await page.getByRole('dialog', { name: 'Settings' }).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });
});
