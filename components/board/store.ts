import { ApiError } from './api/types';
import type {
  AdvancedSettings, Board, Card, CardPatch, Carry, ChatData, Edge, EngineApi, Id, Message, Reads, SourceData, SourceType, Status,
} from './api/types';
import { newId } from './api/ids';
import { TYPE_INFO } from './lib/catalog';
import { sizeOf } from './lib/format';
import { canPlug, chatsOf, descendants, membersOf, type Graph } from './lib/graph';
import { deepEqual, mergeCard, reconcile, changedFields, type CardOverride } from './lib/merge';
import { computeReads } from './lib/reads';

// ---- public types ----

export type StoreChange =
  | { kind: 'card'; id: Id; fields: string[] } | { kind: 'card-removed'; id: Id }
  | { kind: 'edge'; id: Id } | { kind: 'edge-removed'; id: Id }
  | { kind: 'messages'; chatId: Id } | { kind: 'stream'; chatId: Id } | { kind: 'reads'; chatId: Id }
  | { kind: 'ui' } | { kind: 'board' };

export interface BranchDraft { name: string; first: string; model: string /* engine id */; persona: string; personaText: string;
  inheritDesk: boolean; carry: Carry; advanced: AdvancedSettings; advOpen: boolean }
export interface DialogState { mode: 'branch' | 'root' | 'edit'; parentId: Id | null; chatId: Id | null;
  at: [number, number] | null; anchor: DOMRect | null; forkedFromMessageId: Id | null; draft: BranchDraft }
export interface UiState { selected: Id | null; dialog: DialogState | null;
  viewer: { cardId: Id; memberId: Id | null; anchor: DOMRect | null } | null; focus: Id | null;
  menu: { x: number; y: number; at: [number, number] | null; fromAdd: boolean } | null;
  linkPop: { x: number; y: number; at: [number, number] | null } | null;
  confirm: { cardId: Id; text: string } | null;
  toast: { id: number; text: string; undoCardId: Id | null } | null;
  compare: Id | null; dropping: boolean; webSearch: Readonly<Record<Id, boolean>> }

export interface BoardSnapshot { version: number; status: 'loading' | 'ready' | 'error'; error: string | null;
  board: { id: Id; title: string; viewport: Board['viewport'] } | null;
  cards: ReadonlyMap<Id, Card>; edges: ReadonlyMap<Id, Edge>; messages: ReadonlyMap<Id, Message[]>;
  streaming: ReadonlyMap<Id, { messageId: string; text: string; web: { title?: string; url?: string }[] | null; error: string | null }>;
  ui: UiState }

export interface StoreOptions { pollMs?: number; readsDebounceMs?: number; toastMs?: number }

// ---- helpers ----

