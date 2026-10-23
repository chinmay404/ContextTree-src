/**
 * The board engine: owns the DOM under `.pb-vp`, one view node per visible card, the springs, the camera and the frame
 * loop. Ported from the prototype (addNode 445-454, removeNode 569-573, camera 750-761, select 855-863,
 * tooltips 1192-1193, frame 1199-1209, start 1281). React never renders inside `.pb-vp`.
 *
 * Re-renders are driven by store changes (card, messages, stream, reads, edges). A `ui` change only toggles
 * `selected` / `faded`; a module whose card face depends on other UI state must call ctx.render(id) itself.
 */
import type { Card, Id, ProviderId } from '../api/types';
import { ancestors, chatsOf, isChat } from '../lib/graph';
import type { BoardStore, StoreChange } from '../store';
import { Camera, type Box } from './camera';
import { CardView, CHAT_W, SRC_W } from './card-view';
import { createDesks } from './desks';
import { attachPointer, type PointerRouting } from './drag';
import { freeSpot as geoFreeSpot, placeFor as geoPlaceFor, type Layout } from './geometry';
import { FrameLoop } from './loop';
import { createPersistence } from './persistence';
import { createPiles } from './piles';
import { clamp, SpringSystem, type Spring } from './spring';
import { createStrings } from './strings';
import type { EngineContext, ViewNode } from './types';
import { dotGrid } from './dotgrid';

const NS = 'http://www.w3.org/2000/svg';
const near = (s: Spring, ex: number, ev: number) => Math.abs(s.x - s.t) < ex && Math.abs(s.v) < ev;

export class BoardEngine {
  readonly ctx: EngineContext;
  private readonly store: BoardStore;
  private readonly springs: SpringSystem;
  private readonly camera: Camera;
  private readonly view: CardView;
  private readonly loop: FrameLoop;
  private readonly tip: HTMLDivElement;
  private readonly dying = new Map<Id, { n: ViewNode; timer: ReturnType<typeof setTimeout> }>();
  private readonly frameSubs = new Set<(dt: number, now: number) => void>();
  private readonly opacity = new Map<Id, number>();
  private readonly lastStatus = new Map<Id, Card['status']>();
  private readonly streaming = new Set<Id>();
  private readonly edgeEnds = new Map<Id, [Id, Id]>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private dirty = new Set<Id>();
  private streamDirty = new Set<Id>();
  private flushQueued = false;
  private size: 'S' | 'M' = 'M';
  private zTop = 10;
  private started = false;
  private mounted = false;
  private disposed = false;
  private related: Set<Id> | null = null;
  private lastSelected: Id | null = null;
  private lastReadBy = '|';
  /** Source cards whose read state (the "reading" glow, the token figure) changed but whose face did not. */
  private readonly liveSources = new Set<Id>();
  private readonly liveChats = new Set<Id>();
  private pointer: PointerRouting | null = null;
  private ro: ResizeObserver | null = null;
  private unsub: (() => void) | null = null;
  private tipTimer: ReturnType<typeof setTimeout> | null = null;
  private tipWarm = 0;
  private dots: HTMLElement;
  private dotKey = '';

