import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Needs the app running with NEXT_PUBLIC_BOARD_V3=1. Mock mode (?api=mock) starts with no keys.
const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };

test('ask with no key, add the key in the sheet, and the question is asked again on its own', async ({ page }) => {
  await page.goto('/b/b_seed?api=mock&firstTokenMs=0');
  await expect(page.locator('.card[data-id]')).toHaveCount(12);
  // the shell's key store has answered once, so the engine mock is in step with it (no keys)
  await page.waitForFunction(() => (window.__mockKeys?.calls.length ?? 0) > 0);

  const side = page.locator('[data-id="side"]');
  await side.locator('.face').click();
  await side.locator('.compose textarea').fill('And what about annual plans?');
  await page.keyboard.press('Enter');
  const err = side.locator('.keyerr');
  await expect(err).toContainText('Add your OpenAI key');
  await side.screenshot({ path: shot('rerask-1-error') });

  await err.locator('[data-act="addkey"]').click();
  const field = page.getByLabel('OpenAI API key');
  await expect(field).toBeFocused();
  await field.fill('sk-good-1234');
  await page.getByRole('button', { name: 'Save key' }).click();
  await expect(page.locator('.prow[data-provider="openai"] .ks.ok')).toContainText('•••• 1234');
  await page.screenshot({ path: shot('rerask-2-saved') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);

  await expect(err).toHaveCount(0);
  await expect(side.locator('.qb', { hasText: 'annual plans' })).toHaveCount(1);
  await expect(side.locator('.ans').last()).toBeVisible();
  await page.screenshot({ path: shot('rerask-3-answered') });
  expect(await page.content()).not.toContain('sk-good-1234');
});

test('a key saved for another provider leaves the error alone', async ({ page }) => {
  await page.goto('/b/b_seed?api=mock&firstTokenMs=0');
  await expect(page.locator('.card[data-id]')).toHaveCount(12);
  await page.waitForFunction(() => (window.__mockKeys?.calls.length ?? 0) > 0);
  const side = page.locator('[data-id="side"]');
  await side.locator('.face').click();
  await side.locator('.compose textarea').fill('Q?');
  await page.keyboard.press('Enter');
  await expect(side.locator('.keyerr')).toBeVisible();
  await page.evaluate(async () => { await window.__mockKeys!.save('google', 'sk-good-5678'); });
  await page.waitForTimeout(500);
  await expect(side.locator('.keyerr')).toBeVisible();
});
