import { chromium, type FullConfig } from '@playwright/test';

/**
 * Warm-up: open /board-dev once before the suite so the dev server has compiled the route and its chunks
 * (a first navigation after an edit recompiles; the ~60 s page-load stalls seen mid-suite came from tests
 * hitting the server while it was busy). Retries once, then lets the suite run and report on its own.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0].use.baseURL!;
  const browser = await chromium.launch();
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const page = await browser.newPage();
      try {
        await page.goto(`${baseURL}/board-dev`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await page.waitForFunction(() => !!window.__board && document.querySelectorAll('.card[data-id]').length >= 12, undefined, { timeout: 120_000 });
        return;
      } catch (e) {
        if (attempt === 1) console.warn('[global-setup] warm-up of /board-dev did not finish:', (e as Error).message);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
}