const initialUi = (): UiState => ({
  selected: null, dialog: null, viewer: null, focus: null, menu: null, linkPop: null, confirm: null, toast: null,
  compare: null, dropping: false, webSearch: {},
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
        streaming: new Map(), ui: this.ui,
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

  /** Per-entity reconcile of a fetched snapshot. Never a whole replace. */
  applyBoard(board: Board, initial = false): void {
    const changes: StoreChange[] = [];
    if (!this.board) {
      this.board = { id: board.id, title: board.title, viewport: board.viewport };
      changes.push({ kind: 'board' });
    } else if (this.pendingTitle === null && this.board.title !== board.title) {
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
    if (known && s.updatedAt < known.updatedAt) {
      src = known;
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
    const id = ++this.toastSeq;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.ui = { ...this.ui, toast: { id, text, undoCardId } };
    this.toastTimer = setTimeout(() => { if (this.ui.toast?.id === id) this.dismissToast(); }, this.toastMs);
    this.emit([{ kind: 'ui' }]);
  }

  dismissToast(): void {
    if (this.toastTimer) { clearTimeout(this.toastTimer); this.toastTimer = null; }
    if (!this.ui.toast) return;
    this.ui = { ...this.ui, toast: null };
    this.emit([{ kind: 'ui' }]);
  }

  // ---- creates ----

  /** The create in flight for this card, if any: actions on the card await it first. */
  whenCreated(id: Id): Promise<boolean> | null {
    return this.pendingCards.get(id) ?? null;
  }

  private create(card: Card, run: () => Promise<Card>, ctx: ErrCtx, after?: Promise<unknown>): void {
    const id = card.id;
    this.cards.set(id, card);
    this.pinnedCards.add(id);
    this.markStale(this.affected(id));
    this.emit([{ kind: 'card', id, fields: ['created'] }]);
    const p = (async (): Promise<boolean> => {
      let res: Card;
      try {
        if (after) await after.catch(() => undefined);
        res = await this.track(run());
      } catch (e) {
        const before = this.affected(id);
        this.cards.delete(id);
        this.pinnedCards.delete(id);
        this.files.delete(id); this.links.delete(id); this.intros.delete(id);
        this.markStale(before);
        this.emit([{ kind: 'card-removed', id }]);
        this.toast(errorText(e, ctx));
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

  private makeNote(i: { x: number; y: number; deskId: Id | null; text?: string; meta?: string }, after?: Promise<unknown>): Id {
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

  private makeFile(file: File, at: [number, number], deskId: Id | null, intro: 'single' | 'multi', desc?: string, after?: Promise<unknown>): Id {
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

  private makeLink(url: string, at: [number, number], deskId: Id | null, desc?: string, after?: Promise<unknown>): Id | null {
    let u: URL;
    try { u = new URL(url.trim()); } catch { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    const yt = host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be';
    const title = (host + u.pathname).length > 40 ? (host + u.pathname).slice(0, 39).trim() + '…' : host + u.pathname;
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
  private removeCard(id: Id): Promise<boolean> {
    const card = this.cards.get(id);
    if (!card) return Promise.resolve(true);
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
        await this.track(this.api.deleteCard(this.boardId, id));
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return true;
        this.hiddenCards.delete(id);
        this.cards.set(id, card);
        for (const ed of edges) { this.hiddenEdges.delete(ed.id); this.edges.set(ed.id, ed); }
        this.markStale(this.affected(id));
        this.emit([{ kind: 'card', id, fields: ['created'] }, ...edges.map((ed): StoreChange => ({ kind: 'edge', id: ed.id }))]);
        this.toast(errorText(e, 'other'));
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

  private patch(id: Id, patch: CardPatch): Promise<boolean> {
    const card = this.cards.get(id);
    if (!card) return Promise.resolve(false);
    const o = BoardStore.overrideOf(patch);
    const tok = ++this.tokSeq;
    const reads = this.affectsReads(card, patch);
    const before = reads ? this.affected(id) : new Set<Id>();
    this.addOverride(id, tok, o);
    this.put(mergeCard(card, o));
    if (reads) this.markStale(new Set([...before, ...this.affected(id)]));
    return this.send(id, patch, tok);
  }

  private async send(id: Id, patch: CardPatch, tok: number): Promise<boolean> {
    let res: Card | null = null;
    let err: unknown = null;
    try {
      const wait = this.pendingCards.get(id);
      if (wait && !(await wait)) throw new Silent();
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
    if (!card) return;
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
    d.timer = setTimeout(() => this.flushDebounced(id), ms);
  }

  private flushDebounced(id: Id): void {
    const d = this.debounced.get(id);
    if (!d) return;
    clearTimeout(d.timer);
    this.debounced.delete(id);
    const card = this.cards.get(id);
    if (card && this.affectsReads(card, { data: d.data })) this.markStale(this.affected(id));
    void this.send(id, { data: d.data as CardPatch['data'] }, d.tok);
  }

  setDesk(id: Id, deskId: Id | null): void {
    this.patchCard(id, { deskId });
    if (deskId) {
      for (const e of [...this.edges.values()]) if (e.kind === 'wire' && e.from === id && e.to === deskId) this.disconnect(e.id);
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

  disconnect(edgeId: Id): void {
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
        await this.track(this.api.deleteEdge(this.boardId, edgeId));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return;
        this.hiddenEdges.delete(edgeId);
        this.edges.set(edgeId, e);
        this.markStale(this.chatAndDesc(e.to));
        this.emit([{ kind: 'edge', id: edgeId }]);
        this.toast(errorText(err, 'other'));
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

  makePile(srcId: Id, targetId: Id, at: [number, number]): Id {
    const src = this.cards.get(srcId);
    const target = this.cards.get(targetId);
    if (!src || !target) return targetId;
    if (target.sourceType === 'pile') {
      void this.patch(srcId, { pileId: targetId, deskId: null });
      this.moveWires(srcId, targetId);
      return targetId;
    }
    const same = src.sourceType === target.sourceType;
    const title = same ? `${TYPE_INFO[target.sourceType ?? 'pdf'].label} pile` : 'Mixed pile';
    const data: SourceData = { title, meta: '2 files' };
    const pile = this.blankSource('pile', at[0], at[1], target.deskId, 'ready', data);
    this.create(pile, () => this.api.createCard(this.boardId, {
      id: pile.id, kind: 'source', sourceType: 'pile', x: at[0], y: at[1], deskId: target.deskId, status: 'ready', data,
    }), 'other');
    for (const m of [target, src]) {
      void this.patch(m.id, { pileId: pile.id, deskId: null });
      this.moveWires(m.id, pile.id);
    }
    return pile.id;
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
    for (const e of wires) for (const m of members) this.connect('wire', m.id, e.to);

    const gone = [...this.edges.values()].filter((e) => e.kind !== 'lineage' && (e.from === pileId || e.to === pileId));
    const before = this.affected(pileId);
    this.cards.delete(pileId);
    this.pinnedCards.delete(pileId);
    this.hiddenCards.add(pileId);
    for (const e of gone) { this.edges.delete(e.id); this.hiddenEdges.add(e.id); this.pinnedEdges.delete(e.id); }
    this.markStale(before);
    this.emit([...gone.map((e): StoreChange => ({ kind: 'edge-removed', id: e.id })), { kind: 'card-removed', id: pileId }]);
    this.savePositions(moved);

    void (async () => {
      try {
        await Promise.all(ops);
        const wait = this.pendingCards.get(pileId);
        if (wait) await wait;
        await this.track(this.api.deleteCard(this.boardId, pileId));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return;
        this.hiddenCards.delete(pileId);
        this.cards.set(pileId, pile);
        for (const e of gone) { this.hiddenEdges.delete(e.id); this.edges.set(e.id, e); }
        this.emit([{ kind: 'card', id: pileId, fields: ['created'] }, ...gone.map((e): StoreChange => ({ kind: 'edge', id: e.id }))]);
        this.toast(errorText(err, 'other'));
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
        catch (e) { this.toast(errorText(e, 'other')); }
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
      } catch (e) {
        if (this.board && this.pendingTitle === title) {
          this.board = { ...this.board, title: prev };
          this.emit([{ kind: 'board' }]);
        }
        this.toast(errorText(e, 'other'));
      } finally {
        if (this.pendingTitle === title) this.pendingTitle = null;
      }
    })();
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
    this.pollTimer = this.readsTimer = this.toastTimer = null;
    this.changeListeners.clear();
    this.subscribers.clear();
  }
}