  constructor(o: { store: BoardStore; root: HTMLElement; rm: boolean; showcase?: boolean }) {
    this.store = o.store;
    this.springs = new SpringSystem(o.rm);
    this.camera = new Camera(this.springs);
    const viewport = document.createElement('div'); viewport.className = 'pb-vp';
    const world = document.createElement('div'); world.className = 'pb-world';
    const tubes = document.createElementNS(NS, 'svg') as SVGSVGElement; tubes.setAttribute('class', 'pb-tubes');
    const knobs = document.createElement('div'); knobs.className = 'pb-knobs';
    world.append(tubes, knobs);
    this.dots = document.createElement('div'); this.dots.className = 'pb-dots'; this.dots.setAttribute('aria-hidden', 'true');
    viewport.append(this.dots, world);
    this.tip = document.createElement('div'); this.tip.className = 'tip'; this.tip.setAttribute('role', 'tooltip');
    const nodes = new Map<Id, ViewNode>();
    const ctx: EngineContext = {
      store: o.store, springs: this.springs, camera: this.camera, rm: o.rm, root: o.root, viewport, world, tubes, knobs, nodes,
      size: () => this.size,
      layout: () => this.layout(),
      nextZ: () => ++this.zTop,
      render: (id) => { const n = nodes.get(id); if (n) this.view.render(n); },
      renderAll: () => nodes.forEach((n) => this.view.render(n)),
      jiggle: (id, amt = 1) => {
        const n = nodes.get(id); if (!n) return;
        n.s.cfg(.42, .45).kick(-1.2 * amt); n.rot.cfg(.5, .3).kick((Math.random() > .5 ? 1 : -1) * 40 * amt);
      },
      s2w: (cx, cy) => this.camera.s2w(cx, cy),
      track: (e, move, up) => {
        const id = e.pointerId;
        try { viewport.setPointerCapture(id); } catch { /* the pointer may already be gone */ }
        const mv = (ev: PointerEvent) => { if (ev.pointerId === id) move(ev); };
        const u = (ev: PointerEvent) => {
          if (ev.pointerId !== id) return;
          viewport.removeEventListener('pointermove', mv); viewport.removeEventListener('pointerup', u); viewport.removeEventListener('pointercancel', u);
          up(ev);
        };
        viewport.addEventListener('pointermove', mv); viewport.addEventListener('pointerup', u); viewport.addEventListener('pointercancel', u);
      },
      openSettings: null,
      showcase: !!o.showcase,
      modules: null as unknown as EngineContext['modules'],
    };
    this.ctx = ctx;
    ctx.modules = { desks: createDesks(ctx), strings: createStrings(ctx), piles: createPiles(ctx), persistence: createPersistence(ctx) };
    this.view = new CardView(ctx, {
      related: () => this.related,
      bindTips: (el) => this.bindTips(el),
      focusCompose: (id) => this.focusCompose(id),
      focusNote: (id) => this.focusNote(id),
      focusDesc: (id) => this.focusDesc(id),
    });
    this.loop = new FrameLoop(this.springs, (dt, now) => this.frame(dt, now));
  }

  setOpenSettings(fn: ((provider: ProviderId) => void) | null): void { this.ctx.openSettings = fn; }

  // ---- lifecycle ----

