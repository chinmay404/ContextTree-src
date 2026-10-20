import { test, expect } from '@playwright/test';
import { center, openBoard, trackErrors } from './helpers';

for (const id of ['video', 'pdf', 'note', 'interviews', 'csv', 'shot', 'web', 'podcast'])
  test(`double-click opens viewer: ${id}`, async ({ page }) => {
    await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(250);
    const [x, y] = await center(page, `[data-id="${id}"] .meta`); await page.mouse.click(x, y); await page.mouse.click(x, y); await page.waitForTimeout(400);
    expect((await page.evaluate(() => window.__board!.viewer()))?.cardId).toBe(id);
    await expect(page.locator('.wrap[data-pb="viewer"]')).toHaveClass(/on/);
    await page.keyboard.press('Escape'); expect(await page.evaluate(() => window.__board!.viewer())).toBeNull();
    await expect(page.locator('.wrap[data-pb="viewer"]')).not.toHaveClass(/on/);
  });

test('the closed viewer is inert and hidden from assistive tech; focus returns to the opener', async ({ page }) => {
  await openBoard(page);
  const v = page.locator('.wrap[data-pb="viewer"]');
  await expect(v).toHaveAttribute('aria-hidden', 'true'); await expect(v).toHaveJSProperty('inert', true);
  await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(250);
  await page.locator('[data-id="pdf"]').hover(); await page.locator('[data-id="pdf"] [data-act="view"]').focus();
  await page.keyboard.press('Enter'); await expect(v).toHaveClass(/on/);
  await expect(v).toHaveAttribute('aria-hidden', 'false'); await expect(v).toHaveJSProperty('inert', false);
  await page.keyboard.press('Escape');
  await expect(v).toHaveJSProperty('inert', true);
  await expect(page.locator('[data-id="pdf"] [data-act="view"]')).toBeFocused();
});

test('clicking the scrim closes the viewer', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openViewer('pdf'));
  await page.mouse.click(8, 8); expect(await page.evaluate(() => window.__board!.viewer())).toBeNull();
});

test('soon viewers say what is coming', async ({ page }) => {
  await openBoard(page);
  for (const [id, text] of [['video', 'Reading videos is coming soon'], ['podcast', 'Reading audio is coming soon'], ['shot', 'Reading images is coming soon']]) {
    await page.evaluate((i) => window.__board!.openViewer(i), id); await expect(page.locator('[data-pb="viewer"] .soonbox')).toHaveText(text); await page.keyboard.press('Escape');
  }
});

test('each type shows its body', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  const open = (id: string) => page.evaluate((i) => window.__board!.openViewer(i), id);
  const V = '[data-pb="viewer"]';
  await open('video'); await expect(page.locator(`${V} .hero .dur`)).toHaveText('18:42'); await page.keyboard.press('Escape');
  await open('podcast'); await expect(page.locator(`${V} .hero.audio .bars i`)).toHaveCount(64); await page.keyboard.press('Escape');
  await open('pdf');
  await expect(page.locator(`${V} .pages .pg`)).toHaveCount(24); await expect(page.locator(`${V} .pages .pg.hit`)).toHaveCount(2);
  await expect(page.locator(`${V} .summary`)).toContainText('412 solo founders'); await expect(page.locator(`${V} .passages button`)).toHaveCount(3);
  await expect(page.locator(`${V} .vside h4`).first()).toHaveText('What is this for?'); await expect(page.locator(`${V} .upill`)).toContainText('k tokens');
  await page.keyboard.press('Escape');
  await open('web'); await expect(page.locator(`${V} .webprev h3`)).toHaveText('Why we doubled our price'); await expect(page.locator(`${V} .webprev .bar`)).toContainText('harbor.dev'); await page.keyboard.press('Escape');
  await open('csv'); await expect(page.locator(`${V} .tbl table`)).toHaveCount(1); await page.keyboard.press('Escape');
  await open('shot'); await expect(page.locator(`${V} .imgbig .mock3`)).toHaveCount(1); await page.keyboard.press('Escape');
  expect(errs).toEqual([]);
});

