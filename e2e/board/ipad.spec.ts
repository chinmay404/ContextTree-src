import { test, expect, type CDPSession, type Page } from '@playwright/test';
import { center, openBoard, trackErrors } from './helpers';

const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
test.use({ hasTouch: true, isMobile: true, userAgent: IPAD, viewport: { width: 1180, height: 820 } });

const session = (page: Page) => page.context().newCDPSession(page);
const down = (cdp: CDPSession, x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
const up = (cdp: CDPSession) => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const moveTo = (cdp: CDPSession, x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
async function hold(page: Page, cdp: CDPSession, x: number, y: number, ms = 650) { await down(cdp, x, y); await page.waitForTimeout(ms); await up(cdp); }
async function tap(cdp: CDPSession, x: number, y: number) { await down(cdp, x, y); await up(cdp); }

async function frame(page: Page, id: string, z = .8) {
  await page.evaluate(([card, zoom]) => { const h = window.__board!, b = h.box(card as string); h.select(null); h.camSnap(590 - b[0] * (zoom as number), 300 - b[1] * (zoom as number), zoom as number); }, [id, z] as const);
  await page.evaluate(() => window.__board!.settle());
}
const EMPTY: [number, number] = [150, 620];
async function emptyBoard(page: Page) {
  await page.evaluate(() => { const h = window.__board!; h.select(null); h.camSnap(-3000, -3000, .8); });
  await page.evaluate(() => window.__board!.settle());
}

test('holding a card opens its menu', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await frame(page, 'csv');
  const c = await center(page, '[data-id="csv"] .face');
  await hold(page, await session(page), c[0], c[1]);
  await expect(page.locator('[data-pb="cardmenu"]')).toHaveAttribute('aria-hidden', 'false');
  expect(errs).toEqual([]);
});

test('holding a chat offers What it read', async ({ page }) => {
  await openBoard(page);
  await frame(page, 'main');
  const box = (await page.locator('[data-id="main"] .chd').boundingBox())!;
  await hold(page, await session(page), box.x + 60, box.y + box.height / 2);
  await expect(page.locator('[data-pb="cardmenu"] [data-m="inspect"]')).toBeVisible();
});

test('holding empty board opens the add menu', async ({ page }) => {
  await openBoard(page);
  await emptyBoard(page);
  await hold(page, await session(page), ...EMPTY);
  await expect(page.locator('[data-pb="menu"]')).toHaveAttribute('aria-hidden', 'false');
});

test('a short tap opens no menu', async ({ page }) => {
  await openBoard(page);
  await emptyBoard(page);
  await hold(page, await session(page), ...EMPTY, 120);
  await expect(page.locator('[data-pb="menu"]')).toHaveAttribute('aria-hidden', 'true');
});

test('moving a finger is a pan, not a hold', async ({ page }) => {
  await openBoard(page);
  await emptyBoard(page);
  const cdp = await session(page);
  await down(cdp, ...EMPTY);
  await moveTo(cdp, EMPTY[0] + 60, EMPTY[1]);
  await page.waitForTimeout(650);
  await up(cdp);
  await expect(page.locator('[data-pb="menu"]')).toHaveAttribute('aria-hidden', 'true');
});

test('a second finger is a pinch, not a hold', async ({ page }) => {
  await openBoard(page);
  await emptyBoard(page);
  const cdp = await session(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 500, id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 500, id: 0 }, { x: 500, y: 500, id: 1 }] });
  await page.waitForTimeout(650);
  await up(cdp);
  await expect(page.locator('[data-pb="menu"]')).toHaveAttribute('aria-hidden', 'true');
});

test('a double tap on empty board makes one note', async ({ page }) => {
  await openBoard(page);
  await emptyBoard(page);
  const before = await page.evaluate(() => window.__board!.cards().length);
  const cdp = await session(page);
  await tap(cdp, ...EMPTY);
  await tap(cdp, ...EMPTY);
  await expect.poll(() => page.evaluate(() => window.__board!.cards().length)).toBe(before + 1);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__board!.cards().length)).toBe(before + 1);
});

test('two slow taps make no note', async ({ page }) => {
  await openBoard(page);
  await emptyBoard(page);
  const before = await page.evaluate(() => window.__board!.cards().length);
  const cdp = await session(page);
  await tap(cdp, ...EMPTY);
  await page.waitForTimeout(500);
  await tap(cdp, ...EMPTY);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__board!.cards().length)).toBe(before);
});

test('with the pen on, a hold draws no menu', async ({ page }) => {
  await openBoard(page);
  await emptyBoard(page);
  await page.keyboard.press('d');
  await hold(page, await session(page), ...EMPTY);
  await expect(page.locator('[data-pb="menu"]')).toHaveAttribute('aria-hidden', 'true');
});

