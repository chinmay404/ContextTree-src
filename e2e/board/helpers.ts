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

/** A close-up of one card, with room around it, centred at a readable zoom. */
export async function closeUp(page: Page, id: string, path: string): Promise<void> {
  await page.mouse.move(4, 4);
  await page.evaluate((i) => {
    const b = window.__board!; b.select(null);
    const [x0, y0, x1, y1] = b.box(i), z = 1.3;
    b.camSnap(720 - ((x0 + x1) / 2) * z, 450 - ((y0 + y1) / 2) * z, z);
  }, id);
  await page.evaluate(() => window.__board!.settle());
  await page.waitForTimeout(300);
  const box = (await page.locator(`.card[data-id="${id}"]`).boundingBox())!;
  await page.screenshot({ path, clip: { x: Math.max(0, box.x - 48), y: Math.max(0, box.y - 48), width: box.width + 96, height: box.height + 96 } });
}

const IGNORE = /Failed to load resource|next-auth|CLIENT_FETCH_ERROR|React DevTools/;

/** Collects page errors and console errors (minus known dev noise) for an `expect(errs).toEqual([])`. */
export function trackErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
  return errs;
}
