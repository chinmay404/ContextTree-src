import { parseSse } from '@/lib/sse';
import {
  ApiError,
  type Board, type BoardSummary, type Card, type CardCreate, type CardPatch, type ChatRequest,
  type Edge, type EngineApi, type Id, type Message, type ProviderId, type Reads, type StreamErrorCode, type StreamEvent,
} from './types';
import { PROVIDER_NAME } from '../lib/catalog';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const CUT_OFF = 'The answer was cut off';
const STALE_PROCESSING_MS = 5 * 60_000; // a source still processing this long after its last update gets another ingest
const KICK_EVERY_MS = 60_000;           // at most one re-kick per card per minute

const isProvider = (v: unknown): v is ProviderId => typeof v === 'string' && Object.prototype.hasOwnProperty.call(PROVIDER_NAME, v);
const CODES: StreamErrorCode[] = ['missing_key', 'key_rejected', 'unsupported_model', 'key_store_unavailable'];
const isCode = (v: unknown): v is StreamErrorCode => CODES.includes(v as StreamErrorCode);

/**
 * The engine answers a V3 turn's key problems before streaming (400 missing_key / unsupported_model, 503
 * key_store_unavailable, 500 server_error). The board shows those as an error on the chat, not as a thrown request.
 */
function keyErrorEvent(err: ApiError): StreamEvent | null {
  const detail = err.message !== err.code ? err.message : undefined;
  if (err.code === 'missing_key' && err.status === 400) {
    const provider = isProvider(detail) ? detail : undefined;
    return { type: 'error', code: 'missing_key', message: provider ? `No ${PROVIDER_NAME[provider]} key` : 'No key for this model', ...(provider ? { provider } : {}) };
  }
  if (err.code === 'unsupported_model' && err.status === 400) return { type: 'error', code: 'unsupported_model', message: "This model isn't available any more" };
  if (err.code === 'key_store_unavailable' && err.status === 503) {
    const provider = isProvider(detail) ? detail : undefined;
    return { type: 'error', code: 'key_store_unavailable', message: "Your keys can't be read right now. Try again in a minute.", ...(provider ? { provider } : {}) };
  }
  if (err.code === 'server_error' && err.status === 500) return { type: 'error', message: 'Something went wrong on our side. Try again in a minute.' };
  return null;
}

export class HttpEngineApi implements EngineApi {
  constructor(private base = '/api/engine') {}

  /** When each card was last kicked (in memory, per api instance). */
  private kicked = new Map<Id, number>();

