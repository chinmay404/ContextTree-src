/**
 * Pointer routing, card drag, board pan and wheel, ported from the prototype (lines 772-851).
 * Ports go to strings; piles and desks answer hover and drop questions.
 */
import type { Id } from '../api/types';
import { clamp, project, velocity } from './spring';
import type { EngineContext, ViewNode } from './types';

export interface PointerRouting { downOnCard(): boolean; dispose(): void }

const PASS = '.cbody, .compose, .note-in .n, .exl, .lfoot, .desc';

export function attachPointer(ctx: EngineContext): PointerRouting {
  const { viewport: vp, store, camera: cam } = ctx;
  let downOnCard = false;
  let lastClick: { id: Id | null; t: number } = { id: null, t: 0 };
  const selectedId = () => store.getSnapshot().ui.selected;

  function drag(n: ViewNode, e: PointerEvent): void {
    getSelection()?.removeAllRanges();
    const [wx, wy] = ctx.s2w(e.clientX, e.clientY), off = [wx - n.px.x, wy - n.py.x], sx = e.clientX, sy = e.clientY;
    const hist: { x: number; y: number; t: number }[] = [];
    let moved = false, deskT: Id | null = null, pileT: ViewNode | null = null, vxs = 0, lastX = n.px.x, lastT = performance.now();
    const group = n.isChat
      ? [...ctx.nodes.values()].filter((m) => !m.isChat && m.deskId === n.id).map((m) => ({ m, dx: m.px.x - n.px.x, dy: m.py.x - n.py.x }))
      : [];
    const { desks, piles } = ctx.modules;
    ctx.track(e, (ev) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 4) {
        moved = true; n.dragging = true; n.el.classList.add('lift'); n.el.style.zIndex = String(ctx.nextZ());
        n.s.cfg(.25, .7).to(1.04); n.rot.cfg(.2, .7);
        group.forEach((g) => { g.m.el.style.zIndex = String(ctx.nextZ()); });
      }
      if (!moved) return;
      const [x, y] = ctx.s2w(ev.clientX, ev.clientY);
      n.px.snap(x - off[0]); n.py.snap(y - off[1]);
      const now = performance.now(), dt = Math.max(8, now - lastT);
      vxs = vxs * .6 + ((n.px.x - lastX) / dt * 1000) * .4; lastX = n.px.x; lastT = now;
      n.rot.to(clamp(vxs * .008, -9, 9));
      group.forEach((g) => { g.m.px.snap(n.px.x + g.dx); g.m.py.snap(n.py.x + g.dy); g.m.rot.to(clamp(vxs * .005, -6, 6)); });
      hist.push({ x: n.px.x, y: n.py.x, t: now }); if (hist.length > 12) hist.shift();
      if (!n.isChat) {
        const pt = piles.hoverTarget(n, ev);
        if (pt !== pileT) { pileT?.el.classList.remove('drop'); pileT = pt; pileT?.el.classList.add('drop'); }
        const d = pt ? null : desks.deskAt(x, y, n);
        if (d !== deskT) { deskT = d; desks.setHot(d); }
      }
    }, () => {
      n.dragging = false;
      if (!moved) {
        const now = performance.now();
        if (lastClick.id === n.id && now - lastClick.t < 360) {
          lastClick = { id: null, t: 0 };
          const c = store.graph().cards.get(n.id);
          if (n.isChat) store.openFocus(n.id);
          else if (c && (c.status === 'ready' || c.status === 'soon')) store.openViewer(n.id, null, n.el.getBoundingClientRect());
        } else {
          store.select(n.id); lastClick = { id: n.id, t: now };
        }
        return;
      }
      n.el.classList.remove('lift'); desks.setHot(null); pileT?.el.classList.remove('drop');
      n.s.cfg(.45, .4).to(1); n.rot.cfg(.55, .28).to(0); group.forEach((g) => g.m.rot.cfg(.55, .3).to(0));
      if (pileT) { piles.drop(n, pileT); return; }
      const [vx, vy] = velocity(hist, performance.now()), damp = Math.hypot(vx, vy) > 350 ? .75 : 1;
      if (!n.isChat) {
        const before = store.graph().cards.get(n.id)?.deskId ?? null, after = deskT;
        if (before !== after) { n.deskId = after; store.setDesk(n.id, after); if (after) ctx.jiggle(n.id, .5); }
        if (after) { n.px.cfg(.42, 1).to(n.px.x, 0); n.py.cfg(.42, 1).to(n.py.x, 0); desks.onCardDropped(n); return; }
      }
      n.px.cfg(.42, damp).to(n.px.x + project(vx), vx); n.py.cfg(.42, damp).to(n.py.x + project(vy), vy);
      if (!n.isChat) desks.onCardDropped(n);
      group.forEach((g) => { g.m.px.cfg(.42, damp).to(n.px.t + g.dx, vx); g.m.py.cfg(.42, damp).to(n.py.t + g.dy, vy); });
      if (n.isChat) desks.onChatDropped(n);
    });
  }

  function pan(e: PointerEvent): void {
    const sx = e.clientX, sy = e.clientY, ox = cam.x.x, oy = cam.y.x, hist: { x: number; y: number; t: number }[] = [];
    let moved = false;
    ctx.track(e, (ev) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 3) { moved = true; vp.classList.add('panning'); }
      if (!moved) return;
      cam.snap(ox + ev.clientX - sx, oy + ev.clientY - sy);
      hist.push({ x: cam.x.x, y: cam.y.x, t: performance.now() }); if (hist.length > 12) hist.shift();
    }, () => {
      vp.classList.remove('panning');
      if (!moved) { store.select(null); return; }
      const [vx, vy] = velocity(hist, performance.now());
      cam.x.cfg(.5, 1).to(cam.x.x + project(vx, .992), vx); cam.y.cfg(.5, 1).to(cam.y.x + project(vy, .992), vy);
    });
  }

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    store.closeMenu(); store.closeLinkPop();
    const t = e.target as Element, ce = t.closest<HTMLElement>('.card'), port = t.closest<HTMLElement>('.port[data-port]');
    downOnCard = !!ce;
    if (!t.closest('.wk')) ctx.modules.strings.clearWire();
    const n = ce ? ctx.nodes.get(ce.dataset.id!) : undefined;
    if (port && n) { e.preventDefault(); ctx.modules.strings.startString(n, port.dataset.port as 'src' | 'chat', e); return; }
    if (n && t.closest(PASS)) { if (selectedId() !== n.id) store.select(n.id); return; }
    if (t.closest('button, textarea, input, select, a')) return;
    e.preventDefault();
    if (n) drag(n, e); else if (!ce) pan(e);
  };

  const onWheel = (e: WheelEvent) => {
    const t = e.target as Element;
    const b = t.closest?.('.cbody');
    if (b && !e.ctrlKey && b.scrollHeight > b.clientHeight) return;
    e.preventDefault();
    if (ctx.modules.piles.onWheel(e)) return;
    if (e.ctrlKey || e.metaKey) cam.zoomAt(e.clientX, e.clientY, cam.z.x * Math.exp(-e.deltaY * .0105), false);
    else cam.snap(cam.x.x - e.deltaX, cam.y.x - e.deltaY);
  };

  vp.addEventListener('pointerdown', onDown);
  vp.addEventListener('wheel', onWheel, { passive: false });
  return {
    downOnCard: () => downOnCard,
    dispose: () => { vp.removeEventListener('pointerdown', onDown); vp.removeEventListener('wheel', onWheel); },
  };
}
