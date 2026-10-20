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
  const flushPositions = () => {
    const all = moved();
    for (const m of all) synced.set(m.id, [m.x, m.y]);
    for (let i = 0; i < all.length; i += CHUNK) ctx.store.savePositions(all.slice(i, i + CHUNK));
  };
  /** Last position the server and the board agreed on, per card: what a local move is measured against. */
  const synced = new Map<string, [number, number]>();
  const positions = new SettleTimer(600, flushPositions);

  const cam = () => ({ x: ctx.camera.x.t, y: ctx.camera.y.t, zoom: ctx.camera.z.t });
  const same = (a: { x: number; y: number; zoom: number }, b: { x: number; y: number; zoom: number }) =>
    Math.abs(a.x - b.x) <= MOVE_EPS && Math.abs(a.y - b.y) <= MOVE_EPS && Math.abs(a.zoom - b.zoom) <= .001;
  const flushViewport = () => {
    const v = cam();
    if (same(v, base)) return;
    base = v;
    ctx.store.saveViewport({ x: round1(v.x), y: round1(v.y), zoom: Math.round(v.zoom * 1000) / 1000 });
  };
  let base = cam();       // the camera the server already has (set explicitly: mount, each save)
  let prevCam = base;     // camera targets on the previous frame: a change is activity even when springs snap
  const prevCard = new Map<string, [number, number]>();   // card spring targets on the previous frame
  const viewport = new SettleTimer(1000, flushViewport);

  return {
    markSynced(id, x, y) { synced.set(id, [x, y]); },
    resetViewportBase() { base = cam(); prevCam = base; },
    frame() {
      let active = false;
      const seen = new Set<string>();
      for (const n of ctx.nodes.values()) {
        seen.add(n.id);
        const p = prevCard.get(n.id);
        if (p && (p[0] !== n.px.t || p[1] !== n.py.t)) active = true;   // reduced motion snaps: the target moved
        prevCard.set(n.id, [n.px.t, n.py.t]);
        if (n.dragging || !n.px.settled() || !n.py.settled()) active = true;
      }
      for (const id of prevCard.keys()) if (!seen.has(id)) prevCard.delete(id);
      positions.frame(active);
      const c = ctx.camera, now = cam();
      const camMoved = now.x !== prevCam.x || now.y !== prevCam.y || now.zoom !== prevCam.zoom;
      prevCam = now;
      // a pan drag snaps the camera (springs at rest), so a held pan counts as activity too
      viewport.frame(camMoved || !c.x.settled() || !c.y.settled() || !c.z.settled(.002) || ctx.viewport.classList.contains('panning'));
    },
    isDirty(id) {
      const n = ctx.nodes.get(id), p = synced.get(id);
      return !!n && !!p && (Math.abs(n.px.t - p[0]) > MOVE_EPS || Math.abs(n.py.t - p[1]) > MOVE_EPS);
    },
    /** Flush synchronously so a board switch inside the settle window loses nothing. */
    dispose() { flushPositions(); flushViewport(); },
  };
}