test('tapping a pile\'s badge flips to the next document', async ({ page }) => {
  await openBoard(page);
  await frame(page, 'interviews');
  const front = () => page.evaluate(() => window.__board!.pileFront('interviews'));
  const before = await front();
  const c = await center(page, '[data-id="interviews"] .tile .badge');
  await tap(await session(page), c[0], c[1]);
  await expect.poll(front).not.toBe(before);
});

test('a finger scrolls a long answer inside its card', async ({ page }) => {
  await openBoard(page);
  await frame(page, 'main', 1);
  const body = page.locator('[data-id="main"] .cbody');
  await body.evaluate((el) => { el.innerHTML += '<p>more text</p>'.repeat(60); });
  const box = (await body.boundingBox())!;
  const cdp = await session(page), x = box.x + box.width / 2, y = box.y + box.height - 20;
  await down(cdp, x, y);
  for (let i = 1; i <= 12; i++) { await moveTo(cdp, x, y - i * 12); await page.waitForTimeout(16); }
  await up(cdp);
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(20);
});

test('two fingers on a card\'s answer zoom the board, they do not scroll the answer', async ({ page }) => {
  await openBoard(page);
  await frame(page, 'main', 1);
  const body = page.locator('[data-id="main"] .cbody');
  await body.evaluate((el) => { el.innerHTML += '<p>more text</p>'.repeat(60); });
  const box = (await body.boundingBox())!, zoom = () => page.evaluate(() => window.__board!.cam().z);
  const before = await zoom();
  const cdp = await session(page), y = box.y + box.height / 2, mid = box.x + box.width / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: mid - 40, y, id: 0 }, { x: mid + 40, y, id: 1 }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: mid - 40 - i * 12, y, id: 0 }, { x: mid + 40 + i * 12, y, id: 1 }] });
    await page.waitForTimeout(16);
  }
  await up(cdp);
  expect(await zoom()).toBeGreaterThan(before * 1.2);
  expect(await body.evaluate((el) => el.scrollTop)).toBe(0);
});

test('the keyboard does not cover the chat bar or the focus view\'s composer', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => {
    const v = window.visualViewport!;
    Object.defineProperty(v, 'height', { value: 420, configurable: true });
    v.dispatchEvent(new Event('resize'));
  });
  const bottom = (sel: string) => page.locator(sel).evaluate((el) => el.getBoundingClientRect().bottom);
  await expect.poll(() => bottom('[data-pb="chatbar"]')).toBeLessThanOrEqual(420);
  await page.evaluate(() => window.__board!.openFocus('main'));
  await expect(page.locator('[data-pb="focus"] .fcomp textarea')).toBeVisible();
  await expect.poll(() => bottom('[data-pb="focus"] .fcomp textarea')).toBeLessThanOrEqual(420);
});

test('a tap shows no tooltip stuck on the screen', async ({ page }) => {
  await openBoard(page);
  await frame(page, 'csv');
  const c = await center(page, '[data-id="csv"] .port');
  await tap(await session(page), c[0], c[1]);
  await page.waitForTimeout(700);
  await expect(page.locator('.tip.on')).toHaveCount(0);
});

for (const [name, width, height] of [['landscape', 1180, 820], ['portrait', 820, 1180], ['small portrait', 768, 1024]] as const) {
  test.describe(name, () => {
    test.use({ viewport: { width, height } });

    test('the bars do not overlap, and the chrome is big enough for a finger', async ({ page }) => {
      await openBoard(page);
      const boxes = await page.evaluate(() => ['[data-pb="add"]', '[data-pb="draw"]', '[data-pb="draw-hide"]', '[data-pb="chatbar"]', '[data-pb="zoom"]', '[data-pb="brand"]'].map((s) => {
        const r = document.querySelector(s)!.getBoundingClientRect();
        return { s, l: r.left, r: r.right, t: r.top, b: r.bottom };
      }));
      for (const a of boxes) {
        expect(a.r, `${a.s} fits`).toBeLessThanOrEqual(width);
        for (const b of boxes) {
          if (a.s >= b.s) continue;
          expect(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t, `${a.s} clear of ${b.s}`).toBe(true);
        }
      }
      for (const sel of ['[data-pb="add"]', '[data-pb="draw"]', '[data-pb="brand"] .lg', '[data-pb="chatbar"] .cb-send', '[data-pb="zoom"] button']) {
        const b = (await page.locator(sel).first().boundingBox())!;
        expect(Math.min(b.width, b.height), sel).toBeGreaterThanOrEqual(44);
      }
    });
  });
}

test('fields are 16px, so Safari does not zoom the page when one takes focus', async ({ page }) => {
  await openBoard(page);
  const size = await page.evaluate(() => getComputedStyle(document.querySelector('[data-pb="chatbar"] textarea')!).fontSize);
  expect(parseFloat(size)).toBeGreaterThanOrEqual(16);
});
