import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const SHEET = '[data-pb="inspector"]';

const openInspector = async (page: Page, id: string) => {
  await page.locator(`[data-id="${id}"] .face`).click({ button: 'right', position: { x: 10, y: 10 } });
  await page.locator('[data-pb="cardmenu"] [data-m="inspect"]').click();
};

test('a chat shows what its last answer read, what it left out, and why it is connected', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await page.evaluate(() => {
    window.__mock!.nextTrace = {
      messageId: 'm1', jev: 'ok', enough: true, estimatedTokens: 900, budgetTokens: 12000, embeddingFailed: false,
      sent: [{ n: 1, cardId: 'main', loc: null, score: 0.91 }],
      dropped: [{ cardId: 'main', loc: 'p. 3', score: 0.12, reason: 'jev' }],
      agent: { ran: true, failed: false, steps: [{ tool: 'read_section' }] },
    };
  });
  await openInspector(page, 'deep');   // the seed strings a file and an answer into it
  const sheet = page.locator(SHEET);
  await expect(sheet.getByRole('dialog')).toBeVisible();
  await expect(sheet).toContainText('Sent to the model');
  await expect(sheet).toContainText('91%');
  await expect(sheet).toContainText('judged not to help');
  await expect(sheet).toContainText('read section');
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot('context-inspector') });

  const why = sheet.locator('.ci-string input').first();
  await why.fill('my own reason');
  await why.blur();
  await expect.poll(() => page.evaluate(() => window.__mock!.calls.filter((c) => c.method === 'setEdgeWhy').length)).toBe(1);

  await page.keyboard.press('Escape');
  await expect(sheet).toHaveAttribute('aria-hidden', 'true');
  expect(errs).toEqual([]);
});

test('a chat with no answered turn says so', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await openInspector(page, 'main');
  await expect(page.locator(SHEET)).toContainText('Nothing yet');
  expect(errs).toEqual([]);
});

test('a parent can be strung to its own branch on the board rules', async ({ page }) => {
  await openBoard(page);
  expect(await page.evaluate(() => window.__board!.canPlug('main', 'chat', 'deep'))).toBe(true);
  expect(await page.evaluate(() => window.__board!.canPlug('deep', 'chat', 'main'))).toBe(false);
});
