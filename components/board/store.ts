import { ApiError } from './api/types';
import type {
  AdvancedSettings, Board, Card, CardPatch, Carry, ChatData, ChatRequest, Edge, EngineApi, Id, Message, Reads, SourceData, SourceType, Status,
} from './api/types';
import { genMessageId, newId } from './api/ids';
import { DEFAULT_ADVANCED, DEFAULT_MODEL_KEY, MODELS, PERSONAS, TYPE_INFO } from './lib/catalog';
import { cut, sizeOf } from './lib/format';
import { canPlug, chatsOf, descendants, membersOf, nameOf, qNum, type Graph } from './lib/graph';
import { deepEqual, mergeCard, reconcile, changedFields, type CardOverride } from './lib/merge';
import { computeReads } from './lib/reads';

// ---- public types ----

export type StoreChange =
  | { kind: 'card'; id: Id; fields: string[] } | { kind: 'card-removed'; id: Id }
  | { kind: 'edge'; id: Id } | { kind: 'edge-removed'; id: Id }
  | { kind: 'messages'; chatId: Id } | { kind: 'stream'; chatId: Id } | { kind: 'reads'; chatId: Id }
  | { kind: 'ui' } | { kind: 'board' };

export interface BranchDraft { name: string; first: string; model: string /* engine id */; persona: string; personaText: string;
  inheritDesk: boolean; carry: Carry; advanced: AdvancedSettings; advOpen: boolean;
  /** Set by a first-question re-ask: the new branch has no fork point whatever `carry` says. */
  noForkPoint?: boolean }
export interface DialogState { mode: 'branch' | 'root' | 'edit'; parentId: Id | null; chatId: Id | null;
  at: [number, number] | null; anchor: DOMRect | null; forkedFromMessageId: Id | null; draft: BranchDraft }
export interface UiState { selected: Id | null; dialog: DialogState | null;
  viewer: { cardId: Id; memberId: Id | null; anchor: DOMRect | null } | null; focus: Id | null;
  menu: { x: number; y: number; at: [number, number] | null; fromAdd: boolean } | null;
  linkPop: { x: number; y: number; at: [number, number] | null } | null;
  confirm: { cardId: Id; text: string; pile?: { frontId: Id; front: string; count: number } } | null;
  toast: { id: number; text: string; undoCardId: Id | null } | null;
  compare: Id | null; dropping: boolean; webSearch: Readonly<Record<Id, boolean>>;
  /** The first-visit welcome tour (chrome/WelcomeTour.tsx) is open. */
  tour: boolean }

export interface BoardSnapshot { version: number; status: 'loading' | 'ready' | 'error'; error: string | null;
  board: { id: Id; title: string; viewport: Board['viewport'] } | null;
  cards: ReadonlyMap<Id, Card>; edges: ReadonlyMap<Id, Edge>; messages: ReadonlyMap<Id, Message[]>;
  streaming: ReadonlyMap<Id, { messageId: string; text: string; web: { title?: string; url?: string }[] | null; error: string | null }>;
  ui: UiState }

/** What only the engine's view knows: a pile's front member, and a card's dragged position that is not saved yet. */
export interface ViewProbe { front(pileId: Id): number; pos(id: Id): [number, number] | null }

export interface StoreOptions { pollMs?: number; readsDebounceMs?: number; toastMs?: number }

// ---- helpers ----

/** True while any overlay is up. */
export function overlayOpen(ui: UiState): boolean {
  return !!(ui.dialog || ui.viewer || ui.focus || ui.menu || ui.linkPop || ui.confirm || ui.compare || ui.tour);
}

const initialUi = (): UiState => ({
  selected: null, dialog: null, viewer: null, focus: null, menu: null, linkPop: null, confirm: null, toast: null,
  compare: null, dropping: false, webSearch: {}, tour: false,
});

const FILE_TYPES: Record<string, [SourceType, Status]> = {
  pdf: ['pdf', 'processing'], docx: ['doc', 'processing'], txt: ['doc', 'processing'], md: ['doc', 'processing'],
  csv: ['csv', 'processing'],
  png: ['image', 'soon'], jpg: ['image', 'soon'], jpeg: ['image', 'soon'], webp: ['image', 'soon'], gif: ['image', 'soon'],
  mp3: ['audio', 'soon'], m4a: ['audio', 'soon'], wav: ['audio', 'soon'],
};

type ErrCtx = 'file' | 'link' | 'edge' | 'other';

function errorText(err: unknown, ctx: ErrCtx): string {
  if (err instanceof ApiError) {
    if (err.code === 'card_limit') return 'This board is full (50 cards). Remove something to add more.';
    if (err.status === 413) return 'That file is over 4 MB.';
    if (err.status === 415) return "Can't read that kind of file yet.";
    if (err.status === 400 && ctx === 'link') return "That link can't be read.";
    if (ctx === 'edge' && (err.code === 'not_allowed' || err.code === 'duplicate')) return "Those two can't be strung together.";
  }
  return "Couldn't save that. Try again.";
}

class Silent extends Error {}

const CHANGE_KEYS = ['data', 'status', 'deskId', 'pileId', 'parentId', 'created', 'messageCount', 'lastMessage'];
const TITLE_LATCH_MS = 5000;
const nowIso = () => new Date().toISOString();

// ---- the store ----

export class BoardStore {
  private readonly pollMs: number;
  private readonly readsDebounceMs: number;
  private readonly toastMs: number;

  private status: BoardSnapshot['status'] = 'loading';
  private error: string | null = null;
  private board: { id: Id; title: string; viewport: Board['viewport'] } | null = null;
  private cards = new Map<Id, Card>();
  private edges = new Map<Id, Edge>();
  private messages = new Map<Id, Message[]>();
  private ui: UiState = initialUi();
  private version = 0;
  private snap: BoardSnapshot | null = null;

  private readonly lastServer = new Map<Id, Card>();
  private readonly overrides = new Map<Id, { tok: number; o: CardOverride }[]>();
  private readonly pinnedCards = new Set<Id>();
  private readonly pinnedEdges = new Set<Id>();
  private readonly hiddenCards = new Set<Id>();
  private readonly hiddenEdges = new Set<Id>();
  private readonly pendingCards = new Map<Id, Promise<boolean>>();
  private readonly patchQueue = new Map<Id, Promise<boolean>>();
  private readonly pendingEdges = new Map<Id, Promise<boolean>>();
  private readonly files = new Map<Id, File>();
  private readonly links = new Map<Id, { url: string; desc?: string }>();
  private readonly intros = new Map<Id, 'single' | 'multi'>();
  private readonly debounced = new Map<Id, { data: Record<string, unknown>; tok: number; timer: ReturnType<typeof setTimeout> }>();

  private readonly serverReads = new Map<Id, Reads>();
  private readonly staleReads = new Set<Id>();
  private readonly readsGen = new Map<Id, number>();
  private readsTimer: ReturnType<typeof setTimeout> | null = null;

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private refreshing: Promise<void> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private toastSeq = 0;
  private tokSeq = 0;
  private inflight = 0;
  private pendingTitle: string | null = null;
  private titleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly streams = new Map<Id, { messageId: string; text: string; web: { title?: string; url?: string }[] | null; error: string | null }>();
  private readonly aborts = new Map<Id, AbortController>();
  private readonly deleted = new Map<Id, { ids: Id[]; roots: Id[]; edges: Edge[]; done: Promise<boolean> }>();
  private probe: ViewProbe | null = null;
  private disposed = false;

  private readonly changeListeners = new Set<(c: StoreChange[]) => void>();
  private readonly subscribers = new Set<() => void>();

  constructor(private readonly api: EngineApi, private readonly boardId: Id, opts: StoreOptions = {}) {
    this.pollMs = opts.pollMs ?? 2000;
    this.readsDebounceMs = opts.readsDebounceMs ?? 150;
    this.toastMs = opts.toastMs ?? 10000;
  }

  // ---- subscription ----

  getSnapshot(): BoardSnapshot {
    if (!this.snap) {
      this.snap = {
        version: this.version, status: this.status, error: this.error, board: this.board,
        cards: new Map(this.cards), edges: new Map(this.edges), messages: new Map(this.messages),
        streaming: new Map(this.streams), ui: this.ui,
      };
    }
    return this.snap;
  }

  subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => { this.subscribers.delete(fn); };
  }

  onChange(fn: (c: StoreChange[]) => void): () => void {
    this.changeListeners.add(fn);
    return () => { this.changeListeners.delete(fn); };
  }

  graph(): Graph {
    return { cards: this.cards, edges: this.edges };
  }

  private emit(changes: StoreChange[]): void {
    if (!changes.length) return;
    this.version++;
    this.snap = null;
    for (const l of [...this.changeListeners]) l(changes);
    for (const s of [...this.subscribers]) s();
    this.syncPoll();
  }

  // ---- loading and reconcile ----

  async load(): Promise<void> {
    this.status = 'loading';
    this.emit([{ kind: 'board' }]);
    try {
      const board = await this.api.getBoard(this.boardId);
      this.applyBoard(board, true);
      await Promise.all(board.cards.filter((c) => c.kind === 'chat').map(async (c) => {
        try {
          const [msgs, reads] = await Promise.all([this.api.getMessages(this.boardId, c.id), this.api.getReads(this.boardId, c.id)]);
          this.messages.set(c.id, msgs);
          this.serverReads.set(c.id, reads);
          this.emit([{ kind: 'messages', chatId: c.id }, { kind: 'reads', chatId: c.id }]);
        } catch { /* reads fall back to the local rules; messages stay empty until asked again */ }
      }));
      this.status = 'ready';
      this.error = null;
    } catch (e) {
      this.status = 'error';
      this.error = e instanceof Error ? e.message : 'Could not load the board';
    }
    this.emit([{ kind: 'board' }]);
  }

  refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    const p = (async () => {
      try {
        const board = await this.api.getBoard(this.boardId);
        if (!this.disposed) this.applyBoard(board);
      } catch { /* a failed poll is retried by the next one */ } finally {
        this.refreshing = null;
      }
    })();
    this.refreshing = p;
    return p;
  }

  /**
   * Per-entity reconcile of a fetched snapshot. Never a whole replace.
   * Snapshots must be applied in the order they were fetched (refresh() allows one in flight at a time).
   */
  applyBoard(board: Board, initial = false): void {
    const changes: StoreChange[] = [];
    if (!this.board) {
      this.board = { id: board.id, title: board.title, viewport: board.viewport };
      changes.push({ kind: 'board' });
    } else if (this.pendingTitle !== null) {
      if (board.title === this.pendingTitle) this.pendingTitle = null;   // the server echoed our rename
    } else if (this.board.title !== board.title) {
      this.board = { ...this.board, title: board.title };
      changes.push({ kind: 'board' });
    }

    const cr = reconcile(this.cards, board.cards, {
      pinned: this.pinnedCards, hidden: this.hiddenCards, merge: (s) => this.ingest(s), same: (a, b) => deepEqual(a, b),
    });
    const er = reconcile(this.edges, board.edges, {
      pinned: this.pinnedEdges, hidden: this.hiddenEdges, merge: (s) => s, same: (a, b) => deepEqual(a, b),
    });
    for (const c of board.cards) this.pinnedCards.delete(c.id);
    for (const e of board.edges) this.pinnedEdges.delete(e.id);

    const readsRelevant = cr.changed.filter((c) => c.fields.some((f) => CHANGE_KEYS.includes(f))).map((c) => c.id);
    const affected = new Set<Id>();
    if (!initial) {
      for (const id of [...readsRelevant, ...cr.removed]) for (const a of this.affected(id)) affected.add(a);
    }
    const edgeTargets = [...er.changed.map((c) => this.edges.get(c.id) ?? board.edges.find((e) => e.id === c.id)), ...er.removed.map((id) => this.edges.get(id))];

    this.cards = cr.next;
    this.edges = er.next;
    for (const id of cr.removed) { this.lastServer.delete(id); this.overrides.delete(id); }
    if (!initial) {
      for (const id of readsRelevant) for (const a of this.affected(id)) affected.add(a);
      for (const e of edgeTargets) if (e) for (const a of this.chatAndDesc(e.to)) affected.add(a);
      for (const c of er.changed) { const e = this.edges.get(c.id); if (e) for (const a of this.chatAndDesc(e.to)) affected.add(a); }
    }

    for (const c of cr.changed) changes.push({ kind: 'card', id: c.id, fields: c.fields });
    for (const id of cr.removed) changes.push({ kind: 'card-removed', id });
    for (const c of er.changed) changes.push({ kind: 'edge', id: c.id });
    for (const id of er.removed) changes.push({ kind: 'edge-removed', id });
    this.markStale(affected);
    this.emit(changes);
    this.syncPoll();
  }

  /** A server card in, merged with pending overrides; keeps a local drag the server has not seen yet. */
  private ingest(s: Card): Card {
    const known = this.lastServer.get(s.id);
    let src = s;
    if (known && Date.parse(s.updatedAt) < Date.parse(known.updatedAt)) {
      const loc = this.cards.get(s.id);
      src = loc ? { ...known, x: loc.x, y: loc.y } : known;
    } else {
      this.lastServer.set(s.id, s);
      const loc = this.cards.get(s.id);
      if (known && loc && s.x === known.x && s.y === known.y) src = { ...s, x: loc.x, y: loc.y };
    }
    return mergeCard(src, this.effective(s.id));
  }

  private effective(id: Id): CardOverride | undefined {
    const list = this.overrides.get(id);
    if (!list?.length) return undefined;
    const out: CardOverride = { fields: {}, data: {} };
    for (const { o } of list) { Object.assign(out.fields, o.fields); Object.assign(out.data, o.data); }
    return out;
  }

  private addOverride(id: Id, tok: number, o: CardOverride): void {
    const list = this.overrides.get(id) ?? [];
    list.push({ tok, o });
    this.overrides.set(id, list);
  }

  private dropOverride(id: Id, tok: number): void {
    const list = (this.overrides.get(id) ?? []).filter((x) => x.tok !== tok);
    if (list.length) this.overrides.set(id, list); else this.overrides.delete(id);
  }

  /** Writes a card and reports the fields that changed. */
  private put(card: Card): void {
    const old = this.cards.get(card.id);
    this.cards.set(card.id, card);
    if (!old) { this.emit([{ kind: 'card', id: card.id, fields: ['created'] }]); return; }
    const fields = changedFields(old, card);
    if (fields.length) this.emit([{ kind: 'card', id: card.id, fields }]);
  }

  private track<T>(p: Promise<T>): Promise<T> {
    this.inflight++;
    const done = () => { this.inflight--; };
    p.then(done, done);
    return p;
  }

  // ---- polling ----

  private syncPoll(): void {
    if (this.disposed) return;
    const live = [...this.cards.values()].some((c) => c.status === 'processing');
    if (live && !this.pollTimer) {
      this.pollTimer = setInterval(() => { void this.refresh(); }, this.pollMs);
    } else if (!live && this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ---- reads ----

  private chatAndDesc(id: Id): Id[] {
    const g = this.graph();
    return this.cards.get(id)?.kind === 'chat' ? [id, ...descendants(g, id).map((c) => c.id)] : [];
  }

  /** Chats whose read set may change when this card changes (call before and after a local change). */
  private affected(id: Id): Set<Id> {
    const out = new Set<Id>();
    const c = this.cards.get(id);
    if (!c) return out;
    const g = this.graph();
    if (c.kind === 'chat') {
      for (const a of this.chatAndDesc(id)) out.add(a);
    } else {
      const owner = c.deskId ?? (c.pileId ? this.cards.get(c.pileId)?.deskId ?? null : null);
      if (owner) for (const a of this.chatAndDesc(owner)) out.add(a);
    }
    const ids = new Set<Id>([id, ...(c.sourceType === 'pile' ? membersOf(g, id).map((m) => m.id) : [])]);
    for (const ch of chatsOf(g)) {
      if (computeReads(g, ch.id).items.some((i) => ids.has(i.cardId))) out.add(ch.id);
    }
    return out;
  }

  private markStale(ids: Iterable<Id>): void {
    let any = false;
    for (const id of ids) {
      if (this.cards.get(id)?.kind !== 'chat') continue;
      this.staleReads.add(id);
      this.readsGen.set(id, (this.readsGen.get(id) ?? 0) + 1);
      any = true;
    }
    if (!any || this.disposed) return;
    if (this.readsTimer) clearTimeout(this.readsTimer);
    this.readsTimer = setTimeout(() => { this.readsTimer = null; void this.flushReads(); }, this.readsDebounceMs);
    for (const id of ids) this.emitReads(id);
  }

  private emitReads(chatId: Id): void {
    if (this.cards.get(chatId)?.kind === 'chat') this.emit([{ kind: 'reads', chatId }]);
  }

  private async flushReads(): Promise<void> {
    if (this.disposed) return;
    if (this.inflight > 0) {   // a server read now would not see the writes still on their way
      this.readsTimer = setTimeout(() => { this.readsTimer = null; void this.flushReads(); }, this.readsDebounceMs);
      return;
    }
    const batch = [...this.staleReads].filter((id) => this.cards.has(id) && !this.pendingCards.has(id));
    await Promise.all(batch.map(async (id) => {
      const gen = this.readsGen.get(id);
      let r: Reads;
      try { r = await this.api.getReads(this.boardId, id); } catch { return; }
      if (this.disposed) return;
      this.serverReads.set(id, r);
      if (this.readsGen.get(id) === gen && this.inflight === 0) this.staleReads.delete(id);
      this.emitReads(id);
    }));
    if (!this.disposed && this.staleReads.size && !this.readsTimer && this.inflight > 0) {
      this.readsTimer = setTimeout(() => { this.readsTimer = null; void this.flushReads(); }, this.readsDebounceMs);
    }
  }

  readsOf(chatId: Id): Reads {
    const r = this.serverReads.get(chatId);
    if (r && !this.staleReads.has(chatId)) return r;
    return computeReads(this.graph(), chatId);
  }

  // ---- toasts ----

  toast(text: string, undoCardId: Id | null = null): void {
    if (this.disposed) return;
    const id = ++this.toastSeq;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.ui = { ...this.ui, toast: { id, text, undoCardId } };
    this.toastTimer = setTimeout(() => { if (this.ui.toast?.id === id) this.dismissToast(); }, this.toastMs);
    this.pruneDeleted();
    this.emit([{ kind: 'ui' }]);
  }

  dismissToast(): void {
    if (this.toastTimer) { clearTimeout(this.toastTimer); this.toastTimer = null; }
    if (!this.ui.toast) return;
    this.ui = { ...this.ui, toast: null };
    this.pruneDeleted();
    this.emit([{ kind: 'ui' }]);
  }

  /** Only the deletion the current toast can undo is kept. */
  private pruneDeleted(): void {
    const keep = this.ui.toast?.undoCardId ?? null;
    for (const k of [...this.deleted.keys()]) if (k !== keep) this.deleted.delete(k);
  }

  // ---- creates ----

  /** Resolves false when any of these cards has a create in flight that fails. */
  private async created(ids: (Id | null | undefined)[]): Promise<boolean> {
    const waits = ids.map((i) => (i ? this.pendingCards.get(i) : undefined)).filter((x): x is Promise<boolean> => !!x);
    if (!waits.length) return true;
    return (await Promise.all(waits)).every(Boolean);
  }

  private create(card: Card, run: () => Promise<Card>, ctx: ErrCtx, after?: Promise<boolean>): void {
    const id = card.id;
    this.cards.set(id, card);
    this.pinnedCards.add(id);
    this.markStale(this.affected(id));
    this.emit([{ kind: 'card', id, fields: ['created'] }]);
    const p = (async (): Promise<boolean> => {
      let res: Card;
      try {
        const deps = this.created([card.deskId, card.pileId, card.parentId]);
        if (after && !(await after.catch(() => false))) throw new Silent();
        if (!(await deps)) throw new Silent();
        res = await this.track(run());
      } catch (e) {
        const before = this.affected(id);
        this.cards.delete(id);
        this.pinnedCards.delete(id);
        this.files.delete(id); this.links.delete(id); this.intros.delete(id);
        const lid = `lin_${id}`;
        const lin = this.edges.delete(lid);
        this.pinnedEdges.delete(lid);
        this.markStale(before);
        this.emit([...(lin ? [{ kind: 'edge-removed', id: lid } as StoreChange] : []), { kind: 'card-removed', id }]);
        if (!(e instanceof Silent)) this.toast(errorText(e, ctx));
        return false;
      }
      const local = this.cards.get(id);
      if (!local) return true;
      const merged = this.ingest(res);
      this.put({ ...merged, x: local.x, y: local.y });
      return true;
    })();
    this.pendingCards.set(id, p);
    void p.then(() => { if (this.pendingCards.get(id) === p) this.pendingCards.delete(id); });
  }

  private blankSource(sourceType: SourceType, x: number, y: number, deskId: Id | null, status: Status, data: SourceData): Card {
    const t = nowIso();
    return {
      id: newId('c'), boardId: this.boardId, kind: 'source', sourceType, x, y, deskId, pileId: null, parentId: null,
      forkedFromMessageId: null, status, data, createdAt: t, updatedAt: t,
    };
  }

  createNote(i: { x: number; y: number; deskId: Id | null; text?: string; meta?: string }): Id {
    return this.makeNote(i);
  }

  private makeNote(i: { x: number; y: number; deskId: Id | null; text?: string; meta?: string }, after?: Promise<boolean>): Id {
    const data: SourceData = { text: i.text ?? '', meta: i.meta ?? 'Note · You' };
    const card = this.blankSource('note', i.x, i.y, i.deskId, 'ready', data);
    this.create(card, () => this.api.createCard(this.boardId, {
      id: card.id, kind: 'source', sourceType: 'note', x: i.x, y: i.y, deskId: i.deskId, status: 'ready', data,
    }), 'other', after);
    return card.id;
  }

  createSourceFromFile(file: File, at: [number, number], deskId: Id | null, intro: 'single' | 'multi', desc?: string): Id {
    return this.makeFile(file, at, deskId, intro, desc);
  }

  private makeFile(file: File, at: [number, number], deskId: Id | null, intro: 'single' | 'multi', desc?: string, after?: Promise<boolean>): Id {
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    const [type, status] = (file.name.includes('.') ? FILE_TYPES[ext] : undefined) ?? ['doc', 'processing'];
    const data: SourceData = {
      title: file.name, meta: `${TYPE_INFO[type].label} · ${sizeOf(file.size)}`,
      fileName: file.name, fileType: file.type || ext, fileSize: file.size, ...(desc ? { desc } : {}),
    };
    const card = this.blankSource(type, at[0], at[1], deskId, status, data);
    this.files.set(card.id, file);
    this.intros.set(card.id, intro);
    this.create(card, () => this.api.uploadFile(this.boardId, { id: card.id, file, x: at[0], y: at[1], deskId, desc }), 'file', after);
    return card.id;
  }

  createSourceFromLink(url: string, at: [number, number], deskId: Id | null): Id | null {
    return this.makeLink(url, at, deskId);
  }

  private makeLink(url: string, at: [number, number], deskId: Id | null, desc?: string, after?: Promise<boolean>): Id | null {
    let u: URL;
    try { u = new URL(url.trim()); } catch { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    const yt = host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be';
    const title = cut(host + u.pathname, 40);
    const data: SourceData = yt
      ? { url, title: 'YouTube video', meta: 'YouTube', ...(desc ? { desc } : {}) }
      : { url, title, meta: host, ...(desc ? { desc } : {}) };
    const card = this.blankSource(yt ? 'video' : 'web', at[0], at[1], deskId, yt ? 'soon' : 'processing', data);
    this.links.set(card.id, { url, desc });
    this.create(card, () => this.api.addLink(this.boardId, { id: card.id, url, x: at[0], y: at[1], deskId, desc }), 'link', after);
    return card.id;
  }

  retrySource(id: Id): void {
    const card = this.cards.get(id);
    if (!card) return;
    const file = this.files.get(id);
    const link = this.links.get(id);
    const d = card.data as SourceData;
    const url = link?.url ?? (card.sourceType === 'web' ? d.url : undefined);
    if (!file && !url) return;
    const at: [number, number] = [card.x, card.y];
    const intro = this.intros.get(id) ?? 'single';
    const desc = d.desc;
    const del = this.removeCard(id);
    if (file) this.makeFile(file, at, card.deskId, intro, desc, del);
    else if (url) this.makeLink(url, at, card.deskId, desc, del);
  }

  replaceWithNote(id: Id): Id {
    const card = this.cards.get(id);
    const at = { x: card?.x ?? 0, y: card?.y ?? 0, deskId: card?.deskId ?? null };
    const del = card ? this.removeCard(id) : undefined;
    return this.makeNote(at, del);
  }

  /** Removes a card locally at once and on the server; a failed delete brings it back. */
  /** `after`: the delete is sent only once this resolves true; on false the card comes back without a toast. */
  private removeCard(id: Id, after?: Promise<boolean>): Promise<boolean> {
    const card = this.cards.get(id);
    if (!card) return Promise.resolve(true);
    if (this.debounced.has(id)) this.flushDebounced(id);   // the pending text goes out before the delete
    const patches = this.patchQueue.get(id);
    const before = this.affected(id);
    const edges = [...this.edges.values()].filter((e) => e.from === id || e.to === id);
    this.cards.delete(id);
    this.pinnedCards.delete(id);
    this.hiddenCards.add(id);
    for (const e of edges) { this.edges.delete(e.id); this.hiddenEdges.add(e.id); }
    this.markStale(before);
    this.emit([...edges.map((e): StoreChange => ({ kind: 'edge-removed', id: e.id })), { kind: 'card-removed', id }]);
    return (async () => {
      try {
        const wait = this.pendingCards.get(id);
        if (wait) await wait;
        if (patches) await patches;
        if (after && !(await after)) throw new Silent();
        await this.track(this.api.deleteCard(this.boardId, id));
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return true;
        this.hiddenCards.delete(id);
        this.cards.set(id, card);
        for (const ed of edges) { this.hiddenEdges.delete(ed.id); this.edges.set(ed.id, ed); }
        this.markStale(this.affected(id));
        this.emit([{ kind: 'card', id, fields: ['created'] }, ...edges.map((ed): StoreChange => ({ kind: 'edge', id: ed.id }))]);
        if (!(e instanceof Silent)) this.toast(errorText(e, 'other'));
        return false;
      }
    })();
  }

  // ---- patches ----

  private static overrideOf(patch: CardPatch): CardOverride {
    const fields: CardOverride['fields'] = {};
    if (patch.deskId !== undefined) fields.deskId = patch.deskId;
    if (patch.pileId !== undefined) fields.pileId = patch.pileId;
    if (patch.status !== undefined) fields.status = patch.status;
    return { fields, data: { ...(patch.data ?? {}) } };
  }

  private affectsReads(card: Card, patch: CardPatch): boolean {
    if (patch.deskId !== undefined || patch.pileId !== undefined || patch.status !== undefined) return true;
    if (!patch.data) return false;
    if (card.kind === 'source') return true;
    return 'hide' in patch.data || 'inheritDesk' in patch.data;
  }

  patchCard(id: Id, patch: CardPatch): void {
    void this.patch(id, patch);
  }

  /** A note/doc text edit stamps data.textChangedAt in the same write: that is what "Source changed" compares. */
  private static stampText<T extends object>(card: Card, data: T): T {
    if (card.kind !== 'source' || (card.sourceType !== 'note' && card.sourceType !== 'doc') || !('text' in data)) return data;
    if ((data as { text?: unknown }).text === (card.data as SourceData).text) return data;
    return { ...data, textChangedAt: new Date().toISOString() };
  }

  private patch(id: Id, patch: CardPatch): Promise<boolean> {
    const card = this.cards.get(id);
    if (!card) return Promise.resolve(false);
    if (patch.data) patch = { ...patch, data: BoardStore.stampText(card, patch.data) };
    const o = BoardStore.overrideOf(patch);
    const tok = ++this.tokSeq;
    const reads = this.affectsReads(card, patch);
    const before = reads ? this.affected(id) : new Set<Id>();
    this.addOverride(id, tok, o);
    this.put(mergeCard(card, o));
    if (reads) this.markStale(new Set([...before, ...this.affected(id)]));
    return this.sendPatch(id, patch, tok);
  }

  /** One PATCH at a time per card, so the server can never apply an older value last. */
  private sendPatch(id: Id, patch: CardPatch, tok: number): Promise<boolean> {
    const prev = this.patchQueue.get(id);
    const p = prev ? prev.then(() => this.sendNow(id, patch, tok)) : this.sendNow(id, patch, tok);
    this.patchQueue.set(id, p);
    void p.then(() => { if (this.patchQueue.get(id) === p) this.patchQueue.delete(id); });
    return p;
  }

  private async sendNow(id: Id, patch: CardPatch, tok: number): Promise<boolean> {
    let res: Card | null = null;
    let err: unknown = null;
    try {
      if (!(await this.created([id, patch.deskId, patch.pileId]))) throw new Silent();
      res = await this.track(this.api.updateCard(this.boardId, id, patch));
    } catch (e) {
      err = e;
    }
    this.dropOverride(id, tok);
    const local = this.cards.get(id);
    if (!local) return !err;
    if (res) {
      this.put({ ...this.ingest(res), x: local.x, y: local.y });
      return true;
    }
    const base = this.lastServer.get(id);
    if (base) {
      const before = this.affected(id);
      this.put({ ...mergeCard(base, this.effective(id)), x: local.x, y: local.y });
      this.markStale(new Set([...before, ...this.affected(id)]));
    }
    if (!(err instanceof Silent)) this.toast(errorText(err, 'other'));
    return false;
  }

  patchDataDebounced(id: Id, data: Partial<SourceData> | Partial<ChatData>, ms = 500): void {
    const card = this.cards.get(id);
    if (!card || this.disposed) return;
    data = BoardStore.stampText(card, data);
    let d = this.debounced.get(id);
    if (!d) {
      d = { data: {}, tok: ++this.tokSeq, timer: setTimeout(() => undefined, 0) };
      clearTimeout(d.timer);
      this.debounced.set(id, d);
      this.addOverride(id, d.tok, { fields: {}, data: {} });
    }
    Object.assign(d.data, data);
    const entry = (this.overrides.get(id) ?? []).find((x) => x.tok === d!.tok);
    if (entry) entry.o = { fields: {}, data: { ...d.data } };
    this.put(mergeCard(card, { fields: {}, data: { ...data } }));
    clearTimeout(d.timer);
    d.timer = setTimeout(() => { if (!this.disposed) this.flushDebounced(id); }, ms);
  }

  private flushDebounced(id: Id): void {
    const d = this.debounced.get(id);
    if (!d) return;
    clearTimeout(d.timer);
    this.debounced.delete(id);
    const card = this.cards.get(id);
    if (card && this.affectsReads(card, { data: d.data })) this.markStale(this.affected(id));
    void this.sendPatch(id, { data: d.data as CardPatch['data'] }, d.tok);
  }

  setDesk(id: Id, deskId: Id | null): void {
    const ok = this.patch(id, { deskId });
    if (deskId) {
      for (const e of [...this.edges.values()]) if (e.kind === 'wire' && e.from === id && e.to === deskId) this.disconnect(e.id, ok);
    }
  }

  setExcerpt(id: Id, index: number, on: boolean): void {
    const d = this.cards.get(id)?.data as SourceData | undefined;
    if (!d?.excerpts?.[index]) return;
    this.patchCard(id, { data: { excerpts: d.excerpts.map((x, i) => (i === index ? { ...x, on } : x)) } });
  }

  setMemberOff(memberId: Id, off: boolean): void {
    this.patchCard(memberId, { data: { off } });
  }

  setHidden(chatId: Id, cardId: Id, hidden: boolean): void {
    const d = this.cards.get(chatId)?.data as ChatData | undefined;
    if (!d) return;
    const rest = (d.hide ?? []).filter((x) => x !== cardId);
    this.patchCard(chatId, { data: { hide: hidden ? [...rest, cardId] : rest } });
  }

  // ---- edges ----

  connect(kind: 'wire' | 'answer', from: Id, to: Id): Id | null {
    const f = this.cards.get(from);
    const g = this.graph();
    if (!f) return null;
    const ok = kind === 'wire'
      ? f.kind === 'source' && !f.pileId && canPlug(g, from, 'src', to)
      : f.kind === 'chat' && canPlug(g, from, 'chat', to);
    if (!ok) return null;
    const id = newId('e');
    const edge: Edge = { id, boardId: this.boardId, kind, from, to, createdAt: nowIso() };
    this.edges.set(id, edge);
    this.pinnedEdges.add(id);
    this.markStale(this.chatAndDesc(to));
    this.emit([{ kind: 'edge', id }]);
    const p = (async (): Promise<boolean> => {
      try {
        const waits = [this.pendingCards.get(from), this.pendingCards.get(to)].filter((x): x is Promise<boolean> => !!x);
        if (waits.length && !(await Promise.all(waits)).every(Boolean)) throw new Silent();
        const res = await this.track(this.api.createEdge(this.boardId, { id, kind, from, to }));
        if (this.edges.has(id)) {
          const old = this.edges.get(id)!;
          this.edges.set(id, res);
          if (!deepEqual(old, res)) this.emit([{ kind: 'edge', id }]);
        }
        return true;
      } catch (e) {
        if (this.edges.delete(id)) {
          this.pinnedEdges.delete(id);
          this.markStale(this.chatAndDesc(to));
          this.emit([{ kind: 'edge-removed', id }]);
        }
        if (!(e instanceof Silent)) this.toast(errorText(e, 'edge'));
        return false;
      }
    })();
    this.pendingEdges.set(id, p);
    void p.then(() => { if (this.pendingEdges.get(id) === p) this.pendingEdges.delete(id); });
    return id;
  }

  /** `after`: the delete is sent only once this resolves true; on false the edge comes back without a toast. */
  disconnect(edgeId: Id, after?: Promise<boolean>): void {
    const e = this.edges.get(edgeId);
    if (!e || e.kind === 'lineage') return;
    this.edges.delete(edgeId);
    this.pinnedEdges.delete(edgeId);
    this.hiddenEdges.add(edgeId);
    this.markStale(this.chatAndDesc(e.to));
    this.emit([{ kind: 'edge-removed', id: edgeId }]);
    void (async () => {
      try {
        const wait = this.pendingEdges.get(edgeId);
        if (wait && !(await wait)) return;
        if (after && !(await after)) throw new Silent();
        await this.track(this.api.deleteEdge(this.boardId, edgeId));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return;
        this.hiddenEdges.delete(edgeId);
        this.edges.set(edgeId, e);
        this.markStale(this.chatAndDesc(e.to));
        this.emit([{ kind: 'edge', id: edgeId }]);
        if (!(err instanceof Silent)) this.toast(errorText(err, 'other'));
      }
    })();
  }

  // ---- piles ----

  private moveWires(memberId: Id, pileId: Id): void {
    for (const e of [...this.edges.values()]) {
      if (e.kind !== 'wire' || e.from !== memberId) continue;
      this.connect('wire', pileId, e.to);   // null when the pile already reaches that chat, or it is the pile's own desk
      this.disconnect(e.id);
    }
  }

  /** Source onto source makes a pile; either side may itself be a pile (members merge, the prototype's asMembers). */
  makePile(srcId: Id, targetId: Id, at: [number, number]): Id {
    const src = this.cards.get(srcId);
    const target = this.cards.get(targetId);
    if (!src || !target || srcId === targetId) return targetId;
    const srcPile = src.sourceType === 'pile';
    const joining = srcPile ? membersOf(this.graph(), srcId) : [src];
    let pileId = targetId;
    let members = joining;
    if (target.sourceType !== 'pile') {
      const same = src.sourceType === target.sourceType;
      const title = same ? `${TYPE_INFO[target.sourceType ?? 'pdf'].label} pile` : 'Mixed pile';
      members = [target, ...joining];
      const data: SourceData = { title, meta: `${members.length} files` };
      const pile = this.blankSource('pile', at[0], at[1], target.deskId, 'ready', data);
      pileId = pile.id;
      this.create(pile, () => this.api.createCard(this.boardId, {
        id: pile.id, kind: 'source', sourceType: 'pile', x: at[0], y: at[1], deskId: target.deskId, status: 'ready', data,
      }), 'other');
    }
    const moves: Promise<boolean>[] = [];
    if (target.sourceType === 'pile') {
      const have = new Set(membersOf(this.graph(), targetId).map((m) => m.id));
      const total = have.size + joining.filter((m) => !have.has(m.id)).length;
      const meta = `${total} files`;
      if ((target.data as SourceData).meta !== meta) this.patchCard(targetId, { data: { meta } });
    }
    for (const m of members) {
      moves.push(this.patch(m.id, { pileId, deskId: null }));
      this.moveWires(m.id, pileId);
    }
    if (srcPile) {
      this.moveWires(srcId, pileId);
      void this.removeCard(srcId, Promise.all(moves).then((r) => r.every(Boolean)));
    }
    return pileId;
  }

  unstack(pileId: Id, spots: [number, number][]): Id[] {
    const pile = this.cards.get(pileId);
    if (!pile) return [];
    const members = membersOf(this.graph(), pileId);
    const wires = [...this.edges.values()].filter((e) => e.kind === 'wire' && e.from === pileId);
    const moved: { id: Id; x: number; y: number }[] = [];
    const ops: Promise<boolean>[] = [];
    members.forEach((m, i) => {
      const [x, y] = spots[i] ?? [m.x, m.y];
      this.put({ ...m, x, y });
      moved.push({ id: m.id, x, y });
      ops.push(this.patch(m.id, { pileId: null, deskId: pile.deskId }));
    });
    const added: Id[] = [];
    for (const e of wires) for (const m of members) { const id = this.connect('wire', m.id, e.to); if (id) added.push(id); }

    const gone = [...this.edges.values()].filter((e) => e.kind !== 'lineage' && (e.from === pileId || e.to === pileId));
    const before = this.affected(pileId);
    this.cards.delete(pileId);
    this.pinnedCards.delete(pileId);
    this.hiddenCards.add(pileId);
    for (const e of gone) { this.edges.delete(e.id); this.hiddenEdges.add(e.id); this.pinnedEdges.delete(e.id); }
    this.markStale(before);
    this.emit([...gone.map((e): StoreChange => ({ kind: 'edge-removed', id: e.id })), { kind: 'card-removed', id: pileId }]);
    this.savePositions(moved);

    const restore = (err: unknown, okIds: Id[]): void => {
      this.hiddenCards.delete(pileId);
      this.cards.set(pileId, pile);
      for (const e of gone) { this.hiddenEdges.delete(e.id); this.edges.set(e.id, e); }
      for (const id of added) this.disconnect(id);
      for (const id of okIds) {
        const m = members.find((x) => x.id === id)!;
        void this.patch(id, { pileId, deskId: m.deskId });
      }
      this.savePositions(members.map((m) => ({ id: m.id, x: m.x, y: m.y })));
      this.markStale(this.affected(pileId));
      this.emit([{ kind: 'card', id: pileId, fields: ['created'] }, ...gone.map((e): StoreChange => ({ kind: 'edge', id: e.id }))]);
      if (!(err instanceof Silent)) this.toast(errorText(err, 'other'));
    };
    void (async () => {
      const results = await Promise.all(ops);
      if (!results.every(Boolean)) {
        restore(new Silent(), members.filter((_, i) => results[i]).map((m) => m.id));
        return;
      }
      try {
        const wait = this.pendingCards.get(pileId);
        if (wait) await wait;
        await this.track(this.api.deleteCard(this.boardId, pileId));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return;
        restore(err, members.map((m) => m.id));
      }
    })();
    return members.map((m) => m.id);
  }

  // ---- positions, viewport, title ----

  savePositions(p: { id: Id; x: number; y: number }[]): void {
    const live = p.filter((q) => this.cards.has(q.id));
    for (const q of live) {
      const c = this.cards.get(q.id)!;
      if (c.x !== q.x || c.y !== q.y) this.cards.set(q.id, { ...c, x: q.x, y: q.y });
    }
    this.snap = null;   // no change event: the engine already shows these positions
    if (!live.length) return;
    void (async () => {
      const waits = live.map((q) => this.pendingCards.get(q.id)).filter((x): x is Promise<boolean> => !!x);
      if (waits.length) await Promise.all(waits);
      const ready = live.filter((q) => this.cards.has(q.id));
      for (let i = 0; i < ready.length; i += 200) {
        try { await this.track(this.api.savePositions(this.boardId, ready.slice(i, i + 200))); }
        catch (e) {
          // back to the last server copy, silently: the engine still shows the move, so isDirty/collectMoved re-send it on the next settle
          for (const q of ready.slice(i, i + 200)) {
            const cur = this.cards.get(q.id), srv = this.lastServer.get(q.id);
            if (cur && srv && cur.x === q.x && cur.y === q.y) this.cards.set(q.id, { ...cur, x: srv.x, y: srv.y });
          }
          this.snap = null;
          this.toast(errorText(e, 'other'));
        }
      }
    })();
  }

  saveViewport(v: { x: number; y: number; zoom: number }): void {
    if (this.board) this.board = { ...this.board, viewport: v };
    this.snap = null;
    void this.track(this.api.updateBoard(this.boardId, { viewport: v })).catch(() => undefined);
  }

  renameBoard(title: string): void {
    if (!this.board) return;
    const prev = this.board.title;
    this.board = { ...this.board, title };
    this.pendingTitle = title;
    this.emit([{ kind: 'board' }]);
    void (async () => {
      try {
        await this.track(this.api.updateBoard(this.boardId, { title }));
        // The latch only guards against stale snapshots while the rename settles; after that the server's title wins.
        if (this.titleTimer) clearTimeout(this.titleTimer);
        this.titleTimer = setTimeout(() => {
          this.titleTimer = null;
          if (this.pendingTitle === title) this.pendingTitle = null;
        }, TITLE_LATCH_MS);
      } catch (e) {
        if (this.board && this.pendingTitle === title) {
          this.board = { ...this.board, title: prev };
          this.emit([{ kind: 'board' }]);
        }
        this.toast(errorText(e, 'other'));
        if (this.pendingTitle === title) this.pendingTitle = null;
      }
    })();
  }

  // ---- UI state ----

  private setUi(p: Partial<UiState>): void {
    this.ui = { ...this.ui, ...p };
    this.emit([{ kind: 'ui' }]);
  }

  select(id: Id | null): void { if (this.ui.selected !== id) this.setUi({ selected: id }); }
  openViewer(cardId: Id, memberId: Id | null = null, anchor: DOMRect | null = null): void { this.setUi({ viewer: { cardId, memberId, anchor } }); }
  closeViewer(): void { if (this.ui.viewer) this.setUi({ viewer: null }); }
  openFocus(id: Id): void { this.setUi({ focus: id }); }
  closeFocus(): void { if (this.ui.focus) this.setUi({ focus: null }); }
  openCompare(id: Id): void { this.setUi({ compare: id }); }
  closeCompare(): void { if (this.ui.compare) this.setUi({ compare: null }); }
  /** The welcome tour sits above everything, so anything else that was open closes. */
  openTour(): void { if (!this.ui.tour) this.setUi({ tour: true, menu: null, linkPop: null }); }
  closeTour(): void { if (this.ui.tour) this.setUi({ tour: false }); }
  openMenu(m: UiState['menu']): void { this.setUi({ menu: m, linkPop: null }); }
  closeMenu(): void { if (this.ui.menu) this.setUi({ menu: null }); }
  openLinkPop(p: UiState['linkPop']): void { this.setUi({ linkPop: p, menu: null }); }
  closeLinkPop(): void { if (this.ui.linkPop) this.setUi({ linkPop: null }); }
  setDropping(on: boolean): void { if (this.ui.dropping !== on) this.setUi({ dropping: on }); }
  setWebSearch(chatId: Id, on: boolean): void { this.setUi({ webSearch: { ...this.ui.webSearch, [chatId]: on } }); }

  // ---- branch dialog ----

  openDialog(o: {
    mode: DialogState['mode']; parentId?: Id | null; chatId?: Id | null; at?: [number, number] | null;
    anchor?: DOMRect | null; first?: string; forkedFromMessageId?: Id | null; carry?: Carry; noForkPoint?: boolean;
  }): void {
    const chat = o.mode === 'edit' && o.chatId ? this.cards.get(o.chatId) : undefined;
    if (o.mode === 'edit' && chat?.kind !== 'chat') return;
    const parentId = o.mode === 'root' ? null : o.mode === 'edit' ? chat!.parentId : o.parentId ?? null;
    const parent = parentId ? this.cards.get(parentId) : undefined;
    const base = chat ? (chat.data as ChatData) : null;
    const draft: BranchDraft = {
      name: base ? base.name : o.mode === 'root' ? 'A new question' : 'New question, same desk',
      first: o.first ?? '',
      model: base?.model ?? (parent?.kind === 'chat' ? (parent.data as ChatData).model : MODELS[DEFAULT_MODEL_KEY].engineId),
      persona: base?.persona ?? 'none',
      personaText: base?.systemPrompt ?? '',
      inheritDesk: base?.inheritDesk ?? true,
      carry: o.carry ?? base?.carry ?? 'summary',
      advanced: { ...(base?.advanced ?? DEFAULT_ADVANCED) },
      advOpen: false,
      ...(o.noForkPoint ? { noForkPoint: true } : {}),
    };
    if (o.mode === 'branch' && parent?.kind === 'chat' && !(this.messages.get(parent.id)?.length) && (parent.messageCount ?? 0) > 0) {
      const pid = parent.id;   // the fork point is the parent's last message: load it if the list is missing
      void this.api.getMessages(this.boardId, pid).then((msgs) => {
        if (this.disposed || this.messages.get(pid)?.length) return;
        this.messages.set(pid, msgs);
        this.emit([{ kind: 'messages', chatId: pid }]);
      }, () => undefined);
    }
    this.setUi({
      menu: null, linkPop: null,
      dialog: {
        mode: o.mode, parentId, chatId: chat ? chat.id : null, at: o.at ?? null, anchor: o.anchor ?? null,
        forkedFromMessageId: o.forkedFromMessageId ?? null, draft,
      },
    });
  }

  setDraft(patch: Partial<BranchDraft>): void {
    const d = this.ui.dialog;
    if (!d) return;
    this.setUi({ dialog: { ...d, draft: { ...d.draft, ...patch } } });
  }

  closeDialog(): void { if (this.ui.dialog) this.setUi({ dialog: null }); }

  /** edit: patches the chat; branch/root: creates a chat at `spot`. Returns the chat's id, or null with no dialog open. */
  confirmDialog(spot: [number, number] | null): Id | null {
    const d = this.ui.dialog;
    if (!d) return null;
    const dr = d.draft;
    const text = dr.personaText.trim();
    const preset = (PERSONAS as Record<string, { text: string }>)[dr.persona];
    const persona = preset && preset.text === text ? dr.persona : text ? 'custom' : 'none';
    const fields = {
      name: dr.name.trim() || 'Untitled', model: dr.model, persona, systemPrompt: text,
      inheritDesk: dr.inheritDesk, carry: dr.carry, advanced: { ...dr.advanced },
    };
    this.setUi({ dialog: null });
    if (d.mode === 'edit') {
      if (!d.chatId || !this.cards.has(d.chatId)) return null;
      this.patchCard(d.chatId, { data: fields });
      return d.chatId;
    }
    const parent = d.parentId ? this.cards.get(d.parentId) : undefined;
    const at: [number, number] = spot ?? d.at ?? (parent ? [parent.x + 528, parent.y + 160] : [0, 0]);
    const lastMsg = d.parentId ? this.messages.get(d.parentId)?.at(-1)?.id ?? null : null;
    return this.createChat({
      parentId: d.parentId, x: at[0], y: at[1], forkedFromMessageId: d.forkedFromMessageId ?? (dr.carry === 'fresh' || dr.noForkPoint ? null : lastMsg),
      data: { ...fields, hide: [] },
    });
  }

  createChat(i: { parentId: Id | null; x: number; y: number; data: ChatData; forkedFromMessageId: Id | null }): Id {
    const t = nowIso();
    const card: Card = {
      id: newId('c'), boardId: this.boardId, kind: 'chat', sourceType: null, x: i.x, y: i.y, deskId: null, pileId: null,
      parentId: i.parentId, forkedFromMessageId: i.forkedFromMessageId, status: null, data: i.data,
      createdAt: t, updatedAt: t, messageCount: 0, lastMessage: null,
    };
    this.messages.set(card.id, []);
    if (i.parentId) {
      const lid = `lin_${card.id}`;   // the server names it the same, so its snapshot reconciles by id
      this.edges.set(lid, { id: lid, boardId: this.boardId, kind: 'lineage', from: i.parentId, to: card.id, createdAt: t });
      this.pinnedEdges.add(lid);
    }
    this.create(card, () => this.api.createCard(this.boardId, {
      id: card.id, kind: 'chat', x: i.x, y: i.y, parentId: i.parentId, forkedFromMessageId: i.forkedFromMessageId, data: i.data,
    }), 'other');
    if (i.parentId) this.emit([{ kind: 'edge', id: `lin_${card.id}` }]);
    return card.id;
  }

  // ---- compare / promote ----

  setDemoted(id: Id, demoted: boolean): void {
    if (this.cards.get(id)?.kind === 'chat') this.patchCard(id, { data: { demoted } });
  }

  promote(winnerId: Id): void {
    const w = this.cards.get(winnerId);
    if (!w || w.kind !== 'chat') return;
    const sibs = w.parentId ? chatsOf(this.graph()).filter((c) => c.parentId === w.parentId && c.id !== winnerId) : [];
    const label = qNum(this.graph(), winnerId);
    this.setDemoted(winnerId, false);
    for (const c of sibs) this.setDemoted(c.id, true);
    this.ui = { ...this.ui, compare: null };
    this.toast(sibs.length ? `Kept ${label} · ${sibs.length} ${sibs.length === 1 ? 'sibling' : 'siblings'} folded` : `Kept ${label}`);
  }

  // ---- send / stream ----

  /** True while an answer is on its way; a kept error does not count, so the composer is free again. */
  isStreaming(chatId: Id): boolean {
    const s = this.streams.get(chatId);
    return !!s && !s.error;
  }

  async send(chatId: Id, text: string): Promise<void> {
    const msg = text.trim();
    const card = this.cards.get(chatId);
    if (!msg || !card || card.kind !== 'chat' || this.isStreaming(chatId) || this.disposed) return;
    const messageId = genMessageId();
    const ctrl = new AbortController();
    const list = this.messages.get(chatId) ?? [];
    const fresh = !(card.messageCount ?? 0);   // server-synced count: a failed first send leaves it 0, so a retry stays fresh
    this.messages.set(chatId, [...list, { id: `${messageId}_u`, role: 'user', content: msg, position: list.length, createdAt: nowIso() }]);
    this.streams.set(chatId, { messageId, text: '', web: null, error: null });
    this.aborts.set(chatId, ctrl);
    this.emit([{ kind: 'messages', chatId }, { kind: 'stream', chatId }]);

    const mine = () => this.streams.get(chatId)?.messageId === messageId;
    const update = (p: Partial<{ text: string; web: { title?: string; url?: string }[] | null; error: string | null }>) => {
      const cur = this.streams.get(chatId);
      if (!cur || cur.messageId !== messageId || ctrl.signal.aborted) return;
      this.streams.set(chatId, { ...cur, ...p });
      this.emit([{ kind: 'stream', chatId }]);
    };
    const finish = () => { if (this.aborts.get(chatId) === ctrl) this.aborts.delete(chatId); };
    const dropUser = () => {   // a failed send shows an error; the retry sends the text again
      const cur = this.messages.get(chatId);
      if (cur) { this.messages.set(chatId, cur.filter((x) => x.id !== `${messageId}_u`)); this.emit([{ kind: 'messages', chatId }]); }
    };
    const syncMessages = async (): Promise<Message[] | null> => {
      try { return await this.api.getMessages(this.boardId, chatId); } catch { return null; }
    };

    let errored = false;
    try {
      if (!(await this.created([chatId]))) throw new Silent();
      const cur = this.cards.get(chatId);
      if (!cur || ctrl.signal.aborted) throw new Silent();
      const d = cur.data as ChatData;
      const a = d.advanced;
      const req: ChatRequest = {
        boardId: this.boardId, chatId, messageId, message: msg, model: d.model, systemPrompt: d.systemPrompt,
        temperature: a.temperature, maxOutputTokens: a.maxOutputTokens,
        lastKMessages: a.historyMode === 'lastK' ? a.lastKMessages : null,
        externalContextTopK: a.externalContextTopK, webSearch: !!this.ui.webSearch[chatId],
        ...(fresh && cur.parentId ? { parentNodeId: cur.parentId } : {}),
        ...(fresh && cur.forkedFromMessageId ? { forkedFromMessageId: cur.forkedFromMessageId } : {}),
      };
      await this.api.streamChat(req, (e) => {
        if (e.type === 'delta') update({ text: (this.streams.get(chatId)?.text ?? '') + e.text });
        else if (e.type === 'web') update({ web: e.results });
        else if (e.type === 'error') { errored = true; update({ error: e.message }); }
      }, ctrl.signal);
    } catch (e) {
      finish();
      if (!mine()) return;
      if (e instanceof Silent || ctrl.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) {
        this.streams.delete(chatId);
        this.emit([{ kind: 'stream', chatId }]);
        if (!(e instanceof Silent) && this.cards.has(chatId)) {
          const msgs = await syncMessages();   // the server keeps the question of a stopped stream
          if (msgs && !this.disposed && this.cards.has(chatId) && !this.streams.has(chatId)) {
            this.messages.set(chatId, msgs);
            this.emit([{ kind: 'messages', chatId }]);
          }
        }
        return;
      }
      dropUser();
      update({ error: e instanceof Error && e.message ? e.message : 'Something went wrong. Try again.' });
      return;
    }
    finish();
    if (!mine() || this.disposed) return;
    if (errored) { dropUser(); return; }

    const cur = this.streams.get(chatId)!;
    const known = this.messages.get(chatId) ?? [];
    const msgs = (await syncMessages())
      ?? [...known, { id: `${messageId}_a`, role: 'assistant' as const, content: cur.text, position: known.length, createdAt: nowIso() }];
    if (!mine()) return;
    this.streams.delete(chatId);
    if (!this.cards.has(chatId)) { this.emit([{ kind: 'stream', chatId }]); return; }
    this.messages.set(chatId, msgs);
    this.emit([{ kind: 'messages', chatId }, { kind: 'stream', chatId }]);
    const c = this.cards.get(chatId);
    const last = msgs.at(-1);
    if (c) this.put({ ...c, messageCount: msgs.length, lastMessage: last ? { role: last.role, content: last.content.slice(0, 280) } : null });
  }

  stop(chatId: Id): void {
    const a = this.aborts.get(chatId);
    if (a) { a.abort(); return; }
    if (this.streams.delete(chatId)) this.emit([{ kind: 'stream', chatId }]);   // clears a kept error
  }

  // ---- delete and undo ----

  setViewProbe(p: ViewProbe | null): void { this.probe = p; }

  requestDelete(id: Id): void {
    const card = this.cards.get(id);
    if (!card) return;
    if (card.sourceType === 'pile') {
      const ms = membersOf(this.graph(), id);
      if (ms.length) {
        const front = ms[(this.probe?.front(id) ?? 0) % ms.length];
        const text = `Delete the pile "${nameOf(this.graph(), card)}"?`;
        this.setUi({ confirm: { cardId: id, text, pile: { frontId: front.id, front: nameOf(this.graph(), front), count: ms.length } } });
        return;
      }
    }
    if (card.kind !== 'chat') { void this.deleteSet(id); return; }
    const g = this.graph();
    const n = descendants(g, id).length;
    const q = qNum(g, id);
    const text = n
      ? `Delete ${q} and its ${n} ${n === 1 ? 'branch' : 'branches'}? Sources on their desks stay on the board.`
      : `Delete ${q}? Sources on its desk stay on the board.`;
    this.setUi({ confirm: { cardId: id, text } });
  }

  cancelConfirm(): void { if (this.ui.confirm) this.setUi({ confirm: null }); }

  /** `mode` only matters for a pile: its front member alone (the default), or the pile and every member. */
  async confirmDelete(mode: 'one' | 'all' = 'one'): Promise<void> {
    const c = this.ui.confirm;
    if (!c) return;
    this.ui = { ...this.ui, confirm: null };
    if (!c.pile) { await this.deleteSet(c.cardId); return; }
    if (mode === 'all') { await this.deleteSet(c.cardId, membersOf(this.graph(), c.cardId).map((m) => m.id)); return; }
    const pile = this.cards.get(c.cardId);
    if (pile && c.pile.count <= 2) {   // one would be left alone in a pile: unpile first, then remove the front member
      const ms = membersOf(this.graph(), c.cardId);
      const spots = ms.map((m): [number, number] => (m.id === c.pile!.frontId ? [pile.x + 24, pile.y + 96] : [pile.x, pile.y]));
      this.unstack(c.cardId, spots);
    }
    await this.deleteSet(c.pile.frontId);
  }

  /**
   * Hides the set at once, then tells the server; a failed delete brings everything back.
   * `extra`: more cards removed with the root (a pile's members), each deleted on the server before the root.
   */
  private deleteSet(root: Id, extra: Id[] = []): Promise<boolean> {
    const card = this.cards.get(root);
    if (!card) return Promise.resolve(false);
    const g = this.graph();
    const isChat = card.kind === 'chat';
    const kidsOf = isChat ? descendants(g, root) : [];
    const label = isChat ? qNum(g, root) : nameOf(g, card);
    const text = !isChat ? (extra.length ? `Removed ${label} and its ${extra.length} ${extra.length === 1 ? 'file' : 'files'}` : `Removed ${label}`)
      : kidsOf.length ? `Deleted ${label} and ${kidsOf.length} ${kidsOf.length === 1 ? 'branch' : 'branches'}` : `Deleted ${label}`;
    const ids = [root, ...kidsOf.map((c) => c.id), ...extra.filter((e) => this.cards.has(e))];
    const gone = new Set(ids);
    // Pending writes go out first: a note's debounced text, and a card dragged a moment ago whose spot is not saved yet.
    for (const i of ids) if (this.debounced.has(i)) this.flushDebounced(i);
    const moved: { id: Id; x: number; y: number }[] = [];
    const originals = ids.map((i) => {
      const c = this.cards.get(i)!;
      const p = this.probe?.pos(i);
      if (!p || (c.x === p[0] && c.y === p[1])) return c;
      moved.push({ id: i, x: p[0], y: p[1] });
      return { ...c, x: p[0], y: p[1] };
    });
    const patches = ids.map((i) => this.patchQueue.get(i)).filter((x): x is Promise<boolean> => !!x);
    const edges = [...this.edges.values()].filter((e) => gone.has(e.from) || gone.has(e.to));
    const detach = [...this.cards.values()].filter((c) => c.kind === 'source' && !gone.has(c.id)
      && ((c.deskId && gone.has(c.deskId)) || (c.pileId && gone.has(c.pileId))));
    const before = new Set<Id>();
    for (const i of ids) for (const a of this.affected(i)) before.add(a);

    // Sources on a deleted desk and members of a deleted pile stay on the board, detached.
    const toks: { id: Id; tok: number }[] = [];
    for (const c of detach) {
      const fields: CardOverride['fields'] = {};
      if (c.deskId && gone.has(c.deskId)) fields.deskId = null;
      if (c.pileId && gone.has(c.pileId)) fields.pileId = null;
      const o: CardOverride = { fields, data: {} };
      const tok = ++this.tokSeq;
      this.addOverride(c.id, tok, o);
      toks.push({ id: c.id, tok });
      this.put(mergeCard(c, o));
    }
    const streamed: Id[] = [];
    for (const i of ids) {
      this.cards.delete(i); this.pinnedCards.delete(i); this.hiddenCards.add(i);
      this.aborts.get(i)?.abort();
      if (this.streams.delete(i)) streamed.push(i);
    }
    for (const e of edges) { this.edges.delete(e.id); this.pinnedEdges.delete(e.id); this.hiddenEdges.add(e.id); }
    const ui: Partial<UiState> = {};
    if (this.ui.selected && gone.has(this.ui.selected)) ui.selected = null;
    if (this.ui.viewer && gone.has(this.ui.viewer.cardId)) ui.viewer = null;
    if (this.ui.focus && gone.has(this.ui.focus)) ui.focus = null;
    if (this.ui.compare && gone.has(this.ui.compare)) ui.compare = null;
    this.ui = { ...this.ui, ...ui };
    this.markStale(before);
    this.emit([
      ...edges.map((e): StoreChange => ({ kind: 'edge-removed', id: e.id })),
      ...ids.map((id): StoreChange => ({ kind: 'card-removed', id })),
      ...streamed.map((chatId): StoreChange => ({ kind: 'stream', chatId })),
      { kind: 'ui' },
    ]);
    this.toast(text, root);

    const roots = [...extra.filter((e) => gone.has(e)), root];   // members first: the pile is deleted last
    const dropOverrides = () => { for (const t of toks) this.dropOverride(t.id, t.tok); };
    const done = (async (): Promise<boolean> => {
      const sent: Id[] = [];
      try {
        if (patches.length) await Promise.all(patches);
        if (!(await this.created(ids))) { dropOverrides(); return false; }
        if (moved.length) { try { await this.track(this.api.savePositions(this.boardId, moved)); } catch { /* the delete still goes ahead */ } }
        for (const r of roots) {
          try { await this.track(this.api.deleteCard(this.boardId, r)); }
          catch (e) { if (!(e instanceof ApiError && e.status === 404)) throw e; }
          sent.push(r);
        }
        dropOverrides();
        return true;
      } catch (e) {
        dropOverrides();
        for (const r of sent) { try { await this.track(this.api.restoreCard(this.boardId, r)); } catch { /* the next snapshot shows what the server has */ } }
        for (const c of originals) { this.hiddenCards.delete(c.id); this.cards.set(c.id, c); }
        for (const ed of edges) { this.hiddenEdges.delete(ed.id); this.edges.set(ed.id, ed); }
        for (const c of detach) {
          const cur = this.cards.get(c.id);
          if (cur) this.cards.set(c.id, { ...cur, deskId: c.deskId, pileId: c.pileId });
        }
        this.deleted.delete(root);
        const after = new Set<Id>(before);
        for (const i of ids) for (const a of this.affected(i)) after.add(a);
        this.markStale(after);
        this.emit([
          ...ids.map((id): StoreChange => ({ kind: 'card', id, fields: ['created'] })),
          ...detach.map((c): StoreChange => ({ kind: 'card', id: c.id, fields: ['deskId', 'pileId'] })),
          ...edges.map((ed): StoreChange => ({ kind: 'edge', id: ed.id })),
        ]);
        this.toast(errorText(e, 'other'));
        return false;
      }
    })();
    this.deleted.set(root, { ids, roots, edges, done });
    return done;
  }

  async undo(): Promise<void> {
    const id = this.ui.toast?.undoCardId;
    if (!id) return;
    const rec = this.deleted.get(id);
    this.dismissToast();
    if (!rec || !(await rec.done)) return;
    const restored: Id[] = [];
    try {
      for (const r of [id, ...rec.roots.filter((x) => x !== id)]) restored.push(...await this.track(this.api.restoreCard(this.boardId, r)));
    } catch (e) {
      this.toast(errorText(e, 'other'));
      if (!restored.length) return;
    }
    this.deleted.delete(id);
    for (const x of restored) this.hiddenCards.delete(x);
    const back = new Set(restored);
    for (const e of rec.edges) {
      const alive = (x: Id) => back.has(x) || this.cards.has(x);
      if (alive(e.from) && alive(e.to)) this.hiddenEdges.delete(e.id);
    }
    if (this.refreshing) await this.refreshing;   // an older in-flight snapshot would not show the restore
    await this.refresh();
  }

  // ---- small queries ----

  fileUrl(cardId: Id): string | null {
    return this.api.rawFileUrl(cardId);
  }

  intro(id: Id): 'single' | 'multi' | null {
    return this.intros.get(id) ?? null;
  }

  clearIntro(id: Id): void {
    this.intros.delete(id);
  }

  dispose(): void {
    for (const id of [...this.debounced.keys()]) this.flushDebounced(id);
    this.disposed = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.readsTimer) clearTimeout(this.readsTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.titleTimer) clearTimeout(this.titleTimer);
    for (const a of this.aborts.values()) a.abort();
    this.pollTimer = this.readsTimer = this.toastTimer = this.titleTimer = null;
    this.changeListeners.clear();
    this.subscribers.clear();
  }
}