test('a pile member opens inside the pile and goes back', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openViewer('interviews'));
  await expect(page.locator('.vw .sec').first()).toHaveText('4 files in this pile');
  await page.locator('.members button').nth(1).click(); expect((await page.evaluate(() => window.__board!.viewer()))?.memberId).toBe('interviews_2');
  await expect(page.locator('.vw h2')).toHaveText('Marco, agency lead');
  await page.getByText('Back to the pile').click(); expect((await page.evaluate(() => window.__board!.viewer()))?.memberId).toBeNull();
});

test('editing a note in its viewer saves once after typing stops', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openViewer('note')); await page.locator('.editor').pressSequentially(' More.');
  await page.waitForTimeout(800);
  const calls = await page.evaluate(() => window.__board!.calls().filter((c) => c.method === 'updateCard' && (c.args[1] === 'note')));
  expect(calls).toHaveLength(1);
});

test('a doc has no editable text area', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openViewer('interviews', 'interviews_4'));
  await expect(page.locator('.vw .editor')).toContainText('Patterns: people anchor'); await expect(page.locator('textarea.editor')).toHaveCount(0);
});

test('editing a note makes the chats that read it say Source changed', async ({ page }) => {
  await openBoard(page);
  await expect(page.locator('[data-id="main"] .stale')).toHaveCount(0);
  await page.evaluate(() => window.__board!.openViewer('note')); await page.locator('.editor').pressSequentially(' More.');
  await expect(page.locator('[data-id="main"] .stale')).toHaveText('Source changed');
  await expect(page.locator('[data-id="side"] .stale')).toHaveText('Source changed');
});

test('what it is for saves once after typing stops', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openViewer('pdf'));
  await page.locator('.vside .desc').fill('Trust this.'); await page.waitForTimeout(800);
  const calls = await page.evaluate(() => window.__board!.calls().filter((c) => c.method === 'updateCard' && c.args[1] === 'pdf'));
  expect(calls).toHaveLength(1);
  expect((await page.evaluate(() => window.__board!.card('pdf')!.data) as { desc?: string }).desc).toBe('Trust this.');
});

test('a pile member can be switched off from the viewer', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(250);
  const foot = page.locator('[data-id="second"] .cfoot > span:not(.dots):not(.sp):not(.stale)').first(); const before = Number((await foot.innerText()).match(/(\d+) source/)![1]);
  await page.evaluate(() => window.__board!.openViewer('interviews'));
  const row = page.locator('.members .mrow').nth(1); await expect(row.locator('[data-memoff]')).toHaveAttribute('aria-checked', 'true');
  await row.locator('[data-memoff]').click();
  expect(await page.evaluate(() => (window.__board!.card('interviews_2')!.data as { off?: boolean }).off)).toBe(true);
  await expect(row).toHaveClass(/off/); await expect(row.locator('[data-memoff]')).toHaveAttribute('aria-checked', 'false');
  await expect(foot).toContainText(`${before - 1} source`);
  await row.locator('[data-memoff]').click(); await expect(row).not.toHaveClass(/off/);
});

test('a passage can be left out from the viewer', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openViewer('pdf'));
  await page.locator('.passages button').first().click();
  await expect(page.locator('.passages button').first()).toHaveClass(/off/);
  expect(await page.evaluate(() => (window.__board!.card('pdf')!.data as { excerpts: { on: boolean }[] }).excerpts[0].on)).toBe(false);
});

test('Read by lists the chats that read it', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openViewer('pdf'));
  const used = page.locator('.vw .used');
  for (const q of ['Q1', 'Q1.1', 'Q1.2', 'Q1.2.1']) await expect(used.locator('.qchip', { hasText: new RegExp(`^${q.replace(/\./g, '\\.')}$`) })).toHaveCount(1);
});
