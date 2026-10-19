import { ApiError } from '../types';
import type {
  Board, BoardSummary, Card, CardCreate, CardPatch, ChatData, ChatRequest, Edge, EngineApi, Id, Message, Reads,
  SourceData, SourceType, Status, StreamEvent,
} from '../types';
import { PERSONAS, TYPE_INFO, defaultChatData, personaLabel } from '../../lib/catalog';
import { cut, sizeOf } from '../../lib/format';
import { canPlug, graphOf, nameOf } from '../../lib/graph';
import { computeReads, isRead } from '../../lib/reads';
import { seedBoard } from './seed';

export { SEED_BOARD_ID } from './seed';

export interface MockOptions {
  seed?: boolean;
  latencyMs?: number;
  ingestMs?: number;
  firstTokenMs?: number;
  wordMs?: number;
  /** Ids owned by another user: creating a board, card or edge with one is a 409 duplicate. */
  foreignIds?: string[];
}

const CARD_CAP = 50;
const MAX_UPLOAD = 4 * 1024 * 1024;
const ANSWER = "try $12 a month with ten real users before you decide, and ask what they'd pay before you show a number.";

interface CardRec { card: Card; del: number | null }
interface EdgeRec { edge: Edge; del: boolean }
interface BoardRec {
  id: Id; title: string; viewport: Board['viewport']; createdAt: string; updatedAt: string; deleted: boolean;
  cards: Map<Id, CardRec>; edges: Map<Id, EdgeRec>; messages: Map<Id, Message[]>;
}

const UPLOAD_TYPES: Record<string, { type: SourceType; status: Status }> = {
  pdf: { type: 'pdf', status: 'processing' }, docx: { type: 'doc', status: 'processing' },
  txt: { type: 'doc', status: 'processing' }, md: { type: 'doc', status: 'processing' },
  csv: { type: 'csv', status: 'processing' },
  png: { type: 'image', status: 'soon' }, jpg: { type: 'image', status: 'soon' }, jpeg: { type: 'image', status: 'soon' },
  webp: { type: 'image', status: 'soon' }, gif: { type: 'image', status: 'soon' },
  mp3: { type: 'audio', status: 'soon' }, m4a: { type: 'audio', status: 'soon' }, wav: { type: 'audio', status: 'soon' },
};

const invalid = (detail?: string) => new ApiError(400, 'invalid', detail);
const notFound = (detail?: string) => new ApiError(404, 'not_found', detail);
const clip = (s: string) => s.slice(0, 280);
const abortError = () => new DOMException('AbortError', 'AbortError');

export class MockEngineApi implements EngineApi {
  readonly calls: { method: string; args: unknown[] }[] = [];

  private readonly o: Required<Omit<MockOptions, 'foreignIds'>>;
  private readonly foreign: Set<string>;
  private readonly boards = new Map<Id, BoardRec>();
  private readonly failures = new Map<string, ApiError[]>();
  private readonly objectUrls = new Map<Id, string>();
  private lastTick = 0;
  private stamp = 0;

  constructor(opts: MockOptions = {}) {
    this.o = {
      seed: opts.seed ?? true, latencyMs: opts.latencyMs ?? 0, ingestMs: opts.ingestMs ?? 1800,
      firstTokenMs: opts.firstTokenMs ?? 1100, wordMs: opts.wordMs ?? 46,
    };
    this.foreign = new Set(opts.foreignIds ?? []);
    if (this.o.seed) this.loadSeed();
  }

  failNext(method: keyof EngineApi, err: ApiError): void {
    const q = this.failures.get(method) ?? [];
    q.push(err);
    this.failures.set(method, q);
  }

  // ---- clock and plumbing ----

  /** Strictly increasing ISO stamps, so siblings keep their creation order. */
  private now(): string {
    this.lastTick = Math.max(Date.now(), this.lastTick + 1);
    return new Date(this.lastTick).toISOString();
  }

  private async enter(method: keyof EngineApi, args: unknown[]): Promise<void> {
    this.calls.push({ method, args });
    await new Promise<void>((r) => setTimeout(r, this.o.latencyMs));
    const err = this.failures.get(method)?.shift();
    if (err) throw err;
  }

