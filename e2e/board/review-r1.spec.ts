import { test, expect } from '@playwright/test';
import { openBoard, trackErrors } from './helpers';

const select = (page: import('@playwright/test').Page, id: string | null) => page.evaluate((i) => window.__board!.select(i), id);

test('a chat footer shows one dot per source, a pile being one', async ({ page }) => {
  await openBoard(page);
  for (const id of ['second', 'deep', 'main']) {
    const foot = page.locator(`.card[data-id="${id}"] .cfoot`);
    const txt = await foot.locator('span:not(.dots):not(.sp)').first().innerText();
    const own = +/^(\d+) source/.exec(txt)![1];
    const up = +(/· (\d+) from above/.exec(txt)?.[1] ?? 0);
    expect(await foot.locator('.dots i').count(), `${id}: ${txt}`).toBe(Math.min(6, own + up));
  }
});

test('an expanded source card shows tokens only while the selected chat reads it', async ({ page }) => {
  await openBoard(page);
  await page.hover('[data-id="pdf"] .face'); await page.click('[data-id="pdf"] [data-act="expand"]');
  await expect(page.locator('[data-id="pdf"] .lfoot .upill.tk')).toHaveCount(0);   // nothing selected
  await select(page, 'main');
  await expect(page.locator('[data-id="pdf"] .lfoot .upill.tk')).toHaveCount(1);
  await expect(page.locator('[data-id="pdf"] .lfoot .upill.tk')).toContainText('k tokens');
  await page.hover('[data-id="csv"] .face'); await page.click('[data-id="csv"] [data-act="expand"]');
  await expect(page.locator('[data-id="csv"] .lfoot .upill.tk')).toHaveCount(0);   // main does not read the csv
  await select(page, null);
  await expect(page.locator('[data-id="pdf"] .lfoot .upill.tk')).toHaveCount(0);
});

test("the viewer's Size follows the same rule", async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.openViewer('pdf')); await page.waitForTimeout(400);
  await expect(page.locator('[data-pb="viewer"] .vside h4', { hasText: 'Size' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await select(page, 'main');
  await page.evaluate(() => window.__board!.openViewer('pdf')); await page.waitForTimeout(400);
  await expect(page.locator('[data-pb="viewer"] .vside h4', { hasText: 'Size' })).toHaveCount(1);
  await expect(page.locator('[data-pb="viewer"] .upill.big')).toContainText('k tokens');
});

for (const [act, check] of [['del', 'Removed'], ['view', 'viewer']] as const) {
  test(`a note's ${act} button works on the first click while its text is focused`, async ({ page }) => {
    const errs = trackErrors(page);
    await openBoard(page);
    const n = page.locator('.card[data-id="note"] .n');
    await n.click(); await page.keyboard.type(' x');
    await expect(n).toBeFocused();
    await page.locator('.card[data-id="note"] .face').hover();
    await page.locator(`.card[data-id="note"] [data-act="${act}"]`).click({ timeout: 3000 });
    if (check === 'Removed') await expect(page.locator('.pb-toast')).toContainText('Removed');
    else await expect(page.locator('[data-pb="viewer"]')).toHaveClass(/on/);
    expect(errs).toEqual([]);
  });
}
