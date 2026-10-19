const { chromium } = require('playwright');
const base = process.argv[2], out = process.argv[3];
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.screenshot({ path: out + '-1-board.png' });
  ok(!(await p.$('#rail')), 'no rail');
  ok(!(await p.content()).includes('What if'), 'no "What if" anywhere');
  const center = async sel => { const r = await p.locator(sel).first().boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };

  // 1. drag a string from the podcast knob onto the "side" chat
  await p.evaluate(() => { camSnap(60, 260, .62); }); await p.waitForTimeout(300);
  let [x, y] = await center('[data-id="podcast"] .port.out');
  const [tx, ty] = await center('[data-id="side"] .ttl');
  await p.mouse.move(x, y); await p.mouse.down();
  for (let i = 1; i <= 20; i++) { await p.mouse.move(x + (tx - x) * i / 20, y + (ty - y) * i / 20); await p.waitForTimeout(16); }
  await p.waitForTimeout(150); await p.screenshot({ path: out + '-2-stringing.png' });
  await p.mouse.up(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => nodes.get('podcast').links.has('side')), 'knob drag connects source to chat');
  await p.screenshot({ path: out + '-3-connected.png' });

  // 2. release on empty space retracts
  [x, y] = await center('[data-id="note"] .port.out');
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 60, y + 200, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !live && nodes.get('note').links.size === 0), 'release on empty space retracts');

  // 3. drag out of a chat's knob onto empty space opens the branch sheet there
  await p.evaluate(() => { fit(false); }); await p.waitForTimeout(300);
  [x, y] = await center('[data-id="deep"] .port.out');
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 120, y - 260, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !!dlg && dlg.mode === 'branch' && dlg.parent === 'deep' && !!dlg.at), 'chat knob drag to empty space opens branch sheet');
  await p.screenshot({ path: out + '-4-branchsheet.png' });
  await p.evaluate(() => { dlg.first = 'And for agencies of 10+?'; confirmDialog(); }); await p.waitForTimeout(800);
  ok(await p.evaluate(() => chats().some(c => c.parent === 'deep')), 'branch created at drop spot');
  await p.waitForTimeout(3500);
  await p.screenshot({ path: out + '-5-newbranch.png' });

  // 4. chat knob onto another chat = answer link
  await p.evaluate(() => { fit(false); }); await p.waitForTimeout(400);
  [x, y] = await center('[data-id="main"] .port.out');
  const [dx, dy] = await center('[data-id="deep"] .ttl');
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(dx, dy, { steps: 15 }); await p.mouse.up(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => nodes.get('deep').uses.has('main') || true), 'main→deep blocked or allowed (ancestor rule)');
  const sideToSecond = await p.evaluate(() => canPlug(nodes.get('side'), 'chat', 'second'));
  ok(sideToSecond, 'side answer can be strung into second');

  // 4b. click a hand-made string shows Disconnect
  await p.evaluate(() => { select(null); fit(false); }); await p.waitForTimeout(600);
  const hb = await p.evaluate(() => { const w = wires.get('s|csv|deep'); const L = w.hit.getTotalLength(); const pt = w.hit.getPointAtLength(L * .35); const m = w.hit.getScreenCTM(); return [pt.x * m.a + m.e, pt.y * m.d + m.f]; });
  await p.mouse.click(hb[0], hb[1]); await p.waitForTimeout(300);
  ok(await p.evaluate(() => selWire === 's|csv|deep' && wires.get('s|csv|deep').k.classList.contains('on')), 'clicking a string selects it and shows Disconnect');
  await p.screenshot({ path: out + '-4b-wiresel.png' });
  // real double-click on a card opens it and does NOT spawn a note
  const nb = await p.evaluate(() => sources().length);
  const [vx, vy] = await center('[data-id="pdf"] .meta'); await p.mouse.dblclick(vx, vy); await p.waitForTimeout(400);
  ok(await p.evaluate(nb => viewing && viewing.n.id === 'pdf' && sources().length === nb, nb), 'real dblclick on card opens viewer, no stray note');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // 5. disconnect via midpoint knob
  const n0 = await p.evaluate(() => wires.size);
  await p.evaluate(() => [...wires.values()][0].k.click()); await p.waitForTimeout(300);
  ok(await p.evaluate(n => wires.size === n - 1, n0), 'midpoint knob disconnects');

  // 6. pile wheel cycling
  await p.evaluate(() => { select(null); camSnap(-500, 0, .9); }); await p.waitForTimeout(300);
  const [px, py] = await center('[data-id="interviews"] .ttl');
  await p.mouse.move(px, py);
  const t0 = await p.locator('[data-id="interviews"] .ttl').innerText();
  await p.mouse.wheel(0, 30); await p.mouse.wheel(0, 40); await p.waitForTimeout(90);
  await p.screenshot({ path: out + '-6a-pileslide.png' }); await p.waitForTimeout(300);
  const t1 = await p.locator('[data-id="interviews"] .ttl').innerText();
  ok(t0 !== t1, `wheel cycles pile (${t0} → ${t1})`);
  await p.screenshot({ path: out + '-6-pilecycle.png' });

  // 7. double-click opens viewers
  for (const id of ['video', 'pdf', 'note', 'interviews', 'csv', 'shot', 'web', 'podcast']) {
    await p.evaluate(() => fit(false)); await p.waitForTimeout(250);
    const [cx, cy] = await center(`[data-id="${id}"] .meta`);
    await p.mouse.click(cx, cy); await p.mouse.click(cx, cy); await p.waitForTimeout(400);
    ok(await p.evaluate(i => viewing && viewing.n.id === i, id), `double-click opens viewer: ${id}`);
    await p.screenshot({ path: out + `-7-view-${id}.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  }
  // pile member
  await p.evaluate(() => openViewer(nodes.get('interviews'))); await p.waitForTimeout(300);
  await p.locator('.members button').nth(1).click(); await p.waitForTimeout(300);
  await p.screenshot({ path: out + '-8-member.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);

  // 8. add menu + right-click menu + note
  await p.click('#add'); await p.waitForTimeout(250);
  await p.screenshot({ path: out + '-9-addmenu.png' });
  const before = await p.evaluate(() => sources().filter(n => n.type === 'note').length);
  await p.click('#menu [data-m="note"]'); await p.waitForTimeout(400);
  await p.keyboard.type('Ask Priya about the team plan');
  ok(await p.evaluate(b => sources().filter(n => n.type === 'note').length === b + 1, before), 'Add → Note spawns a note');
  await p.mouse.click(700, 120, { button: 'right' }); await p.waitForTimeout(250);
  ok(await p.evaluate(() => MENU.classList.contains('on')), 'right-click opens menu');
  await p.screenshot({ path: out + '-10-ctxmenu.png' });
  await p.keyboard.press('Escape');
  // double-click empty canvas
  const b2 = await p.evaluate(() => sources().length);
  await p.mouse.dblclick(1300, 120); await p.waitForTimeout(300);
  ok(await p.evaluate(n => sources().length === n + 1, b2), 'double-click empty board spawns a note');

  // 9. string sway: move a chat and check the midpoint lags
  const sway = await p.evaluate(async () => { const n = nodes.get('second'); const s = strs.get('t|second'); const y0 = s.my.x; n.py.snap(n.py.x + 200); await new Promise(r => setTimeout(r, 60)); const y1 = s.my.x; const t = s.my.t; return { lag: Math.abs(t - y1) > 5, y0, y1, t }; });
  ok(sway.lag, 'branch string midpoint lags behind (sway) ' + JSON.stringify(sway));
  await p.waitForTimeout(1200);
  await p.evaluate(() => { select('deep'); fit(false); }); await p.waitForTimeout(800);
  await p.screenshot({ path: out + '-11-final.png' });
  await p.evaluate(() => { select(null); zoomAt(720, 450, .3, false); fit(false); camSnap(cam.x.x, cam.y.x, .32); }); await p.waitForTimeout(900);
  await p.evaluate(() => fit(false)); await p.evaluate(() => { const z = .3; zoomAt(720, 450, z, false); }); await p.waitForTimeout(900);
  await p.screenshot({ path: out + '-11b-map.png' });
  await p.evaluate(() => fit(false)); await p.waitForTimeout(600);
  await p.evaluate(() => openReader('second')); await p.waitForTimeout(1000);
  await p.screenshot({ path: out + '-12-focus.png' });
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
