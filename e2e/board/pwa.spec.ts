import { test, expect, type Page } from '@playwright/test';
import { openBoard } from './helpers';

const swOn = process.env.NEXT_PUBLIC_PWA_DEV === '1';

test('the app describes itself to a signed-out browser', async ({ request }) => {
  const r = await request.get('/manifest.webmanifest', { maxRedirects: 0 });
  expect(r.status()).toBe(200);
  const m = await r.json();
  expect(m).toMatchObject({ name: 'Context Tree', start_url: '/boards', display: 'standalone' });
  for (const icon of m.icons as { src: string }[]) expect((await request.get(icon.src, { maxRedirects: 0 })).status()).toBe(200);
  expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
});

test('the service worker and offline page load without signing in', async ({ request }) => {
  for (const path of ['/sw.js', '/offline.html']) expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(200);
});

test('the page links its manifest and apple icon', async ({ page }) => {
  await page.goto('/board-dev', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /apple-touch-icon\.png/);
});

const ready = (page: Page) => page.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active));

test.describe('with the service worker on', () => {
  test.skip(!swOn, 'needs NEXT_PUBLIC_PWA_DEV=1 on the dev server');

  test('offline, a page says so instead of the browser error, and comes back', async ({ page, context }) => {
    await openBoard(page);
    expect(await ready(page)).toBe(true);
    await page.reload();
    await context.setOffline(true);
    await page.goto('/boards', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
    await context.setOffline(false);
    await page.goto('/board-dev', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-pb="board-dev"]')).toBeVisible();
  });

  test('nothing private lands in the cache', async ({ page }) => {
    await openBoard(page);
    await ready(page);
    await page.reload();
    await openBoard(page);
    const stored = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) urls.push(new URL(r.url).pathname);
      return urls;
    });
    expect(stored).toContain('/offline.html');
    expect(stored.filter((u) => u.startsWith('/api') || u.startsWith('/b/') || u === '/boards' || u === '/board-dev')).toEqual([]);
  });
});

test('the logo menu offers Install only when the browser does, and installing uses that offer', async ({ page }) => {
  await openBoard(page);
  await page.click('[data-pb="brand"] .lg');
  const menu = page.locator('[data-pb="boardmenu"]');
  await expect(menu.locator('[data-m="install"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => { (window as unknown as { __prompted?: boolean }).__prompted = true; },
    });
    window.dispatchEvent(e);
  });
  await page.click('[data-pb="brand"] .lg');
  await menu.locator('[data-m="install"]').click();
  expect(await page.evaluate(() => (window as unknown as { __prompted?: boolean }).__prompted)).toBe(true);
  await page.click('[data-pb="brand"] .lg');
  await expect(menu.locator('[data-m="install"]')).toHaveCount(0);   // a browser's offer works once
});

test.describe('on an iPad', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' });

  test('the menu explains how to install', async ({ page }) => {
    await openBoard(page);
    await page.click('[data-pb="brand"] .lg');
    await page.locator('[data-pb="boardmenu"] [data-m="install"]').click();
    await expect(page.locator('.pb-toast')).toContainText('Add to Home Screen');
  });
});
