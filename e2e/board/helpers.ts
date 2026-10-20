import type { Page } from '@playwright/test';

/** Opens the dev board (MockEngineApi seed), waits for the test hook and the 12 seed cards, then for the springs to rest. */
export async function openBoard(page: Page, query = ''): Promise<void> {
  // 'domcontentloaded': the readiness wait below is the real gate, and a slow subresource must not hold `load` for 60 s.
  await page.goto(`/board-dev${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__board && document.querySelectorAll('.card[data-id]').length >= 12);
  await page.evaluate(() => window.__board!.settle());
}

/** Screen centre of the first element matching `sel`. */
export async function center(page: Page, sel: string): Promise<[number, number]> {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Error(`No box for ${sel}`);
  return [b.x + b.width / 2, b.y + b.height / 2];
}

/** A human-ish drag: press at `from`, move in `steps` steps of `stepMs`, release at `to`. */
export async function dragPath(page: Page, from: [number, number], to: [number, number], steps = 20, stepMs = 16): Promise<void> {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    await page.waitForTimeout(stepMs);
  }
  await page.mouse.up();
}

const IGNORE = /Failed to load resource|next-auth|CLIENT_FETCH_ERROR|React DevTools/;

/** Collects page errors and console errors (minus known dev noise) for an `expect(errs).toEqual([])`. */
export function trackErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
  return errs;
}
