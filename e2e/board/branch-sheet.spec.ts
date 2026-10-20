import { test, expect } from '@playwright/test';
import { openBoard, trackErrors } from './helpers';

const dialog = (page: import('@playwright/test').Page) => page.evaluate(() => window.__board!.dialog());

test('Branch opens the sheet from that chat and creates the branch it describes', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page); const tubes = await page.locator('path.tube').count();
  await page.click('[data-id="main"] .apill[data-act="branch"]');
  await expect(page.locator('[data-pb="sheet"] h2')).toHaveText('New branch'); await expect(page.locator('[data-pb="sheet"] .from')).toContainText('Q1');
  await expect(page.locator('#d-first')).toBeFocused();
  await page.fill('#d-name', 'Team pricing'); await page.click('[data-model="gemini"]'); await page.click('[data-persona="skeptic"]');
  await expect(page.locator('#d-persona')).toHaveValue('Push back. Look for what could be wrong and say how sure you are.');
  await page.click('#d-inherit'); await page.click('[data-carry="whole"]'); await page.click('#d-ok');
  const c = await page.evaluate(() => window.__board!.chats().find(c => (c.data as any).name === 'Team pricing'));
  expect(c).toMatchObject({ parentId: 'main', data: { model: 'gemini/gemini-3-flash-preview', persona: 'skeptic', inheritDesk: false, carry: 'whole' } });
  await expect(page.locator('path.tube')).toHaveCount(tubes + 1);   // the string to the new chat
  expect(errs).toEqual([]);
});

test('Advanced controls map onto AdvancedSettings', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openSheet('branch', 'main'));
  await page.click('.adv summary');
  await page.locator('#d-temp').fill('1.2'); await page.selectOption('#d-max', '2000'); await page.selectOption('#d-hist', 'lastK');
  await page.fill('#d-k', '8'); await page.locator('#d-topk').fill('3'); await page.selectOption('#d-budget', '8000');
  await page.fill('#d-name', 'Tuned'); await page.click('#d-ok');
  const c = await page.evaluate(() => window.__board!.chats().find(c => (c.data as any).name === 'Tuned'));
  expect((c!.data as any).advanced).toEqual({ temperature: 1.2, maxOutputTokens: 2000, historyMode: 'lastK', lastKMessages: 8, externalContextTopK: 3, contextBudgetTokens: 8000 });
});

test('the estimate follows excerpts per question', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openSheet('branch', 'main')); await page.click('.adv summary');
  await page.locator('#d-topk').fill('5'); const a = await page.locator('#d-est').innerText();
  await page.locator('#d-topk').fill('10'); await expect(page.locator('#d-est')).not.toHaveText(a);
  await expect(page.locator('#v-topk')).toHaveText('10');
});

test('settings edits an existing chat', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openSheet('edit', 'side'));
  await expect(page.locator('[data-pb="sheet"] h2')).toHaveText('Chat settings'); await expect(page.locator('#d-ok')).toHaveText('Save');
  await expect(page.locator('#d-first')).toHaveCount(0); await expect(page.locator('#d-name')).toBeFocused();
  await page.fill('#d-name', 'Renamed side'); await page.press('#d-name', 'Enter');
  expect(await dialog(page)).toBeNull();
  expect(await page.evaluate(() => (window.__board!.card('side')!.data as any).name)).toBe('Renamed side');
});

test('a root question starts its own tree with no carry controls', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openSheet('root'));
  await expect(page.locator('[data-pb="sheet"] h2')).toHaveText('New question');
  await expect(page.locator('[data-pb="sheet"] .from')).toHaveText('Starts its own tree, with an empty desk.');
  await expect(page.locator('#d-inherit')).toHaveCount(0); await expect(page.locator('#d-ok')).toHaveText('Create');
});

test('a first question is asked right away', async ({ page }) => {
  await openBoard(page); await page.evaluate(() => window.__board!.openSheet('branch', 'main'));
  await page.fill('#d-first', 'And agencies?'); await page.keyboard.press('Control+Enter');
  await expect.poll(() => page.evaluate(() => window.__board!.calls().some(c => c.method === 'streamChat' && (c.args[0] as any).message === 'And agencies?')), { timeout: 2000 }).toBe(true);
  expect(await dialog(page)).toBeNull();
});

test('Escape and the scrim cancel; the closed sheet is inert and focus returns to Branch', async ({ page }) => {
  await openBoard(page); const sheet = page.locator('[data-pb="sheet"]');
  await expect(sheet).toHaveAttribute('aria-hidden', 'true'); await expect(sheet).toHaveJSProperty('inert', true);
  await page.click('[data-id="main"] .apill[data-act="branch"]'); await expect(sheet).toHaveClass(/on/);
  await expect(sheet).toHaveJSProperty('inert', false);
  await page.keyboard.press('Escape'); expect(await dialog(page)).toBeNull();
  await expect(sheet).toHaveJSProperty('inert', true);
  await expect(page.locator('[data-id="main"] .apill[data-act="branch"]')).toBeFocused();
  await page.evaluate(() => window.__board!.openSheet('branch', 'main'));
  await page.mouse.click(8, 8); expect(await dialog(page)).toBeNull();
});
