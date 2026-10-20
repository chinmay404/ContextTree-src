import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpEngineApi, MAX_UPLOAD_BYTES } from '@/components/board/api/http';
import { ApiError, type ChatRequest, type StreamEvent } from '@/components/board/api/types';

const fetchMock = vi.fn();
const jres = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const api = new HttpEngineApi();

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

const sseRes = (chunks: string[]) =>
  new Response(
    new ReadableStream({
      start(c) { const e = new TextEncoder(); chunks.forEach((s) => c.enqueue(e.encode(s))); c.close(); },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream' } }
  );

type Case = { name: string; call: () => Promise<unknown>; method: string; url: string; body?: unknown; resp: unknown; expected: unknown };
const card = { id: 'c1' };
const cases: Case[] = [
  { name: 'listBoards', call: () => api.listBoards(), method: 'GET', url: '/api/engine/boards', resp: { boards: [{ id: 'b1' }] }, expected: [{ id: 'b1' }] },
  { name: 'createBoard', call: () => api.createBoard({ id: 'b1', title: 'T' }), method: 'POST', url: '/api/engine/boards', body: { id: 'b1', title: 'T' }, resp: { id: 'b1' }, expected: { id: 'b1' } },
  { name: 'getBoard', call: () => api.getBoard('b1'), method: 'GET', url: '/api/engine/boards/b1', resp: { id: 'b1' }, expected: { id: 'b1' } },
  { name: 'updateBoard', call: () => api.updateBoard('b1', { title: 'x' }), method: 'PATCH', url: '/api/engine/boards/b1', body: { title: 'x' }, resp: { ok: true }, expected: undefined },
  { name: 'createCard', call: () => api.createCard('b1', { id: 'c1', kind: 'chat', x: 0, y: 0, data: {} }), method: 'POST', url: '/api/engine/boards/b1/cards', body: { id: 'c1', kind: 'chat', x: 0, y: 0, data: {} }, resp: card, expected: card },
  { name: 'updateCard', call: () => api.updateCard('b1', 'c1', { deskId: null }), method: 'PATCH', url: '/api/engine/boards/b1/cards/c1', body: { deskId: null }, resp: card, expected: card },
  { name: 'deleteCard', call: () => api.deleteCard('b1', 'c1'), method: 'DELETE', url: '/api/engine/boards/b1/cards/c1', resp: { deleted: ['c1', 'c2'] }, expected: ['c1', 'c2'] },
  { name: 'restoreCard', call: () => api.restoreCard('b1', 'c1'), method: 'POST', url: '/api/engine/boards/b1/cards/c1/restore', resp: { restored: ['c1'] }, expected: ['c1'] },
  { name: 'savePositions', call: () => api.savePositions('b1', [{ id: 'c1', x: 1, y: 2 }]), method: 'PATCH', url: '/api/engine/boards/b1/positions', body: { positions: [{ id: 'c1', x: 1, y: 2 }] }, resp: { updated: 1 }, expected: undefined },
  { name: 'createEdge', call: () => api.createEdge('b1', { id: 'e1', kind: 'wire', from: 'a', to: 'b' }), method: 'POST', url: '/api/engine/boards/b1/edges', body: { id: 'e1', kind: 'wire', from: 'a', to: 'b' }, resp: { id: 'e1' }, expected: { id: 'e1' } },
  { name: 'getMessages', call: () => api.getMessages('b1', 'c1'), method: 'GET', url: '/api/engine/boards/b1/cards/c1/messages', resp: { messages: [{ id: 'm' }] }, expected: [{ id: 'm' }] },
  { name: 'getReads', call: () => api.getReads('b1', 'c1'), method: 'GET', url: '/api/engine/boards/b1/cards/c1/reads', resp: { chatId: 'c1', items: [], totalTokens: 0 }, expected: { chatId: 'c1', items: [], totalTokens: 0 } },
  { name: 'addLink', call: () => api.addLink('b1', { id: 'c1', url: 'https://a.b', x: 1, y: 2 }), method: 'POST', url: '/api/engine/boards/b1/sources/link', body: { id: 'c1', url: 'https://a.b', x: 1, y: 2 }, resp: card, expected: card },
];

describe('route table', () => {
  it.each(cases)('$name', async (c) => {
    fetchMock.mockResolvedValue(jres(c.resp));
    const out = await c.call();
    const [u, init] = fetchMock.mock.calls[0];
    expect(u).toBe(c.url);
    expect(init.method).toBe(c.method);
    if (c.body !== undefined) expect(JSON.parse(init.body)).toEqual(c.body);
    else expect(init.body).toBeUndefined();
    expect(out).toEqual(c.expected);
  });

  it('deleteBoard sends DELETE and tolerates 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.deleteBoard('b1')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });
  it('deleteEdge tolerates 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await api.deleteEdge('b1', 'e1');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/engine/boards/b1/edges/e1');
  });
});

describe('errors', () => {
  it('maps body error to ApiError', async () => {
    fetchMock.mockResolvedValue(jres({ error: 'card_limit', detail: 'full' }, 409));
    await expect(api.getBoard('b1')).rejects.toMatchObject({ status: 409, code: 'card_limit' });
    fetchMock.mockResolvedValue(jres({ error: 'card_limit' }, 409));
    await expect(api.getBoard('b1')).rejects.toBeInstanceOf(ApiError);
  });
  it('503 without body -> engine_unavailable', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(api.getBoard('b1')).rejects.toMatchObject({ status: 503, code: 'engine_unavailable' });
  });
  it('401 -> unauthorized', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(api.listBoards()).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
  });
});

