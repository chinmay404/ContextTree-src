import { test, expect, type Page } from '@playwright/test';
import { openBoard } from './helpers';

const dots = (p: Page) => p.evaluate(() => {
  const el = document.querySelector('.pb-dots') as HTMLElement;
  const cs = getComputedStyle(el);
  return { size: parseFloat(cs.backgroundSize), pos: cs.backgroundPosition, opacity: parseFloat(cs.opacity), pe: cs.pointerEvents };
});
const snap = async (p: Page, x: number, y: number, z: number) => {
  await p.evaluate(([a, b, c]) => window.__board!.camSnap(a, b, c), [x, y, z]);
  await p.waitForTimeout(150);
};

test.describe('dotted canvas', () => {
  test('dots follow the camera and fade with zoom', async ({ browser, baseURL }) => {
    const p = await browser.newPage({ baseURL, viewport: { width: 1440, height: 900 } });
    await openBoard(p);
    await p.waitForTimeout(1500);
    await snap(p, 0, 0, 1);
    const a = await dots(p);
    expect(a.size).toBe(24); expect(a.opacity).toBe(1); expect(a.pe).toBe('none');
    await snap(p, 50, 30, 1);
    const b = await dots(p);
    expect(b.pos).not.toBe(a.pos);
    await snap(p, 50, 30, 2);
    expect((await dots(p)).size).toBe(48);
    await snap(p, 50, 30, 0.6);
    expect((await dots(p)).size).toBeCloseTo(14.4);
    await snap(p, 50, 30, 0.3);
    expect((await dots(p)).opacity).toBeLessThan(0.05);
    await snap(p, 50, 30, 1);
    expect((await dots(p)).opacity).toBe(1);
    const dir = process.env.DOT_SHOTS;
    if (dir) for (const z of [1, 0.6, 0.4]) { await snap(p, 200, 120, z); await p.screenshot({ path: `${dir}/zoom-${Math.round(z * 100)}.png` }); }
    await p.close();
  });
});
