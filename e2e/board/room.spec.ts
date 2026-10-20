/**
 * Port of docs/design/prototype-tests/room.js (6 checks incl. 3 on the first drop) against /board-dev.
 * Screenshots: test-results/board/room-{room,room2,room3,map}.png.
 */
import { test, expect, type Page } from '@playwright/test';
import { openBoard, center, trackErrors } from './helpers';

const shot = (p: Page, name: string) => p.screenshot({ path: `test-results/board/room-${name}.png` });
const wait = (p: Page, ms: number) => p.waitForTimeout(ms);

/** Pairs of desks (by chat id) whose boxes overlap. */
const deskOverlaps = (p: Page) => p.evaluate(() => {
  const b = window.__board!, ids = b.deskChats(), bad: string[] = [];
  ids.forEach((a, i) => ids.slice(i + 1).forEach((c) => {
    const A = b.deskBox(a), B = b.deskBox(c);
    if (A && B && A[0] < B[2] && A[2] > B[0] && A[1] < B[3] && A[3] > B[1]) bad.push(a + '/' + c);
  }));
  return bad;
});

test.describe.serial('prototype room.js acceptance', () => {
  let p: Page;
  let errs: string[];
  const ok = (cond: boolean, msg: string) => expect.soft(cond, msg).toBe(true);

  test.beforeAll(async ({ browser, baseURL }) => {
    p = await browser.newPage({ baseURL, viewport: { width: 1440, height: 900 } });
    errs = trackErrors(p);
    await openBoard(p);
    await p.waitForTimeout(2200);
  });
  test.afterAll(async () => { await p.close(); });

  test('the 6 checks', async () => {
    test.setTimeout(120_000);
    await p.evaluate(() => window.__board!.fit(false)); await wait(p, 300);

    await test.step('a source dropped on a chat joins its desk, left of the chat, overlapping nothing', async () => {
      const [sx, sy] = await center(p, '[data-id="podcast"] .ttl'), [tx, ty] = await center(p, '[data-id="second"] .cbody');
      await p.mouse.move(sx, sy); await p.mouse.down();
      for (let i = 1; i <= 25; i++) { await p.mouse.move(sx + (tx - sx) * i / 25, sy + (ty - sy) * i / 25); await wait(p, 16); }
      await wait(p, 200); await p.mouse.up(); await wait(p, 1500);
      const r = await p.evaluate(() => {
        const b = window.__board!, A = b.box('podcast'), c = b.box('second');
        const overl = b.cards().filter((m) => m.id !== 'podcast').filter((m) => {
          let B: [number, number, number, number];
          try { B = b.box(m.id); } catch { return false; }   // pile members have no node of their own
          return A[0] < B[2] && A[2] > B[0] && A[1] < B[3] && A[3] > B[1];
        }).map((m) => m.id);
        return { desk: b.card('podcast')!.deskId, leftOfChat: A[2] <= c[0], overl };
      });
      ok(r.desk === 'second', 'dropped on chat joins its desk');
      ok(r.leftOfChat, 'slides to the chat\'s left');
      ok(!r.overl.length, 'overlaps nothing ' + JSON.stringify(r.overl));
      await shot(p, 'room');
    });

    await test.step('a second drop leaves no overlapping cards and no overlapping desks', async () => {
      const [nx, ny] = await center(p, '[data-id="note"] .meta'), [mx, my] = await center(p, '[data-id="main"] .ttl');
      await p.mouse.move(nx, ny); await p.mouse.down(); await p.mouse.move(mx, my, { steps: 20 }); await p.mouse.up(); await wait(p, 1500);
      const bad = await p.evaluate(() => {
        const b = window.__board!, ids = b.cards().map((c) => c.id).filter((id) => { try { b.box(id); return true; } catch { return false; } });
        const out: string[] = [];
        ids.forEach((a, i) => ids.slice(i + 1).forEach((c) => {
          const A = b.box(a), B = b.box(c);
          if (A[0] < B[2] && A[2] > B[0] && A[1] < B[3] && A[3] > B[1]) out.push(a + '/' + c);
        }));
        return out;
      });
      ok(!bad.length, 'no overlapping cards after second drop ' + JSON.stringify(bad));
      const dov = await deskOverlaps(p);
      ok(!dov.length, 'no desks overlap ' + JSON.stringify(dov));
    });

    await test.step('dropping a chat onto another desk pushes it away', async () => {
      await p.evaluate(() => window.__board!.fit(false)); await wait(p, 400);
      const [cx, cy] = await center(p, '[data-id="second"] .mtag'), [qx, qy] = await center(p, '[data-id="main"] .mtag');
      await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(qx + 40, qy + 60, { steps: 25 }); await wait(p, 150); await p.mouse.up(); await wait(p, 1800);
      const dov2 = await deskOverlaps(p);
      ok(!dov2.length, 'dropping a chat onto another desk pushes it away ' + JSON.stringify(dov2));
      await p.evaluate(() => window.__board!.fit(false)); await wait(p, 900);
      await shot(p, 'room3');
      await shot(p, 'room2');
      await p.evaluate(() => window.__board!.zoomAt(innerWidth / 2, innerHeight / 2, .32, false)); await wait(p, 800);
      await shot(p, 'map');
    });

    expect(errs).toEqual([]);
  });
});
