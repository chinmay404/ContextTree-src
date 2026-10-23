import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openBoard, trackErrors } from './helpers';

const SHOTS = process.env.PW_SHOTS_DIR ?? 'test-results/board-live';
const shot = (n: string) => { mkdirSync(SHOTS, { recursive: true }); return `${SHOTS}/${n}.png`; };
const zoomTo = async (page: Page, z: number) => {
  await page.evaluate((zz) => {
    const b = window.__board!, boxes = b.cards().filter((c) => !c.pileId).map((c) => b.box(c.id));
    const x0 = Math.min(...boxes.map((x) => x[0])), x1 = Math.max(...boxes.map((x) => x[2])), y0 = Math.min(...boxes.map((x) => x[1])), y1 = Math.max(...boxes.map((x) => x[3]));
    b.select(null);
    b.camSnap(720 - ((x0 + x1) / 2) * zz, 450 - ((y0 + y1) / 2) * zz, zz);
  }, z);
  await page.waitForTimeout(400);
};
/** On-screen font size of an element in px: its CSS size times the transform that scales it. */
const screenFont = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => {
  const r = e.getBoundingClientRect(), own = e.getBoundingClientRect().width / (e as HTMLElement).offsetWidth;
  return parseFloat(getComputedStyle(e).fontSize) * (isFinite(own) && own > 0 ? own : 1) + 0 * r.width;
});

test('zoomed out, every card is a name: chats by their question, sources by their title', async ({ page }) => {
  const errs = trackErrors(page);
  await openBoard(page);
  await zoomTo(page, 0.3);
  expect(await page.evaluate(() => window.__board!.size())).toBe('S');
  const labels = await page.locator('.card.size-s .maplabel').evaluateAll((els) => els.map((e) => ({ id: (e.closest('.card') as HTMLElement).dataset.id!, text: e.textContent!.replace(/\s+/g, ' ').trim() })));
  const by = Object.fromEntries(labels.map((l) => [l.id, l.text]));
  // a source on a desk is folded into its question's label; chats, loose sources, piles and sets have their own
  const own = await page.evaluate(() => window.__board!.cards().filter((c) => !c.pileId && (c.kind === 'chat' || c.sourceType === 'pile' || !c.deskId)).map((c) => c.id).sort());
  expect(labels.map((l) => l.id).sort()).toEqual(own);
  expect(labels.length).toBeLessThan(12);
  expect(by.main).toContain('How should I price Context Tree?');
  expect(by.side).toContain('What does value-based pricing mean?');
  expect(by.second).toContain('Second opinion with real customers');
  expect(by.deep).toContain('Would a team plan change this?');
  expect(by.csv).toContain('Competitor prices');
  expect(by.interviews).toContain('Customer interviews');
  expect(by.interviews).toContain('4');                                     // a pile says how many it holds
  // the desk's sources ride on their question's label as a second line: dots and a count
  expect(by.main).toContain('3 sources');
  await expect(page.locator('[data-id="main"] .maplabel .deskline .dots i')).toHaveCount(3);
  await expect(page.locator('[data-id="pdf"] .maplabel')).toHaveCount(0);
  await expect(page.locator('.card.size-s')).toHaveCount(12);               // the class the acceptance specs lean on stays
  await expect(page.locator('.card.size-s .s.blob')).toHaveCount(0);        // no blobs any more
  await page.screenshot({ path: shot('map-of-names') });
  expect(errs).toEqual([]);
});

test('no desk frames in the map; strings still join the names', async ({ page }) => {
  await openBoard(page);
  const strings = await page.evaluate(() => document.querySelectorAll('.pb-tubes .tube, .pb-tubes .wire').length);
  expect(strings).toBeGreaterThan(0);
  await zoomTo(page, 0.3);
  for (const d of await page.locator('.desk').all()) await expect(d).toBeHidden();
  expect(await page.evaluate(() => document.querySelectorAll('.pb-tubes .tube, .pb-tubes .wire').length)).toBe(strings);
  for (const p of await page.locator('.pb-tubes .tube').all()) expect(await p.evaluate((e) => (e as SVGPathElement).getTotalLength())).toBeGreaterThan(20);
  await zoomTo(page, 0.6);                                                   // back above 50%: the desks and the cards come back
  expect(await page.evaluate(() => window.__board!.size())).toBe('M');
  await expect(page.locator('.desk[data-chat="main"]')).toBeVisible();
  await expect(page.locator('.card .maplabel')).toHaveCount(0);
});