  /**
   * The engine runs on Vercel, where work after a response is best-effort, so ingest runs inside its own request
   * (the browser keeps the function alive). Fire and forget: the board's normal poll shows the status change.
   * Failures are swallowed; only the error type is logged.
   */
  private kickIngest(boardId: Id, cardId: Id): void {
    this.kicked.set(cardId, Date.now());
    void fetch(`${this.base}/boards/${enc(boardId)}/cards/${enc(cardId)}/ingest`, { method: 'POST' })
      .then((r) => { void r.body?.cancel?.().catch(() => {}); })
      .catch((e: unknown) => { console.debug('[ingest] kick failed:', e instanceof Error ? e.name : 'error'); });
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        method,
        headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(503, 'engine_unavailable');
    }
    return this.handle<T>(res);
  }

  private async handle<T>(res: Response): Promise<T> {
    if (!res.ok) throw await this.toError(res);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError(res.status, 'bad_response');
    }
  }

  private async toError(res: Response): Promise<ApiError> {
    let code: string | undefined;
    let detail: string | undefined;
    try {
      const b = await res.json();
      if (typeof b?.error === 'string') code = b.error;
      if (typeof b?.detail === 'string') detail = b.detail;
    } catch { /* no body */ }
    if (!code) code = res.status === 401 ? 'unauthorized' : res.status >= 500 ? 'engine_unavailable' : 'error';
    return new ApiError(res.status, code, detail);
  }

  async listBoards(): Promise<BoardSummary[]> {
    return (await this.req<{ boards: BoardSummary[] }>('GET', '/boards')).boards;
  }
  createBoard(input: { id: Id; title: string }) { return this.req<Board>('POST', '/boards', input); }
  async getBoard(boardId: Id): Promise<Board> {
    const board = await this.req<Board>('GET', `/boards/${enc(boardId)}`);
    const now = Date.now();
    for (const c of board?.cards ?? []) {
      if (c.kind !== 'source' || c.status !== 'processing') continue;
      if (now - Date.parse(c.updatedAt) < STALE_PROCESSING_MS) continue;
      if (now - (this.kicked.get(c.id) ?? 0) < KICK_EVERY_MS) continue;
      this.kickIngest(boardId, c.id);
    }
    return board;
  }
  async updateBoard(boardId: Id, patch: { title?: string; viewport?: Board['viewport'] }): Promise<void> {
    await this.req('PATCH', `/boards/${enc(boardId)}`, patch);
  }
  async deleteBoard(boardId: Id): Promise<void> { await this.req('DELETE', `/boards/${enc(boardId)}`); }
  /** Best-effort DELETE that survives page unload (pagehide flush of a deferred board delete). */
  deleteBoardKeepalive(boardId: Id): void {
    void fetch(`${this.base}/boards/${enc(boardId)}`, { method: 'DELETE', keepalive: true }).catch(() => {});
  }
  createCard(boardId: Id, input: CardCreate) { return this.req<Card>('POST', `/boards/${enc(boardId)}/cards`, input); }
  updateCard(boardId: Id, cardId: Id, patch: CardPatch) {
    return this.req<Card>('PATCH', `/boards/${enc(boardId)}/cards/${enc(cardId)}`, patch);
  }
  async deleteCard(boardId: Id, cardId: Id): Promise<Id[]> {
    return (await this.req<{ deleted: Id[] }>('DELETE', `/boards/${enc(boardId)}/cards/${enc(cardId)}`)).deleted;
  }
  async restoreCard(boardId: Id, cardId: Id): Promise<Id[]> {
    return (await this.req<{ restored: Id[] }>('POST', `/boards/${enc(boardId)}/cards/${enc(cardId)}/restore`)).restored;
  }
  async savePositions(boardId: Id, positions: { id: Id; x: number; y: number }[]): Promise<void> {
    await this.req('PATCH', `/boards/${enc(boardId)}/positions`, { positions });
  }
  createEdge(boardId: Id, input: { id: Id; kind: 'wire' | 'answer'; from: Id; to: Id }) {
    return this.req<Edge>('POST', `/boards/${enc(boardId)}/edges`, input);
  }
  async deleteEdge(boardId: Id, edgeId: Id): Promise<void> {
    await this.req('DELETE', `/boards/${enc(boardId)}/edges/${enc(edgeId)}`);
  }
  async getMessages(boardId: Id, chatId: Id): Promise<Message[]> {
    return (await this.req<{ messages: Message[] }>('GET', `/boards/${enc(boardId)}/cards/${enc(chatId)}/messages`)).messages;
  }
  getReads(boardId: Id, chatId: Id) {
    return this.req<Reads>('GET', `/boards/${enc(boardId)}/cards/${enc(chatId)}/reads`);
  }

  async uploadFile(
    boardId: Id,
    input: { id: Id; file: File; x: number; y: number; deskId?: Id | null; desc?: string }
  ): Promise<Card> {
    if (input.file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, 'too_large');
    const fd = new FormData();
    fd.append('id', input.id);
    fd.append('file', input.file);
    fd.append('x', String(input.x));
    fd.append('y', String(input.y));
    if (input.deskId) fd.append('deskId', input.deskId);
    if (input.desc) fd.append('desc', input.desc);
    let res: Response;
    try {
      res = await fetch(`${this.base}/boards/${enc(boardId)}/sources/file`, { method: 'POST', body: fd });
    } catch {
      throw new ApiError(503, 'engine_unavailable');
    }
    return this.afterAccepted(boardId, await this.handle<Card>(res));
  }

  async addLink(boardId: Id, input: { id: Id; url: string; x: number; y: number; deskId?: Id | null; desc?: string }): Promise<Card> {
    return this.afterAccepted(boardId, await this.req<Card>('POST', `/boards/${enc(boardId)}/sources/link`, input));
  }

  /** A 202 card still processing: start its ingest, then hand the card back as before. */
  private afterAccepted(boardId: Id, card: Card): Card {
    if (card?.status === 'processing') this.kickIngest(boardId, card.id);
    return card;
  }

  async streamChat(req: ChatRequest, onEvent: (e: StreamEvent) => void, signal?: AbortSignal): Promise<void> {
    const body = {
      message: req.message,
      message_id: req.messageId,
      nodeId: req.chatId,
      canvasId: req.boardId,
      boardId: req.boardId,
      model: req.model,
      systemPrompt: req.systemPrompt,
      temperature: req.temperature,
      maxOutputTokens: req.maxOutputTokens,
      lastKMessages: req.lastKMessages,
      externalContextTopK: req.externalContextTopK,
      webSearch: req.webSearch,
      parentNodeId: req.parentNodeId,
      forkedFromMessageId: req.forkedFromMessageId,
      regenerateLastUser: req.regenerateLastUser,
    };
    let res: Response;
    try {
      res = await fetch(`${this.base}/chat/stream`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      if (isAbort(e) || signal?.aborted) throw abortError();
      throw new ApiError(503, 'engine_unavailable');
    }
    if (!res.ok) {
      const err = await this.toError(res);
      const ev = keyErrorEvent(err);
      if (!ev) throw err;
      onEvent(ev);
      return;
    }
    if (!res.body) {
      onEvent({ type: 'error', message: CUT_OFF });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let carry = '';
    let finished = false;
    let coded = false; // a coded error frame (key_rejected) ends the stream without [DONE]
    const emit = (events: unknown[]) => {
      for (const ev of events) {
        const p = ev as { error?: unknown; code?: unknown; provider?: unknown; summary?: unknown; web_search?: { results?: { title?: string; url?: string }[] }; message?: unknown; delta?: unknown } | null;
        if (!p) continue;
        if (p.error) {
          const code = isCode(p.code) ? p.code : undefined;
          if (code) coded = true;
          onEvent({ type: 'error', message: String(p.error), ...(code ? { code } : {}), ...(code && isProvider(p.provider) ? { provider: p.provider } : {}) });
          continue;
        }
        if (typeof p.summary === 'string' && p.summary) onEvent({ type: 'summary', text: p.summary });
        if (p.web_search?.results) onEvent({ type: 'web', results: p.web_search.results });
        const chunk = p.message ?? p.delta;
        if (typeof chunk === 'string' && chunk) onEvent({ type: 'delta', text: chunk });
      }
    };
    let readFailed = false;
    try {
      while (true) {
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try {
          chunk = await reader.read();
        } catch (e) {
          if (isAbort(e) || signal?.aborted) throw abortError();
          readFailed = true;
          break;
        }
        if (chunk.done) break;
        const r = parseSse(decoder.decode(chunk.value, { stream: true }), carry);
        carry = r.carry;
        emit(r.events); // an exception thrown by onEvent propagates as-is
        if (r.done) { finished = true; break; }
      }
      if (!finished && !readFailed) {
        // flush a final frame that lacked a trailing newline
        const r = parseSse('\n', carry);
        emit(r.events);
        finished = r.done;
      }
    } finally {
      try { await reader.cancel(); } catch { /* ignore */ }
      try { reader.releaseLock(); } catch { /* ignore */ }
    }
    if (finished) onEvent({ type: 'done' });
    else if (!coded) onEvent({ type: 'error', message: CUT_OFF });
  }

  rawFileUrl(cardId: Id): string | null {
    return `${this.base}/files/${enc(cardId)}/raw`;
  }
}

function isAbort(e: unknown) {
  return (e instanceof Error || e instanceof DOMException) && e.name === 'AbortError';
}
const enc = encodeURIComponent;
function abortError() {
  return new DOMException('Aborted', 'AbortError');
}
