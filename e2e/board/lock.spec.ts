import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const F = '[data-pb="focus"]';
const SHEET = '[data-pb="sheet"]';
const dialog = (page: Page) => page.evaluate(() => window.__board!.dialog());
const CONTROLS = '[data-model], #d-more, [data-persona], #d-persona, [data-carry], #d-temp, #d-max, #d-hist, #d-topk, #d-budget';

test('a started chat shows its settings as settled; only the name can change', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page); await page.evaluate(() => window.__board!.openSheet('edit', 'side'));
  await expect(page.locator(`${SHEET} .lockmsg`)).toContainText('Set when this chat started. Branch to try another model or persona.');
  await expect(page.locator('#d-name')).toBeEnabled();
  for (const el of await page.locator(`${SHEET} ${CONTROLS}`).all()) await expect(el).toBeDisabled();
  await expect(page.locator('#d-inherit')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[data-model="gpt"]')).toHaveAttribute('aria-pressed', 'true');   // the settled value is still shown
  await expect(page.locator('[data-persona="teacher"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#d-inherit', { force: true });   // a click does nothing
  await expect(page.locator('#d-inherit')).toHaveAttribute('aria-checked', 'true');
  await page.screenshot({ path: shot('chat-settings-locked') });
  await page.fill('#d-name', 'Renamed side'); await page.click('#d-ok');
  const sent = await page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'updateCard').map((c) => Object.keys((c.args[2] as { data: object }).data)));
  expect(sent).toEqual([['name']]);
  expect(await page.evaluate(() => (window.__board!.card('side')!.data as { name?: string; model?: string }))).toMatchObject({ name: 'Renamed side', model: 'openai/gpt-5-mini' });
  expect(errs).toEqual([]);
});

test('Branch in the settings note opens the branch sheet from that chat', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openSheet('edit', 'side'));
  await page.click(`${SHEET} .lockmsg [data-act="branch-from"]`);
  expect(await dialog(page)).toMatchObject({ mode: 'branch', parentId: 'side' });
  await expect(page.locator('#d-first')).toBeEnabled();
  await expect(page.locator('[data-model="gpt"]')).toBeEnabled();
});

test('a chat with no messages yet stays fully editable', async ({ page }) => {
  await page.goto('/board-dev?fresh=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__board && !!window.__board.card('b_fresh_q1'));
  await page.evaluate(() => window.__board!.openSheet('edit', 'b_fresh_q1'));
  await expect(page.locator(`${SHEET} .lockmsg`)).toHaveCount(0);
  for (const el of await page.locator(`${SHEET} ${CONTROLS.replace('[data-carry], ', '').replace('#d-hist, ', '')}`).all()) await expect(el).toBeEnabled();
  await page.click('[data-model="gemini"]');
  await page.click('#d-ok');
  expect(await page.evaluate(() => (window.__board!.card('b_fresh_q1')!.data as { model?: string }).model)).toBe('gemini/gemini-3-flash-preview');
});

test('the composer model chip on a started chat starts a branch on the picked model', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await page.evaluate(() => window.__board!.openFocus('side')); await page.waitForTimeout(700);
  await page.locator(`${F} .fcomp [data-settings]`).click();
  const pop = page.locator('[data-pb="modelpop"]');
  await expect(pop).toBeVisible();
  await expect(pop.locator('[data-model="gpt"]')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: shot('composer-model-menu') });
  await pop.locator('[data-model="gpt"]').click();   // the model it already has: nothing happens
  await expect(pop).toHaveCount(0);
  expect(await dialog(page)).toBeNull();
  await page.locator(`${F} .fcomp [data-settings]`).click();
  await page.locator('[data-pb="modelpop"] [data-model="claude"]').click();
  await expect(page.locator('[data-pb="modelpop"]')).toHaveCount(0);
  expect(await dialog(page)).toMatchObject({ mode: 'branch', parentId: 'side' });
  await expect(page.locator('[data-model="claude"]').first()).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => (window.__board!.card('side')!.data as { model?: string }).model)).toBe('openai/gpt-5-mini');   // this chat keeps its model
  expect(errs).toEqual([]);
});

test('the composer model chip on a chat with no messages still opens its settings', async ({ page }) => {
  await page.goto('/board-dev?fresh=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__board && !!window.__board.card('b_fresh_q1'));
  await page.evaluate(() => window.__board!.openFocus('b_fresh_q1')); await page.waitForTimeout(700);
  await page.locator(`${F} .fcomp [data-settings]`).click();
  expect(await dialog(page)).toMatchObject({ mode: 'edit' });
});