test('the labels stay readable at any zoom: 11 to 16 px on screen at 20% and at 40%', async ({ page }) => {
  await openBoard(page);
  for (const z of [0.2, 0.4]) {
    await zoomTo(page, z);
    const chat = await screenFont(page, '[data-id="main"] .maplabel .nm');
    const src = await screenFont(page, '[data-id="csv"] .maplabel .nm');
    for (const px of [chat, src]) { expect(px, `z ${z}`).toBeGreaterThanOrEqual(11); expect(px, `z ${z}`).toBeLessThanOrEqual(16); }
    expect(chat).toBeGreaterThan(src);                                       // a question outranks a source
  }
});

test('a chat label carries its model mark in its colour; a source label its type icon; a long name stops at two lines', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__mock!.updateCard('b_seed', 'main', { data: { name: 'A very long question that goes on and on about pricing, packaging, tiers, seats, annual discounts and what founders in the first year should charge for it' } }));
  await page.evaluate(() => window.__board!.refresh());
  await zoomTo(page, 0.3);
  await expect(page.locator('[data-id="main"] .maplabel svg.mmark')).toHaveCount(1);
  expect(await page.locator('[data-id="main"] .maplabel').evaluate((e) => getComputedStyle(e).getPropertyValue('--c').trim())).toBe('#E0673A');   // Claude's colour
  await expect(page.locator('[data-id="csv"] .maplabel .i')).toHaveCount(1);
  const lines = await page.locator('[data-id="main"] .maplabel .nm').evaluate((e) => { const s = getComputedStyle(e); return Math.round(e.getBoundingClientRect().height / (parseFloat(s.lineHeight) * (e.getBoundingClientRect().width / (e as HTMLElement).offsetWidth))); });
  expect(lines).toBeLessThanOrEqual(2);
});

test('labels can still be selected, opened and dragged', async ({ page }) => {
  await openBoard(page);
  await zoomTo(page, 0.3);
  await page.locator('[data-id="second"] .maplabel').click();
  expect(await page.evaluate(() => window.__board!.selected())).toBe('second');
  await page.locator('[data-id="second"] .maplabel').dblclick();
  await expect.poll(() => page.evaluate(() => window.__board!.focus())).toBe('second');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
});

test('a chat that is answering shows a dot on its label', async ({ page }) => {
  await openBoard(page, '?firstTokenMs=1500&wordMs=120');
  await page.evaluate(() => window.__board!.select('side'));
  await page.locator('[data-id="side"] .compose textarea').fill('And annual plans?');
  await page.keyboard.press('Enter');
  await expect(page.locator('.desk[data-chat="side"]')).toHaveClass(/running/);
  await zoomTo(page, 0.3);
  await expect(page.locator('[data-id="side"] .maplabel .rundot')).toHaveCount(1);
  await expect(page.locator('[data-id="main"] .maplabel .rundot')).toHaveCount(0);
});

test('a coloured card keeps its colour in the map', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__mock!.updateCard('b_seed', 'csv', { data: { color: 'blue' } }));
  await page.evaluate(() => window.__board!.refresh());
  await zoomTo(page, 0.3);
  expect(await page.locator('[data-id="csv"] .maplabel').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(220, 233, 247)');
});

test('a note on a desk is folded in; a loose note, and a set, keep their own labels', async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => window.__board!.refresh());
  await zoomTo(page, 0.3);
  await expect(page.locator('[data-id="note"] .maplabel')).toHaveCount(0);        // on a desk: part of its question's label
  await page.evaluate(() => window.__mock!.updateCard('b_seed', 'note', { deskId: null }));
  await page.evaluate(() => window.__board!.refresh());
  await page.waitForTimeout(300);
  await expect(page.locator('[data-id="note"] .maplabel')).toContainText('Costs');
  await page.click('[data-pb="add"]'); await page.click('[data-pb="menu"] [data-m="set"]');
  await expect(page.locator('.card.set .maplabel')).toContainText('New set (0)');
});

for (const z of [0.2, 0.3, 0.4]) {
  test(`at ${z * 100}% no two labels overlap and every question can be read`, async ({ page }) => {
    await openBoard(page);
    await zoomTo(page, z);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const labels = [...document.querySelectorAll<HTMLElement>('.card.size-s .maplabel')];
      const rects = labels.map((l) => { const b = l.getBoundingClientRect(); return { id: (l.closest('.card') as HTMLElement).dataset.id!, l: b.left, t: b.top, r: b.right, b: b.bottom }; });
      const overlaps: string[] = [];
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], c = rects[j];
        if (a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b) overlaps.push(`${a.id}/${c.id}`);
      }
      // the question of every chat: what is under the label's centre is that label
      const covered = labels.filter((l) => (l.closest('.card') as HTMLElement).classList.contains('chat')).filter((l) => {
        const b = l.getBoundingClientRect(), hit = document.elementFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2);
        return hit?.closest('.maplabel') !== l;
      }).map((l) => (l.closest('.card') as HTMLElement).dataset.id);
      const visible = labels.filter((l) => (l.closest('.card') as HTMLElement).classList.contains('chat')).every((l) => { const b = l.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight; });
      return { n: labels.length, overlaps, covered, visible };
    });
    expect(r.n).toBeGreaterThan(5);
    expect(r.overlaps, 'overlapping label pairs').toEqual([]);
    expect(r.covered, 'chat labels with something on top').toEqual([]);
    expect(r.visible).toBe(true);
    await page.screenshot({ path: shot(`map-of-names-${Math.round(z * 100)}`) });
  });
}

