import type { Card } from '../api/types';
import type { EngineContext, PersistenceModule } from './types';
import type { Spring } from './spring';

const MOVE_EPS = .5;
const CHUNK = 200;
const round1 = (v: number): number => Math.round(v * 10) / 10;

/** Cards whose spring targets differ from the store's x/y by more than .5, rounded to .1. */
export function collectMoved(
  nodes: Iterable<{ id: string; px: Spring; py: Spring }>,
  cards: ReadonlyMap<string, Card>,
): { id: string; x: number; y: number }[] {
  const out: { id: string; x: number; y: number }[] = [];
  for (const n of nodes) {
    const c = cards.get(n.id);
    if (!c) continue;
    if (Math.abs(n.px.t - c.x) > MOVE_EPS || Math.abs(n.py.t - c.y) > MOVE_EPS) out.push({ id: n.id, x: round1(n.px.t), y: round1(n.py.t) });
  }
  return out;
}

/** Fires once, `delayMs` after the first quiet frame that follows activity; any activity restarts the wait. */
export class SettleTimer {
  private since: number | null = null;   // first quiet frame after activity
  private armed = false;                 // there has been activity since the last fire
  constructor(private readonly delayMs: number, private readonly fire: () => void, private readonly now: () => number = () => performance.now()) {}
  /** Activity has happened and the timer has not fired yet. */
  get pending(): boolean { return this.armed; }
  frame(active: boolean): void {
    if (active) { this.armed = true; this.since = null; return; }
    if (!this.armed) return;
    const t = this.now();
    if (this.since === null) this.since = t;
    if (t - this.since >= this.delayMs) { this.armed = false; this.since = null; this.fire(); }
  }
}

/** Position and viewport saves after the springs settle. */
export function createPersistence(ctx: EngineContext): PersistenceModule {
  const moved = () => collectMoved(ctx.nodes.values(), ctx.store.graph().cards);
  const positions = new SettleTimer(600, () => {
    const all = moved();
    for (let i = 0; i < all.length; i += CHUNK) ctx.store.savePositions(all.slice(i, i + CHUNK));
  });

  const cam = () => ({ x: ctx.camera.x.t, y: ctx.camera.y.t, zoom: ctx.camera.z.t });
  let base = cam();
  let prev = base;   // camera right after mount/fit: mount itself never saves
  const viewport = new SettleTimer(1000, () => {
    const v = cam();
    if (Math.abs(v.x - base.x) <= MOVE_EPS && Math.abs(v.y - base.y) <= MOVE_EPS && Math.abs(v.zoom - base.zoom) <= .001) return;
    base = v;
    ctx.store.saveViewport({ x: round1(v.x), y: round1(v.y), zoom: Math.round(v.zoom * 1000) / 1000 });
  });

  return {
    frame() {
      let active = false;
      for (const n of ctx.nodes.values()) {
        if (n.dragging || !n.px.settled() || !n.py.settled()) { active = true; break; }
      }
      positions.frame(active);
      const c = ctx.camera;
      // a pan drag snaps the camera (springs at rest), so a held pan counts as activity too
      const camActive = !c.x.settled() || !c.y.settled() || !c.z.settled(.002) || ctx.viewport.classList.contains('panning');
      if (!camActive && !viewport.pending) base = cam();   // snaps (mount, fit(false)) move the baseline silently
      viewport.frame(camActive);
    },
    isDirty(id) {
      const n = ctx.nodes.get(id), c = ctx.store.graph().cards.get(id);
      return !!n && !!c && (Math.abs(n.px.t - c.x) > MOVE_EPS || Math.abs(n.py.t - c.y) > MOVE_EPS);
    },
    dispose() {},
  };
}
