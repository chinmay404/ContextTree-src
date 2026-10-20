/**
 * window.__board: the dev-only test seam (installed only when NODE_ENV !== 'production' and <Board testHook />).
 * Everything e2e tests poke at goes through here, so production components carry no test code.
 */
import type { Card, Edge, EngineApi, Id } from '../api/types';
import { canPlug, chatsOf, sourcesOf } from '../lib/graph';
import type { BoardStore } from '../store';
import type { BoardEngine } from './board-engine';

export interface BoardTestHook {
  camSnap(x: number, y: number, z?: number): void; zoomAt(px: number, py: number, z: number, anim?: boolean): void; fit(anim?: boolean): void;
  cam(): { x: number; y: number; z: number }; size(): 'S' | 'M'; rerender(): void; settle(): Promise<void>;
  cards(): Card[]; edges(): Edge[]; card(id: Id): Card | undefined; chats(): Card[]; sources(): Card[];
  hasWire(sourceId: Id, chatId: Id): boolean; hasAnswer(fromChat: Id, toChat: Id): boolean;
  canPlug(fromId: Id, kind: 'src' | 'chat', chatId: Id): boolean;
  box(id: Id): [number, number, number, number]; deskBox(chatId: Id): [number, number, number, number] | null; deskChats(): Id[];
  snapBy(id: Id, dx: number, dy: number): void; stringMid(key: string): { y: number; ty: number } | null;
  live(): boolean; select(id: Id | null): void; selected(): Id | null; selectedWire(): string | null; wireKeys(): string[];
  wirePillOn(key: string): boolean; wirePoint(key: string, frac: number): [number, number] | null; clickDisconnect(key: string): void;
  dialog(): { mode: 'branch' | 'root' | 'edit'; parentId: Id | null; at: [number, number] | null } | null;
  openSheet(mode: 'branch' | 'root' | 'edit', id?: Id, at?: [number, number]): void; setDialogFirst(text: string): void; confirmDialog(): Id | null;
  viewer(): { cardId: Id; memberId: Id | null } | null; openViewer(id: Id, memberId?: Id): void;
  focus(): Id | null; openFocus(id: Id): void; menuOpen(): boolean; pileFront(id: Id): number;
  refresh(): Promise<void>;
  calls(): { method: string; args: unknown[] }[];
}

declare global {
  interface Window { __board?: BoardTestHook; __toastText?: string }
}

export function installTestHook(engine: BoardEngine, store: BoardStore, api: EngineApi): () => void {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return () => {};
  const { ctx } = engine, m = ctx.modules;
  const ui = () => store.getSnapshot().ui;
  const node = (id: Id) => {
    const n = ctx.nodes.get(id);
    if (!n) throw new Error(`No card on the board: ${id}`);
    return n;
  };
  const edges = () => [...store.graph().edges.values()];
  const hook: BoardTestHook = {
    camSnap: (x, y, z) => engine.camSnap(x, y, z),
    zoomAt: (px, py, z, anim = false) => engine.zoomAt(px, py, z, anim),
    fit: (anim = true) => engine.fit(anim),
    cam: () => ({ x: ctx.camera.x.x, y: ctx.camera.y.x, z: ctx.camera.z.x }),
    size: () => ctx.size(),
    rerender: () => ctx.renderAll(),
    settle: () => new Promise<void>((resolve) => {
      const t0 = performance.now();
      const off = engine.onFrame(() => { if (engine.settled() || performance.now() - t0 > 4000) { off(); resolve(); } });
    }),
    cards: () => [...store.graph().cards.values()],
    edges,
    card: (id) => store.graph().cards.get(id),
    chats: () => chatsOf(store.graph()),
    sources: () => sourcesOf(store.graph()),
    hasWire: (s, c) => edges().some((e) => e.kind === 'wire' && e.from === s && e.to === c),
    hasAnswer: (a, b) => edges().some((e) => e.kind === 'answer' && e.from === a && e.to === b),
    canPlug: (fromId, kind, chatId) => canPlug(store.graph(), fromId, kind, chatId),
    box: (id) => { const n = node(id); return [n.px.x, n.py.x, n.px.x + n.w, n.py.x + n.h]; },
    deskBox: (id) => m.desks.deskBox(id),
    deskChats: () => [...ctx.world.querySelectorAll<HTMLElement>('.desk[data-chat]')].map((d) => d.dataset.chat!),
    snapBy: (id, dx, dy) => { const n = node(id); n.px.snap(n.px.x + dx); n.py.snap(n.py.x + dy); },
    stringMid: (key) => m.strings.stringMid(key),
    live: () => m.strings.isLive(),
    select: (id) => store.select(id),
    selected: () => ui().selected,
    selectedWire: () => m.strings.selectedWire(),
    wireKeys: () => m.strings.wireKeys(),
    wirePillOn: (key) => m.strings.wirePillOn(key),
    wirePoint: (key, frac) => m.strings.wirePoint(key, frac),
    clickDisconnect: (key) => m.strings.clickDisconnect(key),
    dialog: () => { const d = ui().dialog; return d ? { mode: d.mode, parentId: d.parentId, at: d.at } : null; },
    openSheet: (mode, id, at) => store.openDialog({
      mode, parentId: mode === 'branch' ? id ?? null : null, chatId: mode === 'edit' ? id ?? null : null, at: at ?? null,
    }),
    setDialogFirst: (text) => store.setDraft({ first: text }),
    confirmDialog: () => engine.confirmBranch(),
    viewer: () => { const v = ui().viewer; return v ? { cardId: v.cardId, memberId: v.memberId } : null; },
    openViewer: (id, memberId) => store.openViewer(id, memberId ?? null),
    focus: () => ui().focus,
    openFocus: (id) => store.openFocus(id),
    menuOpen: () => !!ui().menu,
    pileFront: (id) => m.piles.front(id),
    refresh: () => store.refresh(),
    calls: () => (api as unknown as { calls?: { method: string; args: unknown[] }[] }).calls ?? [],
  };
  window.__board = hook;
  // window.__toastText mirrors the current toast so tests can read it before the Toast component exists.
  const syncToast = () => { window.__toastText = ui().toast?.text; };
  syncToast();
  const unsub = store.subscribe(syncToast);
  return () => {
    unsub();
    if (window.__board === hook) { delete window.__board; delete window.__toastText; }
  };
}
