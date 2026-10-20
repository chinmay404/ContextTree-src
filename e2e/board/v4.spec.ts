/**
 * Port of docs/design/prototype-tests/v4test.js (24 checks) against /board-dev.
 * Same viewport, order, waits and camera calls; the prototype's globals are replaced by window.__board.
 * Screenshots keep the prototype's names: test-results/board/v4-<n>-<name>.png.
 */
import { test, expect, type Page } from '@playwright/test';
import { openBoard, center, trackErrors } from './helpers';

const shot = (p: Page, name: string) => p.screenshot({ path: `test-results/board/v4-${name}.png` });
const wait = (p: Page, ms: number) => p.waitForTimeout(ms);

test.describe.serial('prototype v4test.js acceptance', () => {
  let p: Page;
  let errs: string[];
  const ok = (cond: boolean, msg: string) => expect.soft(cond, msg).toBe(true);

  test.beforeAll(async ({ browser, baseURL }) => {
    p = await browser.newPage({ baseURL, viewport: { width: 1440, height: 900 } });
    errs = trackErrors(p);
    await openBoard(p);
    await p.waitForTimeout(2500);
  });
  test.afterAll(async () => { await p.close(); });

  test('the 24 checks', async () => {
    test.setTimeout(180_000);
    await test.step('0. first look', async () => {
      await shot(p, '1-board');
      ok((await p.$('#rail')) === null, 'no rail');
      ok(!(await p.content()).includes('What if'), 'no "What if" anywhere');
    });

    await test.step('1. drag a string from the podcast knob onto the "side" chat', async () => {
      await p.evaluate(() => window.__board!.camSnap(60, 260, .62)); await wait(p, 300);
      const [x, y] = await center(p, '[data-id="podcast"] .port.out');
      const [tx, ty] = await center(p, '[data-id="side"] .ttl');
      await p.mouse.move(x, y); await p.mouse.down();
      for (let i = 1; i <= 20; i++) { await p.mouse.move(x + (tx - x) * i / 20, y + (ty - y) * i / 20); await wait(p, 16); }
      await wait(p, 150); await shot(p, '2-stringing');
      await p.mouse.up(); await wait(p, 500);
      ok(await p.evaluate(() => window.__board!.hasWire('podcast', 'side')), 'knob drag connects source to chat');
      await shot(p, '3-connected');
    });

    await test.step('2. release on empty space retracts', async () => {
      const [x, y] = await center(p, '[data-id="note"] .port.out');
      await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 60, y + 200, { steps: 8 }); await p.mouse.up(); await wait(p, 800);
      ok(await p.evaluate(() => { const b = window.__board!; return !b.live() && !b.edges().some((e) => e.kind === 'wire' && e.from === 'note'); }), 'release on empty space retracts');
    });

    await test.step('3. chat knob to empty space opens the branch sheet there', async () => {
      await p.evaluate(() => window.__board!.fit(false)); await wait(p, 300);
      const [x, y] = await center(p, '[data-id="deep"] .port.out');
      await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 120, y - 260, { steps: 12 }); await p.mouse.up(); await wait(p, 500);
      ok(await p.evaluate(() => { const d = window.__board!.dialog(); return !!d && d.mode === 'branch' && d.parentId === 'deep' && !!d.at; }), 'chat knob drag to empty space opens branch sheet');
      await shot(p, '4-branchsheet');
      await p.evaluate(() => { const b = window.__board!; b.setDialogFirst('And for agencies of 10+?'); b.confirmDialog(); }); await wait(p, 800);
      ok(await p.evaluate(() => window.__board!.chats().some((c) => c.parentId === 'deep')), 'branch created at drop spot');
      await wait(p, 3500);
      await shot(p, '5-newbranch');
    });

    await test.step('4. chat knob onto another chat = answer link', async () => {
      await p.evaluate(() => window.__board!.fit(false)); await wait(p, 400);
      const [x, y] = await center(p, '[data-id="main"] .port.out');
      const [dx, dy] = await center(p, '[data-id="deep"] .ttl');
      await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(dx, dy, { steps: 15 }); await p.mouse.up(); await wait(p, 500);
      // tightened: the prototype's `|| true` always passed; main is deep's ancestor, so the answer link must be refused
      ok(await p.evaluate(() => window.__board!.hasAnswer('main', 'deep') === false), 'main to deep blocked (ancestor rule)');
      ok(await p.evaluate(() => window.__board!.canPlug('side', 'chat', 'second')), 'side answer can be strung into second');
    });

    await test.step('4b. click a hand-made string shows Disconnect; real dblclick opens the viewer', async () => {
      await p.evaluate(() => { const b = window.__board!; b.select(null); b.fit(false); }); await wait(p, 600);
      const hb = await p.evaluate(() => window.__board!.wirePoint('s|csv|deep', .35));
      expect(hb, 'wire s|csv|deep has a point').not.toBeNull();
      await p.mouse.click(hb![0], hb![1]); await wait(p, 300);
      ok(await p.evaluate(() => { const b = window.__board!; return b.selectedWire() === 's|csv|deep' && b.wirePillOn('s|csv|deep'); }), 'clicking a string selects it and shows Disconnect');
      await shot(p, '4b-wiresel');
      const nb = await p.evaluate(() => window.__board!.sources().length);
      const [vx, vy] = await center(p, '[data-id="pdf"] .meta'); await p.mouse.dblclick(vx, vy); await wait(p, 400);
      ok(await p.evaluate((n) => { const b = window.__board!; return b.viewer()?.cardId === 'pdf' && b.sources().length === n; }, nb), 'real dblclick on card opens viewer, no stray note');
      await p.keyboard.press('Escape'); await wait(p, 250);
    });

    await test.step('5. disconnect via midpoint knob', async () => {
      const n0 = await p.evaluate(() => window.__board!.wireKeys().length);
      await p.evaluate(() => { const b = window.__board!; b.clickDisconnect(b.wireKeys()[0]); }); await wait(p, 300);
      ok(await p.evaluate((n) => window.__board!.wireKeys().length === n - 1, n0), 'midpoint knob disconnects');
    });

    await test.step('6. pile wheel cycling', async () => {
      await p.evaluate(() => { const b = window.__board!; b.select(null); b.camSnap(-500, 0, .9); }); await wait(p, 300);
      const [px, py] = await center(p, '[data-id="interviews"] .ttl');
      await p.mouse.move(px, py);
      const t0 = await p.locator('[data-id="interviews"] .ttl').innerText();
      await p.mouse.wheel(0, 30); await p.mouse.wheel(0, 40); await wait(p, 90);
      await shot(p, '6a-pileslide'); await wait(p, 300);
      const t1 = await p.locator('[data-id="interviews"] .ttl').innerText();
      ok(t0 !== t1, `wheel cycles pile (${t0} -> ${t1})`);
      await shot(p, '6-pilecycle');
    });

    await test.step('7. double-click opens viewers', async () => {
      for (const id of ['video', 'pdf', 'note', 'interviews', 'csv', 'shot', 'web', 'podcast']) {
        await p.evaluate(() => window.__board!.fit(false)); await wait(p, 250);
        const [cx, cy] = await center(p, `[data-id="${id}"] .meta`);
        await p.mouse.click(cx, cy); await p.mouse.click(cx, cy); await wait(p, 400);
        ok(await p.evaluate((i) => window.__board!.viewer()?.cardId === i, id), `double-click opens viewer: ${id}`);
        await shot(p, `7-view-${id}`);
        await p.keyboard.press('Escape'); await wait(p, 250);
      }
      // pile member
      await p.evaluate(() => window.__board!.openViewer('interviews')); await wait(p, 300);
      await p.locator('.members button').nth(1).click(); await wait(p, 300);
      await shot(p, '8-member');
      await p.keyboard.press('Escape'); await wait(p, 250);
    });

    await test.step('8. add menu, right-click menu, notes', async () => {
      await p.click('[data-pb="add"]'); await wait(p, 250);
      await shot(p, '9-addmenu');
      const notes = () => p.evaluate(() => window.__board!.sources().filter((c) => c.sourceType === 'note').length);
      const before = await notes();
      await p.click('[data-pb="menu"] [data-m="note"]'); await wait(p, 400);
      await p.keyboard.type('Ask Priya about the team plan');
      ok((await notes()) === before + 1, 'Add -> Note spawns a note');
      await p.mouse.click(700, 120, { button: 'right' }); await wait(p, 250);
      ok(await p.evaluate(() => window.__board!.menuOpen()), 'right-click opens menu');
      await shot(p, '10-ctxmenu');
      await p.keyboard.press('Escape');
      const b2 = await p.evaluate(() => window.__board!.sources().length);
      await p.mouse.dblclick(1300, 120); await wait(p, 300);
      ok(await p.evaluate((n) => window.__board!.sources().length === n + 1, b2), 'double-click empty board spawns a note');
    });

    await test.step('9. string sway: move a chat and the midpoint lags', async () => {
      const sway = await p.evaluate(async () => {
        const b = window.__board!; const y0 = b.stringMid('t|second')!.y; b.snapBy('second', 0, 200);
        await new Promise((r) => setTimeout(r, 60));
        const s = b.stringMid('t|second')!; return { lag: Math.abs(s.ty - s.y) > 5, y0, y1: s.y, t: s.ty };
      });
      ok(sway.lag, 'branch string midpoint lags behind (sway) ' + JSON.stringify(sway));
      await wait(p, 1200);
      await p.evaluate(() => { const b = window.__board!; b.select('deep'); b.fit(false); }); await wait(p, 800);
      await shot(p, '11-final');
    });

    await test.step('10. map view', async () => {
      await p.evaluate(() => { const b = window.__board!; b.select(null); b.zoomAt(720, 450, .3, false); b.fit(false); const c = b.cam(); b.camSnap(c.x, c.y, .32); }); await wait(p, 900);
      await p.evaluate(() => window.__board!.fit(false)); await p.evaluate(() => window.__board!.zoomAt(720, 450, .3, false)); await wait(p, 900);
      await shot(p, '11b-map');
      // tightened: the prototype only took the picture. At z .3 the board is in its small size and every card is size-s,
      // except the one holding focus (a note being typed in is never re-rendered, as in the prototype).
      // The brief said "12", but by this step the run has added a branch chat and two notes (15 cards on the board).
      const map = await p.evaluate(() => {
        const cards = [...document.querySelectorAll<HTMLElement>('.card')], active = document.activeElement;
        return { size: window.__board!.size(), total: cards.length, seed: cards.filter((c) => !c.dataset.id!.startsWith('c_')).length,
          notSmall: cards.filter((c) => !(active && c.contains(active)) && !c.classList.contains('size-s')).map((c) => c.dataset.id) };
      });
      expect.soft(map.size, 'map view is in the small size').toBe('S');
      expect.soft(map.seed, 'the 12 seed cards are on the board').toBe(12);
      expect.soft(map.notSmall, `map view: every card without focus is size-s (${JSON.stringify(map)})`).toEqual([]);
    });

    await test.step('11. focus view', async () => {
      await p.evaluate(() => window.__board!.fit(false)); await wait(p, 600);
      await p.evaluate(() => window.__board!.openFocus('second')); await wait(p, 1000);
      await shot(p, '12-focus');
      expect.soft(await p.evaluate(() => window.__board!.focus()), 'focus view shows "second"').toBe('second');
    });

    expect(errs).toEqual([]);
  });
});
