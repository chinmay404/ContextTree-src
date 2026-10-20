import { parseSse } from '@/lib/sse';
import {
  ApiError,
  type Board, type BoardSummary, type Card, type CardCreate, type CardPatch, type ChatRequest,
  type Edge, type EngineApi, type Id, type Message, type Reads, type StreamEvent,
} from './types';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const CUT_OFF = 'The answer was cut off';

export class HttpEngineApi implements EngineApi {
  constructor(private base = '/api/engine') {}

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
  getBoard(boardId: Id) { return this.req<Board>('GET', `/boards/${enc(boardId)}`); }
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
    return this.handle<Card>(res);
  }

  addLink(boardId: Id, input: { id: Id; url: string; x: number; y: number; deskId?: Id | null; desc?: string }) {
    return this.req<Card>('POST', `/boards/${enc(boardId)}/sources/link`, input);
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
    if (!res.ok) throw await this.toError(res);
    if (!res.body) {
      onEvent({ type: 'error', message: CUT_OFF });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let carry = '';
    let finished = false;
    const emit = (events: unknown[]) => {
      for (const ev of events) {
        const p = ev as Record<string, any> | null;
        if (!p) continue;
        if (p.error) { onEvent({ type: 'error', message: String(p.error) }); continue; }
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
    onEvent(finished ? { type: 'done' } : { type: 'error', message: CUT_OFF });
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