  private loadSeed(): void {
    const { board, messages } = seedBoard();
    const b: BoardRec = {
      id: board.id, title: board.title, viewport: board.viewport, createdAt: board.createdAt, updatedAt: board.updatedAt,
      deleted: false, cards: new Map(), edges: new Map(), messages: new Map(Object.entries(messages)),
    };
    for (const c of board.cards) b.cards.set(c.id, { card: c, del: null });
    for (const e of board.edges) b.edges.set(e.id, { edge: e, del: false });
    this.boards.set(b.id, b);
    for (const t of [board.createdAt, board.updatedAt, ...board.cards.map((c) => c.createdAt), ...board.edges.map((e) => e.createdAt)]) {
      this.lastTick = Math.max(this.lastTick, Date.parse(t));
    }
  }

  private board(id: Id): BoardRec {
    const b = this.boards.get(id);
    if (!b || b.deleted) throw notFound('board');
    return b;
  }

  private live(b: BoardRec, id: Id): Card | undefined {
    const r = b.cards.get(id);
    return r && r.del === null ? r.card : undefined;
  }

  private liveCount(b: BoardRec): number {
    let n = 0;
    for (const r of b.cards.values()) if (r.del === null) n++;
    return n;
  }

  private checkForeign(id: Id): void {
    if (this.foreign.has(id)) throw new ApiError(409, 'duplicate', 'id belongs to another user');
  }

  /** Desk and pile links to a deleted chat or pile read as null; the stored id stays for restore. */
  private view(b: BoardRec, c: Card): Card {
    return {
      ...c,
      deskId: c.deskId && this.live(b, c.deskId) ? c.deskId : null,
      pileId: c.pileId && this.live(b, c.pileId) ? c.pileId : null,
    };
  }

  private snapshot(b: BoardRec): Board {
    const cards = [...b.cards.values()].filter((r) => r.del === null).map((r) => this.view(b, r.card));
    const edges = [...b.edges.values()]
      .filter((r) => !r.del && this.live(b, r.edge.from) && this.live(b, r.edge.to))
      .map((r) => r.edge);
    return { id: b.id, title: b.title, viewport: b.viewport, cards, edges, createdAt: b.createdAt, updatedAt: b.updatedAt };
  }

  private touch(b: BoardRec, c?: Card): void {
    const t = this.now();
    b.updatedAt = t;
    if (c) c.updatedAt = t;
  }

  private liveCard(b: BoardRec, id: Id): Card {
    const c = this.live(b, id);
    if (!c) throw notFound('card');
    return c;
  }

  private checkLinks(b: BoardRec, input: { deskId?: Id | null; pileId?: Id | null }): void {
    if (input.deskId) {
      const d = this.live(b, input.deskId);
      if (!d || d.kind !== 'chat') throw invalid('deskId must be a live chat on this board');
    }
    if (input.pileId) {
      const p = this.live(b, input.pileId);
      if (!p || p.sourceType !== 'pile') throw invalid('pileId must be a live pile on this board');
    }
  }

  private blankChat(b: BoardRec, id: Id, title: string, x: number, y: number): Card {
    const t = this.now();
    return {
      id, boardId: b.id, kind: 'chat', sourceType: null, x, y, deskId: null, pileId: null, parentId: null,
      forkedFromMessageId: null, status: null, data: defaultChatData(title), createdAt: t, updatedAt: t,
      messageCount: 0, lastMessage: null,
    };
  }

  private addSource(b: BoardRec, input: {
    id: Id; sourceType: SourceType; status: Status; x: number; y: number; deskId?: Id | null; data: SourceData;
  }): Card {
    const t = this.now();
    const card: Card = {
      id: input.id, boardId: b.id, kind: 'source', sourceType: input.sourceType, x: input.x, y: input.y,
      deskId: input.deskId ?? null, pileId: null, parentId: null, forkedFromMessageId: null, status: input.status,
      data: input.data, createdAt: t, updatedAt: t,
    };
    b.cards.set(card.id, { card, del: null });
    this.touch(b);
    return card;
  }

