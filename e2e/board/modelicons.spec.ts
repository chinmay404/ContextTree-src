import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const F = '[data-pb="focus"]';
const shot = (name: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${name}.png`; };

test('a card header shows the model mark in its colour and the detailed model name', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  const head = page.locator('[data-id="main"] .chd');
  const mark = head.locator('svg.mmark');
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveAttribute('aria-label', 'Claude Sonnet 4');
  await expect(head.locator('.mdot')).toHaveCount(0);
  await expect(head.locator('.mtag')).toHaveText('Q1 · Claude Sonnet 4');
  expect(await mark.evaluate((e) => getComputedStyle(e).color)).toBe('rgb(224, 103, 58)');   // MODELS.claude.color
  expect(await mark.evaluate((e) => [getComputedStyle(e).width, getComputedStyle(e).height])).toEqual(['13px', '13px']);   // the dot's slot; the card is scaled by the camera
  await expect(page.locator('[data-id="side"] .chd .mtag')).toHaveText('Q1.1 · GPT-5 mini');
  await expect(page.locator('[data-id="second"] .chd .mtag')).toHaveText('Q1.2 · Gemini 3 Flash');
  await page.locator('[data-id="main"]').screenshot({ path: shot('card-header') });
  expect(errs).toEqual([]);
});

test('zoomed out, a chat label carries the mark, not a dot', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.camSnap(300, 300, 0.3));
  await page.waitForTimeout(300);
  const labels = page.locator('.card.chat.size-s .maplabel');
  expect(await labels.count()).toBeGreaterThan(0);
  await expect(labels.first().locator('svg.mmark')).toHaveCount(1);
  await expect(labels.first().locator('.mdot')).toHaveCount(0);
});

test('the focus view says which model answered, by name, with its mark', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await page.evaluate(() => window.__board!.openFocus('main')); await page.waitForTimeout(700);
  const who = page.locator(`${F} .art .who`).first();
  await expect(who).toContainText('Claude Sonnet 4 answered with');
  await expect(who.locator('svg.mmark')).toHaveCount(1);
  await expect(page.locator(`${F} .fmeta svg.mmark`)).toHaveCount(1);
  await expect(page.locator(`${F} .fmeta b`)).toHaveText('Claude Sonnet 4');
  await expect(page.locator(`${F} .tl .h svg.mmark`).first()).toBeVisible();
  await expect(page.locator(`${F} .cp[data-settings]`)).toContainText('Claude Sonnet 4');
  await page.locator(`${F} .art`).first().screenshot({ path: shot('answered-with') });
  await page.screenshot({ path: shot('focus-view') });
  expect(errs).toEqual([]);
});

test('the model picker lists detailed names, each pill with its mark', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await page.click('[data-id="main"] .apill[data-act="branch"]'); await page.waitForTimeout(500);
  const pills = page.locator('.pills').first();
  await expect(pills.locator('[data-model="claude"]')).toHaveText('Claude Sonnet 4');
  await expect(pills.locator('[data-model="gpt"]')).toHaveText('GPT-5 mini');
  await expect(pills.locator('[data-model="gemini"]')).toHaveText('Gemini 3 Flash');
  for (const k of ['claude', 'gpt', 'gemini']) await expect(pills.locator(`[data-model="${k}"] svg.mmark`)).toHaveCount(1);
  const more = await pills.locator('#d-more option').allTextContents();
  expect(more).toEqual(['More models', 'GPT-OSS 120B', 'DeepSeek V3', 'Mistral Large', 'Kimi K2']);
  await pills.screenshot({ path: shot('model-picker') });
  await page.screenshot({ path: shot('branch-sheet') });
  expect(errs).toEqual([]);
});
