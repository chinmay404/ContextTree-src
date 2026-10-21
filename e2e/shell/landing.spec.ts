import { test, expect } from '@playwright/test';

// Needs the app running with NEXT_PUBLIC_BOARD_V3=1 and no session.
const TITLE = 'Context Tree — give every question its own desk';

test.describe('landing', () => {
  test('headline, pain line and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Give every question its own desk.');
    await expect(page.getByText('forgotten the PDF')).toBeVisible();
    await expect(page.getByRole('link', { name: /Start a board — it's free/ })).toHaveAttribute('href', '/boards');
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/signin');
  });

  test('V3 title, description and canonical', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(TITLE);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Free in your browser with your own API keys\.$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\/[^/]+\/?$/);
  });

  test('copy: seven providers, hosted mailto, no export or Markdown', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Markdown|export/i);
    for (const n of ['Anthropic', 'OpenAI', 'Google', 'Groq', 'DeepSeek', 'Mistral', 'Moonshot']) expect(text).toContain(n);
    await expect(page.getByRole('link', { name: "Tell me when it's ready" })).toHaveAttribute('href', /^mailto:.+\?subject=Context%20Tree%20hosted$/);
    await expect(page.getByText("[Founder's name]")).toBeVisible();
  });

  test('the hero board is drawn and every section id exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-board svg[aria-label^="Map of"]')).toBeVisible();
    for (const id of ['how', 'pricing', 'founder']) await expect(page.locator(`#${id}`)).toHaveCount(1);
  });

  test('readable with JS off', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Give every question its own desk.');
    await expect(page.getByRole('link', { name: /Start a board — it's free/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Free while you bring your own keys.' })).toBeVisible();
    await ctx.close();
  });

  test('390 px: no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('reduced motion: nothing animates', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
    await ctx.close();
  });

  test('/landing has the same headline', async ({ page }) => {
    await page.goto('/landing');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Give every question its own desk.');
    await expect(page).toHaveTitle(TITLE);
  });
});
