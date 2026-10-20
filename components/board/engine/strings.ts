/**
 * Strings: branch tubes, hand-made wires with their Disconnect pill, and the live string dragged from a port.
 * Ported from the prototype (stringPath 577, addTube 586, wireFor 589, disconnect 602, outPoint 628, startString 635,
 * frame 1204-1236). Every string keeps a spring pair for its sagging midpoint, so it hangs and swings as cards move.
 */
import type { Edge, Id } from '../api/types';
import { FAMC, STRING_COL } from '../lib/catalog';
import { ancestors, canPlug, famOf, isChat, tubeW, wireKey } from '../lib/graph';
import { icon } from './icons';
import { clamp, type Spring } from './spring';
import type { EngineContext, StringsModule, ViewNode } from './types';

const NS = 'http://www.w3.org/2000/svg';
type Pt = [number, number];
const f1 = (v: number) => v.toFixed(1);

/** Where the midpoint wants to hang: halfway, sagging by 8 + 6% of the length. */
export function stringTarget(a: Pt, b: Pt): Pt {
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 8 + dist * .06];
}

/** outA / inB: +1 = leaves or enters on the right side, -1 = on the left side. */
export function stringD(a: Pt, b: Pt, outA: 1 | -1, inB: 1 | -1, mid: Pt): string {
  const k = Math.min(70, Math.abs(b[0] - a[0]) * .28 + 14), a2: Pt = [a[0] + k * outA, a[1]], b2: Pt = [b[0] + k * inB, b[1]];
  return `M${f1(a[0])},${f1(a[1])} C${f1(a2[0])},${f1(a2[1])} ${f1(mid[0] - (b2[0] - a2[0]) * .22)},${f1(mid[1])} ${f1(mid[0])},${f1(mid[1])} S${f1(b2[0])},${f1(b2[1])} ${f1(b[0])},${f1(b[1])}`;
}

interface Str { mx: Spring; my: Spring; seen: boolean }
interface Tube { p: SVGPathElement; b: SVGPathElement; seen: boolean }
interface Wire { p: SVGPathElement; hit: SVGPathElement; k: HTMLButtonElement; edgeId: Id; from: Id; seen: boolean }
interface Live {
  n: ViewNode; kind: 'src' | 'chat'; p: SVGPathElement; ex: Spring; ey: Spring; target: ViewNode | null; retract: boolean;
}