  /** Turns a processing source ready (or failed) after ingestMs. */
  private scheduleIngest(b: BoardRec, id: Id, finish: () => Promise<Partial<SourceData> | null>): void {
    setTimeout(async () => {
      const rec = b.cards.get(id);
      if (!rec) return;
      let extra: Partial<SourceData> | null = null;
      try { extra = await finish(); } catch { extra = null; }
      if (!b.cards.has(id)) return;
      if (extra) {
        rec.card.data = { ...(rec.card.data as SourceData), ...extra };
        rec.card.status = 'ready';
      } else {
        rec.card.data = { ...(rec.card.data as SourceData), error: "Couldn't read this file." };
        rec.card.status = 'failed';
      }
      this.touch(b, rec.card);
    }, this.o.ingestMs);
  }

  // ---- boards ----

  async listBoards(): Promise<BoardSummary[]> {
    await this.enter('listBoards', []);
    return structuredClone(
      [...this.boards.values()].filter((b) => !b.deleted)
        .sort((a, c) => (a.updatedAt < c.updatedAt ? 1 : a.updatedAt > c.updatedAt ? -1 : 0))
        .map((b) => ({ id: b.id, title: b.title, updatedAt: b.updatedAt, cardCount: this.liveCount(b) })),
    );
  }

  async createBoard(input: { id: Id; title: string }): Promise<Board> {
    await this.enter('createBoard', [input]);
    const had = this.boards.get(input.id);
    if (had && !had.deleted) return structuredClone(this.snapshot(had));
    this.checkForeign(input.id);
    if (had) throw new ApiError(409, 'duplicate');
    const t = this.now();
    const b: BoardRec = {
      id: input.id, title: input.title, viewport: null, createdAt: t, updatedAt: t, deleted: false,
      cards: new Map(), edges: new Map(), messages: new Map(),
    };
    const q1 = this.blankChat(b, `${input.id}_q1`, input.title, 0, 0);
    b.cards.set(q1.id, { card: q1, del: null });
    this.boards.set(b.id, b);
    return structuredClone(this.snapshot(b));
  }

  async getBoard(boardId: Id): Promise<Board> {
    await this.enter('getBoard', [boardId]);
    return structuredClone(this.snapshot(this.board(boardId)));
  }

  async updateBoard(boardId: Id, patch: { title?: string; viewport?: Board['viewport'] }): Promise<void> {
    await this.enter('updateBoard', [boardId, patch]);
    const b = this.board(boardId);
    if (patch.title !== undefined) b.title = patch.title;
    if ('viewport' in patch && patch.viewport !== undefined) b.viewport = structuredClone(patch.viewport);
    this.touch(b);
  }

  async deleteBoard(boardId: Id): Promise<void> {
    await this.enter('deleteBoard', [boardId]);
    this.board(boardId).deleted = true;
  }

  // ---- cards ----

  async createCard(boardId: Id, input: CardCreate): Promise<Card> {
    await this.enter('createCard', [boardId, input]);
    const b = this.board(boardId);
    const had = b.cards.get(input.id);
    if (had) return structuredClone(this.view(b, had.card));
    this.checkForeign(input.id);
    if (this.liveCount(b) >= CARD_CAP) throw new ApiError(409, 'card_limit');
    this.checkLinks(b, input);
    if (input.parentId) {
      const p = this.live(b, input.parentId);
      if (!p || p.kind !== 'chat') throw invalid('parentId must be a live chat on this board');
    }
    if (input.kind === 'source' && !input.sourceType) throw invalid('sourceType is required for a source');
    const t = this.now();
    let data: ChatData | SourceData;
    if (input.kind === 'chat') {
      const d = input.data as Partial<ChatData>;
      const base = defaultChatData(d.name ?? 'New question');
      data = { ...base, ...d, advanced: { ...base.advanced, ...d.advanced }, hide: [...(d.hide ?? [])] };
    } else {
      data = structuredClone(input.data as SourceData);
    }
    const card: Card = {
      id: input.id, boardId: b.id, kind: input.kind, sourceType: input.kind === 'chat' ? null : input.sourceType ?? null,
      x: input.x, y: input.y, deskId: input.kind === 'chat' ? null : input.deskId ?? null,
      pileId: input.kind === 'chat' ? null : input.pileId ?? null,
      parentId: input.kind === 'chat' ? input.parentId ?? null : null,
      forkedFromMessageId: input.forkedFromMessageId ?? null,
      status: input.kind === 'chat' ? null : input.status ?? 'ready',
      data, createdAt: t, updatedAt: t,
      ...(input.kind === 'chat' ? { messageCount: 0, lastMessage: null } : {}),
    };
    b.cards.set(card.id, { card, del: null });
    if (card.kind === 'chat' && card.parentId) {
      const id = `lin_${card.id}`;
      b.edges.set(id, { edge: { id, boardId: b.id, kind: 'lineage', from: card.parentId, to: card.id, createdAt: this.now() }, del: false });
    }
    this.touch(b);
    return structuredClone(this.view(b, card));
  }

