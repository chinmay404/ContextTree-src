import { membersOf } from '../lib/graph';
import type { EngineContext, PilesModule, ViewNode } from './types';

export interface WheelState { acc: number; t: number }

/** The prototype's wheel accumulation: small trackpad deltas add up; a pause over 260 ms starts again; 60 flips. */
export function wheelStep(state: WheelState, now: number, delta: number): { state: WheelState; flip: 0 | 1 | -1 } {
  const acc = (now - state.t > 260 ? 0 : state.acc) + delta;
  if (Math.abs(acc) >= 60) return { state: { acc: 0, t: now }, flip: acc > 0 ? 1 : -1 };
  return { state: { acc, t: now }, flip: 0 };
}

/** One accumulator per pile id: scrolling a different pile starts from zero. */
export function wheelFor(states: Map<string, WheelState>, id: string, now: number, delta: number): { state: WheelState; flip: 0 | 1 | -1 } {
  const r = wheelStep(states.get(id) ?? { acc: 0, t: 0 }, now, delta);
  states.clear();   // only the pile being scrolled keeps a count
  states.set(id, r.state);
  return r;
}

const EASE = 'cubic-bezier(.23, 1, .32, 1)';

/** Piles: hover target, drop, wheel flip with a slide, unstack. */
export function createPiles(ctx: EngineContext): PilesModule {
  const wheels = new Map<string, WheelState>();
  const card = (id: string) => ctx.store.graph().cards.get(id);
  const live = (id: string) => { const c = card(id); return !!c && c.kind === 'source' && c.status === 'ready' && c.sourceType !== 'note'; };

  const cycle = (id: string, dir: 1 | -1): void => {
    const n = ctx.nodes.get(id);
    const len = membersOf(ctx.store.graph(), id).length;
    if (!n || len < 1) return;
    const face = n.el.querySelector<HTMLElement>('.face');
    const ghost = face?.cloneNode(true) as HTMLElement | undefined;
    ghost?.classList.add('ghost');
    ghost?.querySelectorAll('.tools, .port').forEach((x) => x.remove());
    n.front = ((n.front + dir) % len + len) % len;
    ctx.render(id);
    if (ctx.rm || !ghost) return;
    n.el.appendChild(ghost);
    const off = ghost.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dir * 64}px, ${-10}px) rotate(${dir * 6}deg)`, opacity: 0 }], { duration: 260, easing: EASE, fill: 'forwards' });
    off.onfinish = () => ghost.remove();
    n.el.querySelector<HTMLElement>('.face')?.animate([{ transform: 'translateY(9px) scale(.96)', filter: 'brightness(.93)' }, { transform: 'none', filter: 'none' }], { duration: 300, easing: EASE });
  };

  return {
    hoverTarget(n: ViewNode, ev: PointerEvent) {
      if (!live(n.id)) return null;
      n.el.style.pointerEvents = 'none';
      const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.card.src');
      n.el.style.pointerEvents = '';
      const t = under?.dataset.id ? ctx.nodes.get(under.dataset.id) : undefined;
      return t && t !== n && live(t.id) ? t : null;
    },
    drop(n, t) {
      const id = ctx.store.makePile(n.id, t.id, [t.px.x, t.py.x]);
      ctx.store.select(id);
      ctx.jiggle(id);
    },
    onWheel(e) {
      if (e.ctrlKey || e.metaKey || ctx.size() === 'S') return false;
      const el = (e.target as Element).closest<HTMLElement>('.card.src');
      const n = el?.dataset.id ? ctx.nodes.get(el.dataset.id) : undefined;
      if (!n || n.open || card(n.id)?.sourceType !== 'pile' || card(n.id)?.status !== 'ready') return false;
      const r = wheelFor(wheels, n.id, performance.now(), e.deltaY || e.deltaX);
      if (r.flip) cycle(n.id, r.flip);
      return true;
    },
    cycle,
    front: (id) => ctx.nodes.get(id)?.front ?? 0,
    unstack(id) {
      const n = ctx.nodes.get(id), pile = card(id);
      if (!pile) return;
      const x = n?.px.x ?? pile.x, y = n?.py.x ?? pile.y;
      const spots = membersOf(ctx.store.graph(), id).map((_, i): [number, number] => [x + (i % 2) * 24, y + i * 96]);
      ctx.store.unstack(id, spots);
      ctx.store.select(null);
    },
    dispose() {},
  };
}