describe('uploadFile', () => {
  it('rejects > 4MB without fetch', async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], 'big.pdf');
    await expect(api.uploadFile('b1', { id: 'c1', file, x: 0, y: 0 })).rejects.toMatchObject({ status: 413, code: 'too_large' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(MAX_UPLOAD_BYTES).toBe(4 * 1024 * 1024);
  });
  it('sends FormData with optional fields only when set', async () => {
    fetchMock.mockImplementation(async () => jres({ id: 'c1' }, 202));
    await api.uploadFile('b1', { id: 'c1', file: new File(['hi'], 'a.txt'), x: 1, y: 2 });
    const [u, init] = fetchMock.mock.calls[0];
    expect(u).toBe('/api/engine/boards/b1/sources/file');
    expect(init.method).toBe('POST');
    expect(init.headers).toBeUndefined();
    let fd = init.body as FormData;
    expect([...fd.keys()].sort()).toEqual(['file', 'id', 'x', 'y']);
    expect(fd.get('x')).toBe('1');

    await api.uploadFile('b1', { id: 'c2', file: new File(['hi'], 'a.txt'), x: 1, y: 2, deskId: 'd', desc: 'why' });
    fd = fetchMock.mock.calls[1][1].body as FormData;
    expect(fd.get('deskId')).toBe('d');
    expect(fd.get('desc')).toBe('why');
  });
});

describe('streamChat', () => {
  const req: ChatRequest = {
    boardId: 'b1', chatId: 'q1', messageId: 'm1', message: 'hi', model: 'm', systemPrompt: '',
    temperature: null, maxOutputTokens: null, lastKMessages: null, externalContextTopK: 5, webSearch: false,
  };
  it('maps frames and sends V2 field names', async () => {
    fetchMock.mockResolvedValue(
      sseRes([
        'data: {"web_search":{"results":[{"title":"t","url":"u"}]}}\n\n',
        'data: {"message":"Hel"}\n\ndata: {"message":"lo"}\n\n',
        'data: {"summary":"S"}\n\ndata: [DONE]\n\n',
      ])
    );
    const ev: StreamEvent[] = [];
    await api.streamChat(req, (e) => ev.push(e));
    expect(ev).toEqual([
      { type: 'web', results: [{ title: 't', url: 'u' }] },
      { type: 'delta', text: 'Hel' },
      { type: 'delta', text: 'lo' },
      { type: 'summary', text: 'S' },
      { type: 'done' },
    ]);
    const [u, init] = fetchMock.mock.calls[0];
    expect(u).toBe('/api/engine/chat/stream');
    const b = JSON.parse(init.body);
    expect(b).toMatchObject({ nodeId: 'q1', message_id: 'm1', canvasId: 'b1', boardId: 'b1', message: 'hi' });
  });
  it('error frame -> error event', async () => {
    fetchMock.mockResolvedValue(sseRes(['data: {"error":"boom"}\n\ndata: [DONE]\n\n']));
    const ev: StreamEvent[] = [];
    await api.streamChat(req, (e) => ev.push(e));
    expect(ev[0]).toEqual({ type: 'error', message: 'boom' });
  });
  it('body ending without [DONE] -> cut off error, resolves', async () => {
    fetchMock.mockResolvedValue(sseRes(['data: {"message":"par"}\n\n']));
    const ev: StreamEvent[] = [];
    await expect(api.streamChat(req, (e) => ev.push(e))).resolves.toBeUndefined();
    expect(ev.at(-1)).toEqual({ type: 'error', message: 'The answer was cut off' });
  });
  it('abort rejects with AbortError and emits no error', async () => {
    const ac = new AbortController();
    fetchMock.mockImplementation((_u: string, init: RequestInit) =>
      Promise.resolve(
        new Response(
          new ReadableStream({
            start(c) {
              init.signal!.addEventListener('abort', () => c.error(new DOMException('Aborted', 'AbortError')));
            },
          }),
          { status: 200, headers: { 'content-type': 'text/event-stream' } }
        )
      )
    );
    const ev: StreamEvent[] = [];
    const p = api.streamChat(req, (e) => ev.push(e), ac.signal);
    setTimeout(() => ac.abort(), 5);
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    expect(ev).toEqual([]);
  });
  it('HTTP error before stream throws ApiError', async () => {
    fetchMock.mockResolvedValue(jres({ error: 'not_found' }, 404));
    await expect(api.streamChat(req, () => {})).rejects.toMatchObject({ status: 404, code: 'not_found' });
  });
});