test('the strings still reach the labels after they are nudged apart', async ({ page }) => {
  await openBoard(page);
  await zoomTo(page, 0.3);
  await page.waitForTimeout(300);
  const far = await page.evaluate(() => {
    const out: string[] = [];
    for (const c of window.__board!.chats()) {
      if (!c.parentId) continue;
      const lab = document.querySelector<HTMLElement>(`[data-id="${c.id}"] .maplabel`)!.getBoundingClientRect(), card = document.querySelector<HTMLElement>(`[data-id="${c.id}"]`)!.getBoundingClientRect();
      const cx = (lab.left + lab.right) / 2, cy = (lab.top + lab.bottom) / 2, nx = (card.left + card.right) / 2, ny = (card.top + card.bottom) / 2;
      if (Math.hypot(cx - nx, cy - ny) > 140) out.push(c.id);               // a label stays close to the card it names
    }
    return out;
  });
  expect(far).toEqual([]);
});

test('the map in dark: same labels, same layout', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ct-theme', 'dark'));
  await openBoard(page);
  await zoomTo(page, 0.3);
  await page.waitForTimeout(400);
  expect(await page.locator('.card.chat .maplabel').first().evaluate((e) => getComputedStyle(e).color)).toBe('rgb(245, 245, 247)');
  await page.screenshot({ path: shot('map-of-names-30-dark') });
});

for (const z of [0.2, 0.3, 0.4]) {
  test(`at ${z * 100}% every string ends on the edge of the label it belongs to`, async ({ page }) => {
    await openBoard(page);
    await zoomTo(page, z);
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const c = window.__board!.cam(), out: { key: string; end: string; id: string; dist: number }[] = [];
      const rect = (id: string) => document.querySelector<HTMLElement>(`[data-id="${id}"] .maplabel`)?.getBoundingClientRect();
      for (const p of document.querySelectorAll<SVGPathElement>('.pb-tubes path.hit[data-key]')) {
        const key = p.dataset.key!, len = p.getTotalLength();
        const ends: [string, string, DOMPoint][] = [['start', '', p.getPointAtLength(0)], ['end', '', p.getPointAtLength(len)]];
        const parts = key.split('|');   // t|child, s|source|chat, a|chat|chat
        const from = parts[0] === 't' ? window.__board!.card(parts[1])!.parentId! : parts[1], to = parts[0] === 't' ? parts[1] : parts[2];
        ends[0][1] = from; ends[1][1] = to;
        for (const [end, id, pt] of ends) {
          const b = rect(id);
          if (!b) { out.push({ key, end, id, dist: -1 }); continue; }
          const x = pt.x * c.z + c.x, y = pt.y * c.z + c.y;
          const dx = Math.max(b.left - x, 0, x - b.right), dy = Math.max(b.top - y, 0, y - b.bottom);
          out.push({ key, end, id, dist: Math.hypot(dx, dy) });
        }
      }
      return out;
    });
    expect(r.length).toBeGreaterThan(8);
    expect(r.filter((e) => e.dist < 0), 'ends whose card has no label').toEqual([]);
    expect(r.filter((e) => e.dist > 4), 'ends more than 4 px from their label').toEqual([]);
    await page.screenshot({ path: shot(`map-strings-${Math.round(z * 100)}`) });
  });
}

test('string ends meet the label edges: light and dark at 30%', async ({ browser }) => {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [{ origin: new URL(process.env.PW_BASE_URL ?? 'http://localhost:3100').origin, localStorage: [{ name: 'ct-tour', value: JSON.stringify({ version: 1e6, at: 0, finished: true }) }, ...(theme === 'dark' ? [{ name: 'ct-theme', value: 'dark' }] : [])] }] }, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await openBoard(page);
    await zoomTo(page, 0.3);
    await page.waitForTimeout(500);
    await page.screenshot({ path: shot(`map-strings-30-${theme}`) });
    await ctx.close();
  }
});