  async updateCard(boardId: Id, cardId: Id, patch: CardPatch): Promise<Card> {
    await this.enter('updateCard', [boardId, cardId, patch]);
    const b = this.board(boardId);
    const c = this.liveCard(b, cardId);
    if ('deskId' in patch) this.checkLinks(b, { deskId: patch.deskId });
    if ('pileId' in patch) this.checkLinks(b, { pileId: patch.pileId });
    if (patch.data) c.data = { ...c.data, ...structuredClone(patch.data) } as ChatData | SourceData;
    if ('deskId' in patch && patch.deskId !== undefined) c.deskId = patch.deskId;
    if ('pileId' in patch && patch.pileId !== undefined) c.pileId = patch.pileId;
    if (patch.status) c.status = patch.status;
    this.touch(b, c);
    return structuredClone(this.view(b, c));
  }

  async deleteCard(boardId: Id, cardId: Id): Promise<Id[]> {
    await this.enter('deleteCard', [boardId, cardId]);
    const b = this.board(boardId);
    const root = this.liveCard(b, cardId);
    const ids = [root.id];
    if (root.kind === 'chat') {
      for (let i = 0; i < ids.length; i++) {
        for (const r of b.cards.values()) if (r.del === null && r.card.parentId === ids[i] && !ids.includes(r.card.id)) ids.push(r.card.id);
      }
    }
    const stamp = ++this.stamp;
    for (const id of ids) b.cards.get(id)!.del = stamp;
    this.touch(b);
    return [...ids];
  }

  async restoreCard(boardId: Id, cardId: Id): Promise<Id[]> {
    await this.enter('restoreCard', [boardId, cardId]);
    const b = this.board(boardId);
    const root = b.cards.get(cardId);
    if (!root || root.del === null) throw notFound('card');
    const stamp = root.del;
    const set = [...b.cards.values()].filter((r) => r.del === stamp);
    for (const r of set) {
      const p = r.card.parentId ? b.cards.get(r.card.parentId) : undefined;
      if (p && p.del !== null && p.del !== stamp) throw new ApiError(409, 'not_allowed', 'parent is still deleted');
    }
    if (this.liveCount(b) + set.length > CARD_CAP) throw new ApiError(409, 'card_limit');
    for (const r of set) r.del = null;
    this.touch(b);
    return set.map((r) => r.card.id);
  }

  async savePositions(boardId: Id, positions: { id: Id; x: number; y: number }[]): Promise<void> {
    await this.enter('savePositions', [boardId, positions]);
    const b = this.board(boardId);
    for (const p of positions) {
      const c = this.live(b, p.id);
      if (c) { c.x = p.x; c.y = p.y; }
    }
    this.touch(b);
  }

  // ---- edges ----

  async createEdge(boardId: Id, input: { id: Id; kind: 'wire' | 'answer'; from: Id; to: Id }): Promise<Edge> {
    await this.enter('createEdge', [boardId, input]);
    const b = this.board(boardId);
    const had = b.edges.get(input.id);
    if (had && !had.del) return structuredClone(had.edge);
    this.checkForeign(input.id);
    const from = this.live(b, input.from);
    const to = this.live(b, input.to);
    if (!from || !to) throw notFound('card');
    if ([...b.edges.values()].some((r) => !r.del && r.edge.kind === input.kind && r.edge.from === input.from && r.edge.to === input.to)) {
      throw new ApiError(409, 'duplicate');
    }
    const g = graphOf(this.snapshot(b));
    const ok = input.kind === 'wire'
      ? from.kind === 'source' && !from.pileId && to.kind === 'chat' && canPlug(g, from.id, 'src', to.id)
      : from.kind === 'chat' && to.kind === 'chat' && canPlug(g, from.id, 'chat', to.id);
    if (!ok) throw new ApiError(409, 'not_allowed');
    const edge: Edge = { id: input.id, boardId: b.id, kind: input.kind, from: input.from, to: input.to, createdAt: this.now() };
    b.edges.set(edge.id, { edge, del: false });
    this.touch(b);
    return structuredClone(edge);
  }

