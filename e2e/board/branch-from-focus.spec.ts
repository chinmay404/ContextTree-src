import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const F = '[data-pb="focus"]';
const IN = `${F} .in:not(.fx-out)`;   // the chat on screen, not the copy that is sliding away
const openFocus = async (page: Page, id: string) => { await page.evaluate((i) => window.__board!.openFocus(i), id); await page.waitForTimeout(700); };
const chatIds = (page: Page) => page.evaluate(() => window.__board!.chats().map((c) => c.id));
const branchFrom = async (page: Page, name: string, first = '') => {
  await page.locator(`${F} [data-b]`).first().click();
  await page.fill('#d-name', name);
  if (first) await page.fill('#d-first', first);
  await page.click('#d-ok');
};

test('Branch from here in the focus view lands on the new branch', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page, '?firstTokenMs=300&wordMs=40');
  await openFocus(page, 'main');
  const before = await chatIds(page);
  await branchFrom(page, 'Annual or monthly?', 'Should I sell it yearly?');
  await expect.poll(async () => (await chatIds(page)).length).toBe(before.length + 1);
  const id = (await chatIds(page)).find((c) => !before.includes(c))!;
  await expect.poll(() => page.evaluate(() => window.__board!.focus())).toBe(id);                 // the view moved to the new chat
  await expect(page.locator(`${IN} .ftitle`)).toHaveText('Annual or monthly?');
  await expect(page.locator(`${IN} .tl .cur`)).toContainText('Annual or monthly?');                // the timeline's current step is the branch
  await expect(page.locator(`${IN} .tl .cur`)).toContainText('Q1.3');
  await expect(page.locator(`${IN} .ub`)).toHaveText('Should I sell it yearly?');                   // its first question is shown, streaming
  await expect(page.locator(`${IN} .art`)).toHaveCount(1, { timeout: 8000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('branch-from-focus-landed') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__board!.focus())).toBeNull();
  expect(await page.evaluate(() => window.__board!.selected())).toBe(id);                         // Esc lands on the new card
  expect(errs).toEqual([]);
});

test('the parent slides out to the left and the branch comes in from the right', async ({ page }) => {
  await openBoard(page);
  await openFocus(page, 'main');
  await page.evaluate(() => {
    (window as unknown as { __fx: string[] }).__fx = [];
    new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach((n) => { if (n instanceof HTMLElement && n.classList.contains('fx-out')) (window as unknown as { __fx: string[] }).__fx.push('out'); }); })
      .observe(document.querySelector('[data-pb="focus"]')!, { childList: true });
  });
  await branchFrom(page, 'Annual or monthly?');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __fx: string[] }).__fx.length)).toBe(1);
  const frames = await page.evaluate(() => {
    const out = document.querySelector('.fx-out'), inn = document.querySelector('[data-pb="focus"] .in');
    const k = (e: Element | null) => (e?.getAnimations()[0]?.effect as KeyframeEffect | undefined)?.getKeyframes().map((f) => [f.transform, f.opacity]);
    const t = (e: Element | null) => e?.getAnimations()[0]?.effect?.getTiming();
    return { out: k(out), outT: t(out), inn: k(inn), innT: t(inn) };
  });
  expect(frames.out).toEqual([['translateX(0px)', '1'], ['translateX(-16px)', '0']]);
  expect(frames.outT).toMatchObject({ duration: 160, easing: 'ease-out' });
  expect(frames.inn).toEqual([['translateX(16px)', '0'], ['translateX(0px)', '1']]);
  expect(frames.innT).toMatchObject({ duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  await page.waitForTimeout(60);
  await page.screenshot({ path: shot('branch-slide-mid') });                                       // old chat leaving, new one arriving
  await expect(page.locator('.fx-out')).toHaveCount(0, { timeout: 2000 });                          // the outgoing copy is gone afterwards
});

test('it can be interrupted: switching again at once leaves nothing behind', async ({ page }) => {
  await openBoard(page);
  await openFocus(page, 'main');
  await branchFrom(page, 'One');
  await page.evaluate(() => window.__board!.openFocus('side'));        // before the slide has finished
  await page.waitForTimeout(100);
  await page.evaluate(() => window.__board!.openFocus('main'));
  await page.waitForTimeout(700);
  await expect(page.locator('.fx-out')).toHaveCount(0);
  expect(await page.evaluate(() => window.__board!.focus())).toBe('main');
  await expect(page.locator(`${IN} .ftitle`)).toHaveText('How should I price Context Tree?');
  expect(await page.locator(`${F} .in`).evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
});

test('reduced motion: a plain cross-fade, no slide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBoard(page);
  await openFocus(page, 'main');
  await branchFrom(page, 'Annual or monthly?');
  await expect.poll(() => page.evaluate(() => window.__board!.focus())).not.toBe('main');
  const k = await page.evaluate(() => {
    const out = document.querySelector('.fx-out');
    return (out?.getAnimations()[0]?.effect as KeyframeEffect | undefined)?.getKeyframes().map((f) => [f.transform ?? null, f.opacity]) ?? null;
  });
  if (k) expect(k.every(([t]) => t === null || t === 'none')).toBe(true);
  await expect(page.locator('.fx-out')).toHaveCount(0, { timeout: 2000 });
});

test('other ways of opening a chat in the focus view (timeline, answer rows) still switch without breaking', async ({ page }) => {
  await openBoard(page);
  await openFocus(page, 'deep');
  await page.locator(`${F} .tl button.st`).first().click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__board!.focus())).not.toBe('deep');
  await expect(page.locator('.fx-out')).toHaveCount(0);
});