  mount(): void {
    if (this.mounted || this.disposed) return;
    this.mounted = true;
    const { root, viewport } = this.ctx;
    root.prepend(viewport);
    if (this.ctx.showcase) viewport.inert = true;   // decorative: no tab stops, no typing into a card
    root.append(this.tip);
    this.ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => {
      let grew = false;
      for (const en of entries) {
        if (en.target === root) { grew = true; continue; }
        const id = (en.target as HTMLElement).dataset.id; const n = id ? this.ctx.nodes.get(id) : undefined;
        if (n) { n.h = n.el.offsetHeight; grew = true; }
      }
      if (grew && this.started) this.fitShowcase();   // the box or a card changed size: the whole board is refitted
    });
    if (this.ctx.showcase) this.ro?.observe(root);   // the box the board sits in changed size
    this.unsub = this.store.onChange((c) => this.onChange(c));
    // Delete asks the view for what only it knows: the front member of a pile, and a drop that has not been saved yet.
    this.store.setViewProbe({
      front: (id) => this.ctx.nodes.get(id)?.front ?? 0,
      size: (id) => { const n = this.ctx.nodes.get(id); return n ? [n.w, n.h] : null; },
      pos: (id) => {
        const n = this.ctx.nodes.get(id);
        return n && this.ctx.modules.persistence.isDirty(id) ? [Math.round(n.px.t * 10) / 10, Math.round(n.py.t * 10) / 10] : null;
      },
    });
    for (const c of this.store.graph().cards.values()) if (!c.pileId) this.ensureNode(c, false);
    for (const e of this.store.graph().edges.values()) this.edgeEnds.set(e.id, [e.from, e.to]);
    this.pointer = attachPointer(this.ctx);
    this.ctx.modules.desks.sync();
    this.maybeStart();
    this.loop.start();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loop.stop();
    this.unsub?.();
    this.store.setViewProbe(null);
    this.pointer?.dispose();
    this.ro?.disconnect();
    const m = this.ctx.modules;
    m.desks.dispose(); m.strings.dispose(); m.piles.dispose(); m.persistence.dispose();
    this.dying.forEach((d) => clearTimeout(d.timer));
    this.timers.forEach((t) => clearTimeout(t));
    if (this.tipTimer) clearTimeout(this.tipTimer);
    this.ctx.viewport.remove();
    this.tip.remove();
    this.frameSubs.clear();
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => { this.timers.delete(t); if (!this.disposed) fn(); }, ms);
    this.timers.add(t);
  }

  // ---- nodes ----

  private layout(): Layout {
    const chats = chatsOf(this.store.graph()).map((c) => c.id).filter((id) => this.ctx.nodes.has(id));
    return { items: this.ctx.nodes, chats };
  }

  private ensureNode(c: Card, pop: boolean): ViewNode {
    const have = this.ctx.nodes.get(c.id);
    if (have) return have;
    const dead = this.dying.get(c.id);
    if (dead) {   // brought back (undo, failed delete) before its fade finished
      clearTimeout(dead.timer); this.dying.delete(c.id);
      dead.n.o.cfg(.25, 1).to(1); dead.n.s.cfg(.42, 1).to(1);
      this.ctx.nodes.set(c.id, dead.n); this.ro?.observe(dead.n.el);
      dead.n.deskId = c.deskId;
      dead.n.px.to(c.x); dead.n.py.to(c.y);
      this.ctx.modules.persistence.markSynced(c.id, c.x, c.y);
      this.view.render(dead.n);
      return dead.n;
    }
    const sp = this.springs, el = document.createElement('div');
    el.dataset.id = c.id; el.tabIndex = 0;
    this.ctx.world.appendChild(el);
    const chat = isChat(c);
    const n: ViewNode = {
      id: c.id, isChat: chat, isPile: c.sourceType === 'pile', deskId: c.deskId, w: chat ? CHAT_W : SRC_W, h: 80,
      px: sp.make(c.x, .4, 1), py: sp.make(c.y, .4, 1), rot: sp.make(0, .5, .3),
      s: sp.make(pop ? .8 : 1, .42, pop ? .55 : 1), o: sp.make(pop ? 0 : 1, .25, 1),
      el, front: 0, open: false, fresh: false,
    };
    if (pop) { n.s.to(1); n.o.to(1); el.style.zIndex = String(++this.zTop); }
    this.ctx.nodes.set(c.id, n);
    this.ctx.modules.persistence.markSynced(c.id, c.x, c.y);
    this.lastStatus.set(c.id, c.status);
    this.view.render(n);
    this.place(n);
    this.ro?.observe(el);
    return n;
  }

  private dropSprings(n: ViewNode): void {
    for (const s of [n.px, n.py, n.rot, n.s, n.o]) this.springs.remove(s);
  }

  /** Immediately (a card that joined a pile) or after the prototype's 230 ms fade. */
  private removeNode(id: Id, fade: boolean): void {
    const n = this.ctx.nodes.get(id);
    if (!n) return;
    this.ctx.nodes.delete(id);
    this.ro?.unobserve(n.el);
    this.opacity.delete(id);
    const gone = () => { this.dying.delete(id); n.el.remove(); this.dropSprings(n); };
    if (!fade) { gone(); return; }
    n.o.cfg(.22, 1).to(0); n.s.cfg(.3, 1).to(.85);
    this.dying.set(id, { n, timer: setTimeout(gone, this.ctx.rm ? 0 : 230) });
  }

  // ---- store changes ----

  private onChange(changes: StoreChange[]): void {
    if (this.disposed) return;
    const g = this.store.graph();
    for (const ch of changes) {
      switch (ch.kind) {
        case 'card': this.cardChanged(ch.id, ch.fields); break;
        case 'card-removed':
          // A pile member is not drawn: its pile's face (count, front file) is what changes.
          if (!this.ctx.nodes.has(ch.id)) for (const n of this.ctx.nodes.values()) if (n.isPile) this.dirty.add(n.id);
          this.removeNode(ch.id, true); this.lastStatus.delete(ch.id); break;
        case 'edge': {
          const e = g.edges.get(ch.id);
          if (e) { this.edgeEnds.set(e.id, [e.from, e.to]); this.dirty.add(e.from); this.dirty.add(e.to); }
          break;
        }
        case 'edge-removed': {
          const ends = this.edgeEnds.get(ch.id);
          if (ends) { this.dirty.add(ends[0]); this.dirty.add(ends[1]); this.edgeEnds.delete(ch.id); }
          break;
        }
        case 'messages': this.dirty.add(ch.chatId); break;
        case 'stream': this.streamDirty.add(ch.chatId); break;
        case 'reads':
          this.liveChats.add(ch.chatId);   // footer in place: a redraw between mouse down and up would eat the click
          for (const n of this.ctx.nodes.values()) if (!n.isChat) this.liveSources.add(n.id);   // in place: a redraw here would eat a click
          break;
        case 'ui': break;
        case 'board': this.maybeStart(); break;
      }
    }
    this.queueFlush();
  }

  private cardChanged(id: Id, fields: string[]): void {
    if (fields.length && fields.every((f) => f === 'updatedAt')) return;   // the server's answer to our own write: nothing on the face changed
    const c = this.store.graph().cards.get(id);
    if (!c) { this.removeNode(id, true); return; }
    if (c.pileId) {   // pile members are never drawn; the pile's face shows them
      this.removeNode(id, false);
      this.dirty.add(c.pileId);
      return;
    }
    let n = this.ctx.nodes.get(id);
    if (!n) {
      n = this.ensureNode(c, this.started);
      if (n.deskId !== c.deskId) n.deskId = c.deskId;
      this.ctx.modules.desks.sync();
      return;
    }
    if ((fields.includes('x') || fields.includes('y')) && !n.dragging && !this.ctx.modules.persistence.isDirty(id)) {
      n.px.to(c.x); n.py.to(c.y);
      this.ctx.modules.persistence.markSynced(id, c.x, c.y);
    }
    n.deskId = c.deskId;
    if (fields.includes('status')) this.intro(n, c);
    this.lastStatus.set(id, c.status);
    this.dirty.add(id);
  }

  /** processing → ready: one upload opens and asks what it is for; several get the "Say what it's for" link. */
  private intro(n: ViewNode, c: Card): void {
    const was = this.lastStatus.get(c.id);
    if (was !== 'processing' || c.status !== 'ready') return;
    const how = this.store.intro(c.id);
    if (how === 'single' && c.sourceType !== 'doc') { n.open = true; this.focusDesc(c.id); }
    else if (how === 'multi') n.fresh = true;
    if (how) this.store.clearIntro(c.id);
    this.later(() => this.ctx.jiggle(c.id, .6), 0);
  }

  private queueFlush(): void {
    if (this.flushQueued) return;
    this.flushQueued = true;
    queueMicrotask(() => { this.flushQueued = false; if (!this.disposed) this.flush(); });
  }

  private flush(): void {
    const store = this.store, snap = store.getSnapshot(), nodes = this.ctx.nodes;
    // streams: start/stop re-renders the chat and every source ("reading"); later deltas patch `.ans.live` only
    for (const id of this.streamDirty) {
      const now = store.isStreaming(id);
      if (now !== this.streaming.has(id)) {
        if (now) this.streaming.add(id); else this.streaming.delete(id);
        this.dirty.add(id);
        for (const n of nodes.values()) if (!n.isChat) this.liveSources.add(n.id);
      } else if (!this.dirty.has(id)) {
        const n = nodes.get(id);
        if (n && !this.view.updateStream(n)) this.dirty.add(id);
      }
    }
    this.streamDirty.clear();

    // selection: chat + ancestors + everything it reads (members count as their pile)
    const sel = snap.ui.selected;
    if (sel && !nodes.has(sel) && !store.graph().cards.has(sel)) { this.later(() => store.select(null), 0); }
    const selCard = sel ? store.graph().cards.get(sel) : undefined;
    if (selCard && isChat(selCard)) {
      const g = store.graph(), rel = new Set<Id>([sel!]);
      ancestors(g, sel!).forEach((a) => rel.add(a.id));
      for (const i of store.readsOf(sel!).items) { rel.add(i.cardId); const p = g.cards.get(i.cardId)?.pileId; if (p) rel.add(p); }
      this.related = rel;
    } else this.related = null;
    if (sel !== this.lastSelected) {
      this.lastSelected = sel;
      const n = sel ? nodes.get(sel) : undefined;
      if (n) n.el.style.zIndex = String(++this.zTop);
    }
    // An open card's token figure belongs to the selected or open chat. Only a change of that chat updates the pill, in place: a click on the card itself must not be lost to a redraw.
    const readBy = `${selCard && isChat(selCard) ? sel : ''}|${snap.ui.focus ?? ''}`;
    if (readBy !== this.lastReadBy) {
      this.lastReadBy = readBy;
      for (const o of nodes.values()) if (o.open && !o.isChat) this.view.refreshTokens(o);
    }

    const dirty = this.dirty; this.dirty = new Set();
    for (const id of dirty) { const n = nodes.get(id); if (n) this.view.render(n); }
    for (const id of this.liveSources) { const n = nodes.get(id); if (n && !dirty.has(id)) this.view.refreshLive(n); }
    this.liveSources.clear();
    for (const id of this.liveChats) { const n = nodes.get(id); if (n && !dirty.has(id)) this.view.refreshChatFoot(n); }
    this.liveChats.clear();
    for (const n of nodes.values()) {
      if (dirty.has(n.id)) continue;
      n.el.classList.toggle('selected', n.id === sel);
      n.el.classList.toggle('faded', !!this.related && !this.related.has(n.id));
    }
    this.ctx.modules.desks.sync();
    this.ctx.modules.desks.fade(this.related);
  }

  private maybeStart(): void {
    if (this.started || !this.mounted || this.store.getSnapshot().status !== 'ready') return;
    this.started = true;
    this.ctx.nodes.forEach((n) => { n.h = n.el.offsetHeight; });
    const v = this.store.getSnapshot().board?.viewport;
    if (this.ctx.showcase) this.fitShowcase();   // the saved viewport belongs to the app, not the landing
    else if (v) this.camSnap(v.x, v.y, v.zoom); else this.fit(false);
    this.ctx.modules.persistence.resetViewportBase();   // mount itself never saves
    this.place();
  }

  // ---- frame ----

  private place(only?: ViewNode): void {
    const list = only ? [only] : [...this.ctx.nodes.values(), ...[...this.dying.values()].map((d) => d.n)];
    for (const n of list) n.el.style.transform = `translate3d(${n.px.x}px,${n.py.x}px,0) rotate(${n.rot.x.toFixed(2)}deg) scale(${n.s.x})`;
  }

  /** The dotted canvas follows the camera; style is written only when the camera moved. */
  private paintDots(cx: number, cy: number, z: number): void {
    const key = `${cx.toFixed(2)}|${cy.toFixed(2)}|${z.toFixed(4)}`;
    if (key === this.dotKey) return;
    this.dotKey = key;
    const g = dotGrid(cx, cy, z), st = this.dots.style;
    st.backgroundSize = `${g.size}px ${g.size}px`;
    st.backgroundPosition = `${g.x}px ${g.y}px`;
    st.opacity = String(g.opacity);
    st.setProperty('--dot', `${g.dot / 2}px`);
  }

  private frame(dt: number, now: number): void {
    const z = this.camera.z.x;
    const want = this.ctx.showcase ? 'M' : this.size === 'S' ? (z > .5 ? 'M' : 'S') : (z < .42 ? 'S' : 'M');
    if (want !== this.size) { this.size = want; this.ctx.renderAll(); }
    this.ctx.world.style.transform = `translate3d(${this.camera.x.x}px,${this.camera.y.x}px,0) scale(${z})`;
    if (this.size === 'S') this.ctx.world.style.setProperty('--iz', (1 / z).toFixed(3));   // the map's labels counter-scale to a steady size on screen
    this.paintDots(this.camera.x.x, this.camera.y.x, z);
    this.place();
    this.ctx.nodes.forEach((n) => {
      const o = this.opacity.get(n.id);
      if (o !== undefined) { n.el.style.opacity = String(o); return; }
      const cl = n.el.classList;
      n.el.style.opacity = cl.contains('faded') || cl.contains('muted') || cl.contains('demoted') ? '' : String(clamp(n.o.x, 0, 1));
    });
    this.dying.forEach(({ n }) => { n.el.style.opacity = String(clamp(n.o.x, 0, 1)); });
    const m = this.ctx.modules;
    m.desks.frame(z); m.strings.frame(); m.persistence.frame(now);
    for (const cb of [...this.frameSubs]) cb(dt, now);
  }

  // ---- tooltips (prototype 1192-1193) ----

  private bindTips(root: HTMLElement): void {
    const tip = this.tip;
    root.querySelectorAll<HTMLElement>('[data-tip]').forEach((b) => {
      b.addEventListener('pointerenter', () => {
        if (this.ctx.modules.strings.isLive()) return;
        if (this.tipTimer) clearTimeout(this.tipTimer);
        const show = () => {
          if (!b.isConnected) return;
          tip.textContent = b.dataset.tip ?? '';
          const r = b.getBoundingClientRect();
          tip.style.left = clamp(r.left + r.width / 2 - tip.offsetWidth / 2, 8, innerWidth - tip.offsetWidth - 8) + 'px';
          tip.style.top = (r.top - 34) + 'px';
          tip.classList.add('show');
        };
        if (performance.now() - this.tipWarm < 500) show(); else this.tipTimer = setTimeout(show, 380);
      });
      b.addEventListener('pointerleave', () => {
        if (this.tipTimer) clearTimeout(this.tipTimer);
        if (tip.classList.contains('show')) this.tipWarm = performance.now();
        tip.classList.remove('show');
      });
    });
  }

  // ---- camera ----

  fit(anim = true): void {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    this.ctx.nodes.forEach((n) => {
      x0 = Math.min(x0, n.px.t - 40); y0 = Math.min(y0, n.py.t - 50); x1 = Math.max(x1, n.px.t + n.w + 40); y1 = Math.max(y1, n.py.t + n.h + 40);
    });
    if (x0 > x1) return;
    this.camera.fit([x0, y0, x1, y1] as Box, innerWidth, innerHeight, anim);
  }
  /** Showcase: every card inside the root's own box, whatever its size (no chrome to leave room for). */
  private fitShowcase(): void {
    if (!this.ctx.showcase) return;
    const { root } = this.ctx, vw = root.clientWidth, vh = root.clientHeight;
    if (!vw || !vh) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    this.ctx.nodes.forEach((n) => {
      x0 = Math.min(x0, n.px.t); y0 = Math.min(y0, n.py.t); x1 = Math.max(x1, n.px.t + n.w); y1 = Math.max(y1, n.py.t + n.h);
    });
    if (x0 > x1) return;
    this.camera.fit([x0, y0, x1, y1] as Box, vw, vh, false, { l: 16, r: 16, t: 16, b: 16 });
  }
  zoomBy(f: number): void { this.camera.zoomAt(innerWidth / 2, innerHeight / 2, this.camera.z.t * f, true); }
  zoomAt(px: number, py: number, z: number, anim: boolean): void { this.camera.zoomAt(px, py, z, anim); }
  camSnap(x: number, y: number, z?: number): void { this.camera.snap(x, y, z); }
  center(): [number, number] { return this.camera.center(innerWidth, innerHeight); }
  flyTo(id: Id): void { const n = this.ctx.nodes.get(id); if (n) this.camera.flyTo({ x: n.px.t, y: n.py.t, w: n.w }, innerWidth, innerHeight); }
  zoom(): number { return this.camera.z.x; }

  onFrame(cb: (dt: number, now: number) => void): () => void {
    this.frameSubs.add(cb);
    return () => { this.frameSubs.delete(cb); };
  }

  /** Screen rect of a card's face, as insets from the window edges (the focus view morphs from it). */
  cardRect(id: Id): { l: number; t: number; r: number; b: number; rad: number } | null {
    const face = this.ctx.nodes.get(id)?.el.querySelector('.face');
    if (!face) return null;
    const r = face.getBoundingClientRect();
    return { l: r.left, t: r.top, r: innerWidth - r.right, b: innerHeight - r.bottom, rad: 20 * this.camera.z.x };
  }

  /** Overrides the frame's opacity for one card (null hands it back). */
  setCardOpacity(id: Id, v: number | null): void {
    if (v === null) { this.opacity.delete(id); const n = this.ctx.nodes.get(id); if (n) n.el.style.opacity = ''; }
    else this.opacity.set(id, v);
  }

  // ---- focus helpers ----

  focusCompose(id: Id): void { this.later(() => this.ctx.nodes.get(id)?.el.querySelector<HTMLElement>('.compose textarea')?.focus({ preventScroll: true }), 50); }
  focusNote(id: Id): void {
    const field = () => this.ctx.nodes.get(id)?.el.querySelector<HTMLElement>('.note-in .n');
    field()?.focus({ preventScroll: true });   // at once, so typing right after a click is not lost
    this.later(() => { const f = field(); if (f && document.activeElement !== f) f.focus({ preventScroll: true }); }, 40);
  }
  focusDesc(id: Id): void { this.later(() => this.ctx.nodes.get(id)?.el.querySelector<HTMLElement>('.desc')?.focus({ preventScroll: true }), 60); }

  // ---- placement and creation ----

  freeSpot(x: number, y: number, w: number, h: number): [number, number] { return geoFreeSpot(this.layout(), x, y, w, h); }
  placeFor(deskId: Id | null, i: number, at: [number, number] | null): [number, number] { return geoPlaceFor(this.layout(), deskId, i, at, this.center()); }
  deskAt(x: number, y: number): Id | null { return this.ctx.modules.desks.deskAt(x, y); }

  /** A note at (x, y), on the desk under it if any, selected and ready to type into (prototype 1138). */
  spawnNote(x: number, y: number): Id {
    const deskId = this.deskAt(x + 106, y + 40);
    const id = this.store.createNote({ x, y, deskId });
    const n = this.ctx.nodes.get(id);
    if (n) { n.el.style.zIndex = String(++this.zTop); this.ctx.modules.desks.onCardDropped(n); }
    this.store.select(id);
    this.focusNote(id);
    return id;
  }

  /** Raises a card that was just created and clears room around it (prototype addDetected, 1112). */
  land(id: Id): void {
    const n = this.ctx.nodes.get(id);
    if (!n) return;
    n.el.style.zIndex = String(++this.zTop);
    this.ctx.modules.desks.onCardDropped(n);
  }

  /** One card per file; the API decides what each is. `at` is a world point, else the desk's next spot or the centre. */
  addFiles(files: File[], at: [number, number] | null, deskId: Id | null, into: Id | null = null): Id[] {
    const ids = files.map((f, i) => {
      const id = this.store.createSourceFromFile(f, this.placeFor(deskId, i, at), deskId, files.length === 1 ? 'single' : 'multi');
      this.land(id);
      if (into) this.store.makePile(id, into, at ?? [0, 0]);   // dropped on an open set: a member from the start
      return id;
    });
    return ids;
  }

  /** A link card (YouTube becomes a coming-soon video); false when `text` is not an http(s) URL. */
  addLink(text: string, deskId: Id | null, at: [number, number] | null, into: Id | null = null): boolean {
    const id = this.store.createSourceFromLink(text.trim(), this.placeFor(deskId, 0, at), deskId);
    if (!id) return false;
    this.land(id);
    if (into) this.store.makePile(id, into, at ?? [0, 0]);
    this.store.select(into ?? id);
    return true;
  }

  /** The open set under a screen point, if any (a drop on it goes into it). */
  setUnder(clientX: number, clientY: number): Id | null {
    const el = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.card.src.set');
    return el?.dataset.id ?? null;
  }

  /** A new, empty set at a spot (or a free one near the middle of the screen); it is selected. */
  spawnSet(at: [number, number] | null): Id {
    const [fx, fy] = at ?? this.freeSpot(...this.center().map((v, i) => v - (i ? 90 : 165)) as [number, number], 330, 190);
    const id = this.store.makeSet([fx, fy], null);
    this.land(id);
    this.store.select(id);
    return id;
  }

  /** Pasted text becomes a note with the first 600 characters (prototype 1153). */
  addPastedNote(text: string, deskId: Id | null): Id {
    const [x, y] = this.placeFor(deskId, 0, null);
    const id = this.store.createNote({ x, y, deskId, text: text.slice(0, 600), meta: 'Note · pasted' });
    this.land(id);
    this.store.select(id);
    return id;
  }

  /** The desk a paste or link goes to when nothing was pointed at: the selected chat's, or the selected source's. */
  selectedDesk(): Id | null {
    const g = this.store.graph(), sel = this.store.getSnapshot().ui.selected, c = sel ? g.cards.get(sel) : undefined;
    return !c ? null : c.kind === 'chat' ? c.id : c.deskId;
  }

  /** Confirms the open sheet; a new chat goes to the sheet's spot or a free one, then is asked its first question (959-976). */
  confirmBranch(): Id | null {
    const d = this.store.getSnapshot().ui.dialog;
    if (!d) return null;
    if (d.mode === 'edit') return this.store.confirmDialog(null);
    const p = d.parentId ? this.ctx.nodes.get(d.parentId) : undefined;
    let spot = d.at;
    if (!spot) {
      if (p) spot = this.freeSpot(p.px.t + p.w + 200, p.py.t - 40, 320, 320);
      else { const [cx, cy] = this.center(); spot = this.freeSpot(cx - 150, cy - 160, 320, 320); }
    }
    const first = d.draft.first.trim();
    const id = this.store.confirmDialog(spot);
    if (!id) return null;
    const n = this.ctx.nodes.get(id);
    if (n) n.el.style.zIndex = String(++this.zTop);
    this.store.select(id);
    if (!d.at) this.later(() => this.flyTo(id), 60);
    // A branch made from inside the focus view takes the view with it: the new chat opens there, and the board behind has it selected.
    const inFocus = !!this.store.getSnapshot().ui.focus;
    if (inFocus) this.store.openFocus(id);
    if (first) this.later(() => { void this.store.send(id, first); }, 350); else if (!inFocus) this.focusCompose(id);
    return id;
  }

  downOnCard(): boolean { return this.pointer?.downOnCard() ?? false; }

  /** Every card and camera spring at rest and nothing being dragged. */
  settled(): boolean {
    const c = this.camera;
    if (!near(c.x, .25, 1) || !near(c.y, .25, 1) || !near(c.z, .001, .01)) return false;
    if (this.dying.size) return false;
    for (const n of this.ctx.nodes.values()) {
      if (n.dragging) return false;
      if (!near(n.px, .25, 1) || !near(n.py, .25, 1) || !near(n.s, .002, .02) || !near(n.o, .005, .05) || !near(n.rot, .05, .5)) return false;
    }
    return true;
  }
}