export function createStrings(ctx: EngineContext): StringsModule {
  const { store, springs } = ctx;
  const strs = new Map<string, Str>();
  const tubes = new Map<Id, Tube>();
  const wires = new Map<string, Wire>();
  let selWire: string | null = null;
  let live: Live | null = null;

  const path = (cls: string): SVGPathElement => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); return p; };

  /** The string's spring pair is created on first sight and moved toward the sagging target every frame. */
  function stringPath(key: string, a: Pt, b: Pt, outA: 1 | -1, inB: 1 | -1): { d: string; m: Pt } {
    const [tx, ty] = stringTarget(a, b);
    let s = strs.get(key);
    if (!s) { s = { mx: springs.make(tx, .62, .45), my: springs.make(ty, .62, .45), seen: true }; strs.set(key, s); }
    s.mx.to(tx); s.my.to(ty); s.seen = true;
    const m: Pt = [s.mx.x, s.my.x];
    return { d: stringD(a, b, outA, inB, m), m };
  }

  function dropStr(key: string): void {
    const s = strs.get(key); if (!s) return;
    springs.remove(s.mx); springs.remove(s.my); strs.delete(key);
  }

  /** Paints the selection at once: the next rAF would be too late for a click that is read straight away. */
  function paintSel(): void {
    wires.forEach((w, key) => { const on = selWire === key; w.p.classList.toggle('sel', on); w.k.classList.toggle('on', on); if (on) w.p.classList.remove('faded'); });
  }

  function removeWire(key: string): void {
    const w = wires.get(key); if (!w) return;
    w.p.remove(); w.hit.remove(); w.k.remove(); wires.delete(key);
    if (selWire === key) selWire = null;
  }

  function wireFor(key: string, edge: Edge, color: string, deep: string): Wire {
    let w = wires.get(key);
    if (!w) {
      const p = path('wire'), hit = path('hit');
      ctx.tubes.append(p, hit);
      hit.addEventListener('pointerdown', (e) => { e.stopPropagation(); store.closeMenu(); selWire = selWire === key ? null : key; paintSel(); });
      const k = document.createElement('button'); k.className = 'wk'; k.dataset.key = key; k.type = 'button';
      k.innerHTML = icon('unlink') + 'Disconnect'; ctx.knobs.append(k);
      k.addEventListener('pointerdown', (e) => e.stopPropagation());
      k.addEventListener('click', (e) => { e.stopPropagation(); disconnect(key); });
      w = { p, hit, k, edgeId: edge.id, from: edge.from, seen: true }; wires.set(key, w);
    }
    w.edgeId = edge.id; w.from = edge.from;
    w.p.style.stroke = color; w.k.style.setProperty('--kd', deep); w.seen = true;
    return w;
  }

  function disconnect(key: string): void {
    const w = wires.get(key); if (!w) return;
    const from = w.from;
    store.disconnect(w.edgeId);
    removeWire(key);
    ctx.jiggle(from, .4);
  }

  const outPoint = (n: ViewNode, kind: 'src' | 'chat'): Pt => kind === 'src' ? [n.px.x + n.w + 1, n.py.x + n.h / 2] : [n.px.x + n.w + 1, n.py.x + 22];
  const rightOf = (A: ViewNode, B: ViewNode) => (A.px.x + A.w / 2) <= (B.px.x + B.w / 2);

  function endLive(): void {
    if (!live) return;
    live.p.remove(); springs.remove(live.ex); springs.remove(live.ey); dropStr('live'); live = null;
  }

  /** The chat under the pointer: the chat card, the desk owner of a card, or the desk itself. */
  function chatUnder(ev: PointerEvent): Id | null {
    const [x, y] = ctx.s2w(ev.clientX, ev.clientY);
    const card = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.card');
    const n = card ? ctx.nodes.get(card.dataset.id!) : undefined;
    if (n?.isChat) return n.id;
    if (n?.deskId) return n.deskId;
    return ctx.modules.desks.deskAt(x, y);
  }

  function startString(n: ViewNode, kind: 'src' | 'chat', e: PointerEvent): void {
    endLive(); selWire = null; paintSel(); store.select(n.id);
    const p = path('live'); ctx.tubes.append(p);
    p.style.stroke = kind === 'src' ? STRING_COL[famOf(store.graph(), store.graph().cards.get(n.id)!)] : '#CFC3E8';
    ctx.root.classList.add('stringing');
    ctx.root.querySelector('.tip')?.classList.remove('show');
    n.el.querySelector('.port[data-port]')?.classList.add('grab');
    const [wx, wy] = ctx.s2w(e.clientX, e.clientY), a = outPoint(n, kind);
    const L: Live = { n, kind, p, ex: springs.make(wx, .3, 1), ey: springs.make(wy, .3, 1), target: null, retract: false };
    live = L;
    const setTarget = (t: ViewNode | null) => {
      if (t === L.target) return;
      L.target?.el.classList.remove('target'); L.target?.el.querySelector('.port.in')?.classList.remove('target');
      L.target = t; t?.el.classList.add('target'); t?.el.querySelector('.port.in')?.classList.add('target');
    };
    ctx.track(e, (ev) => {
      const [x, y] = ctx.s2w(ev.clientX, ev.clientY); L.ex.snap(x); L.ey.snap(y);
      const id = chatUnder(ev);
      setTarget(id && canPlug(store.graph(), n.id, kind, id) ? ctx.nodes.get(id) ?? null : null);
    }, (ev) => {
      ctx.root.classList.remove('stringing'); n.el.querySelector('.port.grab')?.classList.remove('grab');
      const t = L.target; setTarget(null);
      const end: Pt = [L.ex.x, L.ey.x], moved = Math.hypot(end[0] - a[0], end[1] - a[1]) > 40;
      if (t) {
        const edgeId = store.connect(kind === 'src' ? 'wire' : 'answer', n.id, t.id);
        if (edgeId) {
          const key = `${kind === 'src' ? 's' : 'a'}|${n.id}|${t.id}`, s = strs.get('live');
          if (s) { strs.delete('live'); dropStr(key); strs.set(key, s); }
          endLive(); ctx.jiggle(t.id, .5); ctx.jiggle(n.id, .3); store.select(t.id);
          return;
        }
      } else {
        const overCard = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.card');
        if (kind === 'chat' && !overCard && moved) {
          endLive(); store.openDialog({ mode: 'branch', parentId: n.id, at: [end[0] + 6, end[1] - 40] }); return;
        }
      }
      // nothing to plug into: the string springs back into its port
      const back = outPoint(n, kind); L.retract = true; L.ex.cfg(.26, 1).to(back[0]); L.ey.cfg(.26, 1).to(back[1]);
    });
  }

  function frame(): void {
    const g = store.graph(), snap = store.getSnapshot();
    const sel = snap.ui.selected ? ctx.nodes.get(snap.ui.selected) : undefined;
    const selChat = sel?.isChat ? sel : null;
    const trail = new Set<Id>(selChat ? [selChat.id, ...ancestors(g, selChat.id).map((a) => a.id)] : []);
    const flowing = new Set<Id>();
    for (const c of g.cards.values()) if (isChat(c) && store.isStreaming(c.id)) [c.id, ...ancestors(g, c.id).map((a) => a.id)].forEach((x) => flowing.add(x));
    strs.forEach((s) => { s.seen = false; });

    // branch strings: thick at the trunk, thinner toward the leaves; they sag and swing as cards move
    tubes.forEach((t) => { t.seen = false; });
    for (const c of g.cards.values()) {
      if (!isChat(c) || !c.parentId) continue;
      const A = ctx.nodes.get(c.parentId), B = ctx.nodes.get(c.id); if (!A || !B) continue;
      let t = tubes.get(c.id);
      if (!t) { t = { p: path('tube'), b: path('bub'), seen: true }; ctx.tubes.prepend(t.b); ctx.tubes.prepend(t.p); tubes.set(c.id, t); }
      t.seen = true;
      const on = trail.has(c.id) && trail.has(c.parentId), flow = flowing.has(c.id) && flowing.has(c.parentId), w = tubeW(g, c.id) + (on || flow ? 1 : 0);
      const { d } = stringPath('t|' + c.id, [A.px.x + A.w + 1, A.py.x + 22], [B.px.x - 1, B.py.x + 40], 1, -1);
      t.p.setAttribute('d', d); t.b.setAttribute('d', d); t.p.style.strokeWidth = String(w); t.b.style.strokeWidth = String(Math.max(2, w * .45));
      t.p.setAttribute('class', ['tube', (on || flow) && 'trail', selChat && !on && 'faded'].filter(Boolean).join(' '));
      t.b.setAttribute('class', 'bub' + (flow ? ' flow' : ''));
      t.p.style.opacity = String(clamp(B.o.x, 0, 1));
    }
    tubes.forEach((t, id) => { if (!t.seen) { t.p.remove(); t.b.remove(); tubes.delete(id); } });

    // strings pulled by hand: a source into a chat, or one chat's answer into another
    wires.forEach((w) => { w.seen = false; });
    for (const e of g.edges.values()) {
      if (e.kind !== 'wire' && e.kind !== 'answer') continue;
      const A = ctx.nodes.get(e.from), C = ctx.nodes.get(e.to); if (!A || !C) continue;
      const key = wireKey(e), card = g.cards.get(e.from)!;
      const fam = famOf(g, card), isAns = e.kind === 'answer';
      const color = isAns ? STRING_COL.answer : STRING_COL[fam], deep = isAns ? '#6E6585' : FAMC[fam][1];
      const fade = isAns
        ? !!selChat && selChat.id !== C.id && selChat.id !== A.id
        : !!selChat && selChat.id !== C.id && !ancestors(g, C.id).some((x) => x.id === selChat.id);
      const w = wireFor(key, e, color, deep), r = rightOf(A, C), ay = isAns ? A.py.x + 22 : A.py.x + A.h / 2;
      const a: Pt = [r ? A.px.x + A.w + 1 : A.px.x - 1, ay], b: Pt = [r ? C.px.x - 1 : C.px.x + C.w + 1, C.py.x + 40];
      const p = stringPath(key, a, b, r ? 1 : -1, r ? -1 : 1), on = selWire === key;
      w.p.setAttribute('d', p.d); w.hit.setAttribute('d', p.d); w.k.style.left = p.m[0] + 'px'; w.k.style.top = p.m[1] + 'px';
      w.p.classList.toggle('faded', fade && !on); w.p.classList.toggle('sel', on); w.k.classList.toggle('on', on);
    }
    wires.forEach((w, key) => { if (!w.seen) removeWire(key); });

    if (live) {
      const a = outPoint(live.n, live.kind), e: Pt = [live.ex.x, live.ey.x];
      live.p.setAttribute('d', stringPath('live', a, e, 1, e[0] > a[0] ? -1 : 1).d);
      if (live.retract && Math.hypot(e[0] - a[0], e[1] - a[1]) < 2) { ctx.root.classList.remove('stringing'); endLive(); }
    }
    strs.forEach((s, k) => { if (!s.seen && k !== 'live') dropStr(k); });
  }

  return {
    frame, startString,
    isLive: () => !!live,
    wireKeys: () => [...wires.keys()],
    selectedWire: () => selWire,
    clearWire: () => { const had = selWire !== null; selWire = null; paintSel(); return had; },
    wirePillOn: (key) => wires.get(key)?.k.classList.contains('on') ?? false,
    wirePoint(key, frac) {
      const w = wires.get(key); if (!w) return null;
      const len = w.p.getTotalLength(), pt = w.p.getPointAtLength(len * frac), z = ctx.camera.z.x;
      return [pt.x * z + ctx.camera.x.x, pt.y * z + ctx.camera.y.x];
    },
    clickDisconnect: disconnect,
    stringMid: (key) => { const s = strs.get(key); return s ? { y: s.my.x, ty: s.my.t } : null; },
    dispose() {
      endLive(); ctx.root.classList.remove('stringing');
      tubes.forEach((t) => { t.p.remove(); t.b.remove(); }); tubes.clear();
      [...wires.keys()].forEach(removeWire);
      [...strs.keys()].forEach(dropStr);
    },
  };
}