describe('hardening', () => {
  const req: ChatRequest = {
    boardId: 'b1', chatId: 'q1', messageId: 'm1', message: 'hi', model: 'm', systemPrompt: '',
    temperature: null, maxOutputTokens: null, lastKMessages: null, externalContextTopK: 5, webSearch: false,
  };
  it('2xx non-JSON body -> ApiError', async () => {
    fetchMock.mockImplementation(async () => new Response('<html>', { status: 200 }));
    await expect(api.getBoard('b1')).rejects.toBeInstanceOf(ApiError);
  });
  it('encodes path ids', async () => {
    fetchMock.mockImplementation(async () => jres({ id: 'x' }));
    await api.getBoard('a/b?c');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/engine/boards/a%2Fb%3Fc');
    expect(api.rawFileUrl('a/b')).toBe('/api/engine/files/a%2Fb/raw');
  });
  it('mid-stream read failure -> cut-off event', async () => {
    fetchMock.mockImplementation(async () =>
      new Response(
        new ReadableStream({
          start(c) { c.enqueue(new TextEncoder().encode('data: {"message":"a"}\n\n')); },
          pull() { throw new Error('net'); },
        }),
        { status: 200, headers: { 'content-type': 'text/event-stream' } }
      )
    );
    const ev: StreamEvent[] = [];
    await api.streamChat(req, (e) => ev.push(e));
    expect(ev.at(-1)).toEqual({ type: 'error', message: 'The answer was cut off' });
  });
  it('onEvent exception propagates, not reported as cut off', async () => {
    fetchMock.mockImplementation(async () => sseRes(['data: {"message":"a"}\n\n', 'data: [DONE]\n\n']));
    const seen: StreamEvent[] = [];
    await expect(
      api.streamChat(req, (e) => { seen.push(e); throw new Error('ui bug'); })
    ).rejects.toThrow('ui bug');
    expect(seen.some((e) => e.type === 'error')).toBe(false);
  });
  it('cancels the reader after [DONE]', async () => {
    const cancel = vi.fn();
    fetchMock.mockImplementation(async () =>
      new Response(
        new ReadableStream({
          start(c) { c.enqueue(new TextEncoder().encode('data: [DONE]\n\n')); },
          cancel,
        }),
        { status: 200, headers: { 'content-type': 'text/event-stream' } }
      )
    );
    await api.streamChat(req, () => {});
    expect(cancel).toHaveBeenCalled();
  });
  it('abort error is a DOMException AbortError', async () => {
    const ac = new AbortController(); ac.abort();
    fetchMock.mockRejectedValue(new DOMException('x', 'AbortError'));
    const e = await api.streamChat(req, () => {}, ac.signal).catch((x) => x);
    expect(e).toBeInstanceOf(DOMException);
    expect(e.name).toBe('AbortError');
  });
});

describe('rawFileUrl', () => {
  it('points at the proxy', () => expect(api.rawFileUrl('c_1')).toBe('/api/engine/files/c_1/raw'));
});
