import { test, expect } from '@playwright/test';
import { openBoard, trackErrors } from './helpers';

const SHOTS = 'C:/Users/chinm/AppData/Local/Temp/claude/d--code-context-tree/872c9933-ef5b-407f-9dff-df9adb23f0fc/scratchpad/t1';
const bf = (page: import('@playwright/test').Page, sel: string) =>
  page.evaluate((s) => { const e = document.querySelector(s)!; const c = getComputedStyle(e); return { f: c.backdropFilter || (c as unknown as Record<string, string>).webkitBackdropFilter, bg: c.backgroundColor }; }, sel);

test('floating controls are frosted glass; reduced transparency makes them solid white', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  const sels = ['[data-pb="brand"]', '[data-pb="add"]', '[data-pb="zoom"]', '[data-pb="chatbar"]'];
  for (const s of sels) { const r = await bf(page, s); expect(r.f, s).toContain('blur(30px)'); expect(r.bg, s).toBe('rgba(255, 255, 255, 0.62)'); }
  await page.click('[data-pb="add"]'); await page.waitForTimeout(300);
  expect((await bf(page, '.menu.on')).f).toContain('blur(30px)');
  await page.screenshot({ path: `${SHOTS}/board-menu-open.png` });
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: null, ...( { reducedTransparency: 'reduce' } as object ) } as never).catch(() => {});
  const m = await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches);
  if (m) for (const s of sels) { const r = await bf(page, s); expect(r.f, s).toBe('none'); expect(r.bg, s).toBe('rgb(255, 255, 255)'); }
  expect(errs).toEqual([]);
});

test('screenshots: focus view, branch sheet, viewer, toast', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.openFocus('deep')); await page.waitForTimeout(700);
  expect((await bf(page, '[data-pb="focus"] .backp')).f).toContain('blur(30px)');
  expect((await bf(page, '[data-pb="focus"] .fcomp .box')).f).toContain('blur(30px)');
  await page.screenshot({ path: `${SHOTS}/focus-view.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.click('[data-id="main"] .apill[data-act="branch"]'); await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/branch-sheet.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.evaluate(() => window.__board!.fit(false)); await page.waitForTimeout(250);
  await page.locator('[data-id="pdf"] .meta').dblclick(); await page.waitForTimeout(500);
  expect((await bf(page, '.wrap[data-pb="viewer"] .vclose')).f).toContain('blur(30px)');
  await page.screenshot({ path: `${SHOTS}/viewer.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.locator('[data-id="web"]').click(); await page.keyboard.press('Delete'); await page.waitForTimeout(300);
  await page.click('.pb-confirm [data-act="ok"], .pb-confirm button.primary', { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/toast.png` });
});