  async deleteEdge(boardId: Id, edgeId: Id): Promise<void> {
    await this.enter('deleteEdge', [boardId, edgeId]);
    const b = this.board(boardId);
    const r = b.edges.get(edgeId);
    if (!r || r.del) throw notFound('edge');
    if (r.edge.kind === 'lineage') throw invalid('lineage edges cannot be deleted');
    r.del = true;
    this.touch(b);
  }

  // ---- messages and reads ----

  async getMessages(boardId: Id, chatId: Id): Promise<Message[]> {
    await this.enter('getMessages', [boardId, chatId]);
    const b = this.board(boardId);
    const c = this.liveCard(b, chatId);
    if (c.kind !== 'chat') throw invalid('not a chat');
    return structuredClone(b.messages.get(chatId) ?? []);
  }

  async getReads(boardId: Id, chatId: Id): Promise<Reads> {
    await this.enter('getReads', [boardId, chatId]);
    const b = this.board(boardId);
    const c = this.liveCard(b, chatId);
    if (c.kind !== 'chat') throw invalid('not a chat');
    return structuredClone(computeReads(graphOf(this.snapshot(b)), chatId));
  }

  // ---- sources ----

  async uploadFile(boardId: Id, input: { id: Id; file: File; x: number; y: number; deskId?: Id | null; desc?: string }): Promise<Card> {
    await this.enter('uploadFile', [boardId, input]);
    const b = this.board(boardId);
    const had = b.cards.get(input.id);
    if (had) return structuredClone(this.view(b, had.card));
    this.checkForeign(input.id);
    const { file } = input;
    if (file.size > MAX_UPLOAD) throw new ApiError(413, 'too_large');
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    const kind = file.name.includes('.') ? UPLOAD_TYPES[ext] : undefined;
    if (!kind) throw new ApiError(415, 'unsupported_type');
    if (this.liveCount(b) >= CARD_CAP) throw new ApiError(409, 'card_limit');
    this.checkLinks(b, input);
    const data: SourceData = {
      title: file.name, meta: `${TYPE_INFO[kind.type].label} · ${sizeOf(file.size)}`,
      fileName: file.name, fileType: file.type || ext, fileSize: file.size,
      ...(input.desc ? { desc: input.desc } : {}),
    };
    const card = this.addSource(b, { id: input.id, sourceType: kind.type, status: kind.status, x: input.x, y: input.y, deskId: input.deskId, data });
    try { this.objectUrls.set(card.id, URL.createObjectURL(file)); } catch { /* no object URLs in this runtime */ }
    if (kind.status === 'processing') {
      const broken = file.name.toLowerCase().includes('broken');
      this.scheduleIngest(b, card.id, async () => {
        if (broken) return null;
        const extra: Partial<SourceData> = {
          excerpts: [{ loc: null, text: 'Read in full.', on: true }], summary: `A read of ${file.name}.`,
        };
        if (ext === 'txt' || ext === 'md') extra.text = (await file.text()).slice(0, 4000);
        return extra;
      });
    }
    return structuredClone(this.view(b, card));
  }

