const { chromium } = require('playwright');
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => { const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.argv[2]); await p.waitForTimeout(2200);
  await p.evaluate(() => { fit(false); }); await p.waitForTimeout(300);
  const box = async s => { const r = await p.locator(s).first().boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
  const [sx, sy] = await box('[data-id="podcast"] .ttl'), [tx, ty] = await box('[data-id="second"] .cbody');
  await p.mouse.move(sx, sy); await p.mouse.down();
  for (let i = 1; i <= 25; i++) { await p.mouse.move(sx + (tx - sx) * i / 25, sy + (ty - sy) * i / 25); await p.waitForTimeout(16); }
  await p.waitForTimeout(200); await p.mouse.up(); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const n = nodes.get('podcast'), c = nodes.get('second'); const bx = m => [m.px.x, m.py.x, m.px.x + m.w, m.py.x + m.h];
    const A = bx(n); const overl = [...nodes.values()].filter(m => m !== n).filter(m => { const B = bx(m); return A[0] < B[2] && A[2] > B[0] && A[1] < B[3] && A[3] > B[1]; }).map(m => m.id);
    return { desk: n.desk, leftOfChat: A[2] <= c.px.x, overl }; });
  ok(r.desk === 'second', 'dropped on chat joins its desk'); ok(r.leftOfChat, 'slides to the chat\'s left'); ok(!r.overl.length, 'overlaps nothing ' + JSON.stringify(r.overl));
  await p.screenshot({ path: process.argv[3] + '-room.png' });
  // drop the pdf onto the video (pile) is different; drop the note onto the pdf's spot without piling: drop note over main chat
  const [nx, ny] = await box('[data-id="note"] .meta'), [mx, my] = await box('[data-id="main"] .ttl');
  await p.mouse.move(nx, ny); await p.mouse.down(); await p.mouse.move(mx, my, { steps: 20 }); await p.mouse.up(); await p.waitForTimeout(1500);
  const r2 = await p.evaluate(() => { const bx = m => [m.px.x, m.py.x, m.px.x + m.w, m.py.x + m.h]; const all = [...nodes.values()]; const bad = []; all.forEach((a, i) => all.slice(i + 1).forEach(b2 => { const A = bx(a), B = bx(b2); if (A[0] < B[2] && A[2] > B[0] && A[1] < B[3] && A[3] > B[1]) bad.push(a.id + '/' + b2.id); })); return bad; });
  ok(!r2.length, 'no overlapping cards after second drop ' + JSON.stringify(r2));
  const dov = await p.evaluate(() => { const bad = []; desks.forEach((a, i) => desks.slice(i + 1).forEach(b2 => { const A = deskBounds(a), B = deskBounds(b2); if (A && B && A[0] < B[2] && A[2] > B[0] && A[1] < B[3] && A[3] > B[1]) bad.push(a.chat + '/' + b2.chat); })); return bad; });
  ok(!dov.length, 'no desks overlap ' + JSON.stringify(dov));
  // drag the Q1.2 chat right on top of Q1's desk: desks must separate
  await p.evaluate(() => fit(false)); await p.waitForTimeout(400);
  const [cx, cy] = await box('[data-id="second"] .mtag'), [qx, qy] = await box('[data-id="main"] .mtag');
  await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(qx + 40, qy + 60, { steps: 25 }); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(1800);
  const dov2 = await p.evaluate(() => { const bad = []; desks.forEach((a, i) => desks.slice(i + 1).forEach(b2 => { const A = deskBounds(a), B = deskBounds(b2); if (A && B && A[0] < B[2] && A[2] > B[0] && A[1] < B[3] && A[3] > B[1]) bad.push(a.chat + '/' + b2.chat); })); return bad; });
  ok(!dov2.length, 'dropping a chat onto another desk pushes it away ' + JSON.stringify(dov2));
  await p.evaluate(() => fit(false)); await p.waitForTimeout(900);
  await p.screenshot({ path: process.argv[3] + '-room3.png' });
  await p.screenshot({ path: process.argv[3] + '-room2.png' });
  await p.evaluate(() => { zoomAt(innerWidth / 2, innerHeight / 2, .32, false); }); await p.waitForTimeout(800);
  await p.screenshot({ path: process.argv[3] + '-map.png' });
  console.log('errors', JSON.stringify(errs)); await b.close(); })();
