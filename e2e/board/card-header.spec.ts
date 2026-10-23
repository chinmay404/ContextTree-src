import { expect, test } from '@playwright/test';
import { openBoard } from './helpers';

// A long "Q1.2.1 · Model name" label used to push Open / Branch past the card's right edge, onto the out-port.
test('Open and Branch stay inside every chat card, clear of the out-port', async ({ page }) => {
  await openBoard(page);
  // The deepest question on a live-listed model with a long name — the case that overflowed in production.
  await page.evaluate(async () => {
    await window.__mock!.updateCard('b_seed', 'deep', { data: { model: 'groq:qwen/qwen3.8-27b-instruct-preview-long-context' } });
    await window.__board!.refresh();
    window.__board!.rerender();
    window.__board!.fit(false);
  });
  await page.waitForTimeout(500);
  await expect(page.locator('.card.chat[data-id="deep"] .mtag')).toContainText('qwen');
  const rows = await page.$$eval('.card.chat', (cards) => cards.flatMap((card) => {
    const face = card.querySelector('.face'), port = card.querySelector('.port.out'), last = card.querySelector('.chd > .apill:last-of-type');
    if (!face || !port || !last) return [];
    const f = face.getBoundingClientRect(), p = port.getBoundingClientRect(), b = last.getBoundingClientRect();
    return [{ id: (card as HTMLElement).dataset.id, pillRight: b.right, faceRight: f.right, portLeft: p.left }];
  }));
  expect(rows.length).toBeGreaterThan(2);
  for (const r of rows) {
    expect(r.pillRight, `${r.id}: Branch ends inside the card`).toBeLessThanOrEqual(r.faceRight);
    expect(r.pillRight, `${r.id}: Branch clears the out-port`).toBeLessThan(r.portLeft);
  }
});

test('the model label shortens with an ellipsis and keeps the full text as a tooltip', async ({ page }) => {
  await openBoard(page);
  const tag = page.locator('.card.chat .mtag').first();
  await expect(tag).toHaveAttribute('title', /·/);
  expect(await tag.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
});