  async addLink(boardId: Id, input: { id: Id; url: string; x: number; y: number; deskId?: Id | null; desc?: string }): Promise<Card> {
    await this.enter('addLink', [boardId, input]);
    const b = this.board(boardId);
    const had = b.cards.get(input.id);
    if (had) return structuredClone(this.view(b, had.card));
    this.checkForeign(input.id);
    let u: URL;
    try { u = new URL(input.url); } catch { throw invalid('not a URL'); }
    const host = u.hostname.toLowerCase();
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || host === 'localhost' || host.startsWith('127.')
      || host.startsWith('10.') || host.startsWith('192.168.')) {
      throw invalid('this address cannot be read');
    }
    if (this.liveCount(b) >= CARD_CAP) throw new ApiError(409, 'card_limit');
    this.checkLinks(b, input);
    const desc = input.desc ? { desc: input.desc } : {};
    const yt = host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be';
    if (yt) {
      const ytid = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop() || '';
      const card = this.addSource(b, {
        id: input.id, sourceType: 'video', status: 'soon', x: input.x, y: input.y, deskId: input.deskId,
        data: { url: input.url, ytid, title: 'YouTube video', meta: 'YouTube', ...desc },
      });
      return structuredClone(this.view(b, card));
    }
    const card = this.addSource(b, {
      id: input.id, sourceType: 'web', status: 'processing', x: input.x, y: input.y, deskId: input.deskId,
      data: { url: input.url, title: cut(host + u.pathname, 40), meta: host, ...desc },
    });
    this.scheduleIngest(b, card.id, async () => ({
      excerpts: [{ loc: '§ 1', text: 'Page read.', on: true }], summary: `A read of ${host}.`,
    }));
    return structuredClone(this.view(b, card));
  }

  rawFileUrl(cardId: Id): string | null {
    this.calls.push({ method: 'rawFileUrl', args: [cardId] });
    return this.objectUrls.get(cardId) ?? null;
  }

  // ---- chat ----

  async streamChat(req: ChatRequest, onEvent: (e: StreamEvent) => void, signal?: AbortSignal): Promise<void> {
    await this.enter('streamChat', [req, onEvent, signal]);
    const b = this.board(req.boardId);
    const chat = this.live(b, req.chatId);
    if (!chat || chat.kind !== 'chat') throw notFound('chat');

    const g = graphOf(this.snapshot(b));
    const names = computeReads(g, chat.id).items.filter(isRead).map((i) => nameOf(g, g.cards.get(i.cardId)!));
    const persona = (chat.data as ChatData).persona;
    const voice = persona in PERSONAS ? personaLabel(persona) : null;
    const lead = names.length
      ? `Reading ${names.slice(0, 2).join(' and ')}${names.length > 2 ? ` plus ${names.length - 2} more` : ''}: `
      : 'Nothing on this desk yet, so going on the conversation alone: ';
    const text = `${voice ? `(${voice}) ` : ''}${lead}${ANSWER}`;
    const words = text.split(' ');

    const wait = (ms: number) => new Promise<void>((resolve) => {
      if (signal?.aborted) return resolve();
      const t = setTimeout(done, ms);
      function done() { signal?.removeEventListener('abort', done); clearTimeout(t); resolve(); }
      signal?.addEventListener('abort', done);
    });
    const checkAbort = () => { if (signal?.aborted) throw abortError(); };

    // The question is stored as soon as it is accepted; an aborted stream keeps it and stores no answer.
    const list = b.messages.get(chat.id) ?? [];
    b.messages.set(chat.id, list);
    let lastAssistant = -1;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].role === 'assistant') { lastAssistant = i; break; }
    const regenerate = !!req.regenerateLastUser && lastAssistant >= 0;
    if (!regenerate) {
      list.push({ id: `${req.messageId}_u`, role: 'user', content: req.message, position: list.length, createdAt: this.now() });
      chat.messageCount = list.length;
      chat.lastMessage = { role: 'user', content: clip(req.message) };
      this.touch(b, chat);
    }

    checkAbort();
    await wait(this.o.firstTokenMs);
    checkAbort();
    if (req.webSearch) onEvent({ type: 'web', results: [{ title: 'Pricing pages compared', url: 'https://example.com/pricing' }] });
    for (let i = 0; i < words.length; i += 2) {
      checkAbort();
      const more = i + 2 < words.length;
      onEvent({ type: 'delta', text: words.slice(i, i + 2).join(' ') + (more ? ' ' : '') });
      if (more) { await wait(this.o.wordMs); checkAbort(); }
    }
    checkAbort();

    const answer: Message = { id: `${req.messageId}_a`, role: 'assistant', content: text, position: list.length, createdAt: this.now() };
    if (regenerate) list[lastAssistant] = { ...answer, position: list[lastAssistant].position };
    else list.push(answer);
    chat.messageCount = list.length;
    chat.lastMessage = { role: 'assistant', content: clip(text) };
    this.touch(b, chat);
    onEvent({ type: 'done' });
  }
}
