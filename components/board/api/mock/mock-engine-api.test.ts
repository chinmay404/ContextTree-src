import { ApiError } from '../types';
import type { ChatData, ChatRequest, SourceData, StreamEvent } from '../types';
import { graphOf, nameOf } from '../../lib/graph';
import { computeReads, isRead } from '../../lib/reads';
import { MODELS } from '../../lib/catalog';
import { MockEngineApi, SEED_BOARD_ID } from './mock-engine-api';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const api = (o = {}) => new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0, ...o });
const note = (id: string) => ({ id, kind: 'source' as const, sourceType: 'note' as const, x: 0, y: 0, data: { text: id } });
const req = (over: Partial<ChatRequest> = {}): ChatRequest => ({
  boardId: 'b_seed', chatId: 'side', messageId: 'm1', message: 'hi', model: 'x', systemPrompt: '', temperature: null,
  maxOutputTokens: null, lastKMessages: null, externalContextTopK: 5, webSearch: false, ...over,
});

describe('MockEngineApi', () => {
  it('serves the seed board', async () => {
    const b = await api().getBoard('b_seed');
    expect(b.cards).toHaveLength(16);
    expect(b.edges).toHaveLength(5);
    expect(SEED_BOARD_ID).toBe('b_seed');
  });

  it('createBoard makes <id>_q1 at 0,0', async () => {
    const m = api();
    const b = await m.createBoard({ id: 'b_x', title: 'T' });
    expect(b.cards.map((c) => [c.id, c.x, c.y, (c.data as ChatData).name])).toEqual([['b_x_q1', 0, 0, 'T']]);
    expect((b.cards[0].data as ChatData).model).toBe('openai/gpt-5-mini');
    expect((await m.listBoards()).map((s) => s.id)).toContain('b_x');
  });

  it('creates are idempotent', async () => {
    const m = api();
    const n = (await m.getBoard('b_seed')).cards.length;
    const a = await m.createCard('b_seed', note('c1'));
    const b = await m.createCard('b_seed', note('c1'));
    expect(b).toEqual(a);
    expect((await m.getBoard('b_seed')).cards).toHaveLength(n + 1);
  });

  it('a branch gets lin_<id>', async () => {
    const m = api();
    await m.createCard('b_seed', { id: 'c1', kind: 'chat', x: 0, y: 0, parentId: 'main', data: { name: 'Q' } });
    const b = await m.getBoard('b_seed');
    expect(b.edges).toContainEqual(expect.objectContaining({ id: 'lin_c1', kind: 'lineage', from: 'main', to: 'c1' }));
  });

  it('50 live cards → 409 card_limit', async () => {
    const m = api();
    for (let i = 0; i < 34; i++) await m.createCard('b_seed', note('f' + i));
    await expect(m.createCard('b_seed', note('over'))).rejects.toMatchObject({ status: 409, code: 'card_limit' });
  });

  it('updateCard merges data key by key and checks deskId', async () => {
    const m = api();
    const c = await m.updateCard('b_seed', 'pdf', { data: { desc: 'x' } });
    expect((c.data as SourceData).title).toBe('Pricing survey 2025');
    expect((c.data as SourceData).desc).toBe('x');
    await expect(m.updateCard('b_seed', 'pdf', { deskId: 'csv' })).rejects.toMatchObject({ status: 400, code: 'invalid' });
    expect((await m.updateCard('b_seed', 'pdf', { deskId: null })).deskId).toBeNull();
    expect((await m.updateCard('b_seed', 'pdf', { data: { desc: 'y' } })).deskId).toBeNull();
    expect((await m.updateCard('b_seed', 'csv', { deskId: 'main' })).deskId).toBe('main');
  });

  it('edges: duplicate and not_allowed', async () => {
    const m = api();
    await expect(m.createEdge('b_seed', { id: 'e1', kind: 'wire', from: 'csv', to: 'deep' })).rejects.toMatchObject({ status: 409, code: 'duplicate' });
    await expect(m.createEdge('b_seed', { id: 'e2', kind: 'answer', from: 'main', to: 'deep' })).rejects.toMatchObject({ code: 'not_allowed' });
    await expect(m.createEdge('b_seed', { id: 'e3', kind: 'wire', from: 'pdf', to: 'main' })).rejects.toMatchObject({ code: 'not_allowed' });
    await expect(m.deleteEdge('b_seed', 'lin_side')).rejects.toMatchObject({ status: 400 });
    const e = await m.createEdge('b_seed', { id: 'e4', kind: 'wire', from: 'csv', to: 'main' });
    expect(e).toMatchObject({ id: 'e4', kind: 'wire', from: 'csv', to: 'main' });
    await m.deleteEdge('b_seed', 'e4');
    expect((await m.getBoard('b_seed')).edges.find((x) => x.id === 'e4')).toBeUndefined();
  });

  it('deleting a chat takes its subtree and frees its desk; restore undoes it', async () => {
    const m = api();
    expect((await m.deleteCard('b_seed', 'second')).sort()).toEqual(['deep', 'second']);
    const b = await m.getBoard('b_seed');
    expect(b.cards.find((c) => c.id === 'web')!.deskId).toBeNull();
    expect(b.cards.find((c) => c.id === 'deep')).toBeUndefined();
    expect(b.edges.find((e) => e.id === 'e_seed_side_deep')).toBeUndefined();
    expect((await m.restoreCard('b_seed', 'second')).sort()).toEqual(['deep', 'second']);
    expect((await m.getBoard('b_seed')).cards.find((c) => c.id === 'web')!.deskId).toBe('second');
  });

  it('getReads matches computeReads and rejects a source', async () => {
    const m = api();
    const board = await m.getBoard('b_seed');
    expect(await m.getReads('b_seed', 'deep')).toEqual(computeReads(graphOf(board), 'deep'));
    await expect(m.getReads('b_seed', 'pdf')).rejects.toMatchObject({ status: 400 });
  });

  it('savePositions moves known ids, ignores unknown', async () => {
    const m = api();
    await m.savePositions('b_seed', [{ id: 'pdf', x: 1, y: 2 }, { id: 'nope', x: 0, y: 0 }]);
    const pdf = (await m.getBoard('b_seed')).cards.find((c) => c.id === 'pdf')!;
    expect([pdf.x, pdf.y]).toEqual([1, 2]);
  });

  it('uploads: cap, types, ingest', async () => {
    const m = api();
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'a.pdf');
    await expect(m.uploadFile('b_seed', { id: 'c1', file: big, x: 0, y: 0 })).rejects.toMatchObject({ status: 413, code: 'too_large' });
    await expect(m.uploadFile('b_seed', { id: 'c2', file: new File(['x'], 'a.mov'), x: 0, y: 0 })).rejects.toMatchObject({ status: 415, code: 'unsupported_type' });
    const c = await m.uploadFile('b_seed', { id: 'c3', file: new File(['hi'], 'n.md'), x: 0, y: 0 });
    expect(c.status).toBe('processing');
    expect(c.sourceType).toBe('doc');
    expect((c.data as SourceData).meta).toBe('Document · 1 KB');
    await sleep(30);
    const r = (await m.getBoard('b_seed')).cards.find((x) => x.id === 'c3')!;
    expect(r.status).toBe('ready');
    expect((r.data as SourceData).text).toBe('hi');
    expect((r.data as SourceData).excerpts).toEqual([{ loc: null, text: 'Read in full.', on: true }]);
    expect(m.rawFileUrl('c3')).toMatch(/^blob:/);
    expect(m.rawFileUrl('pdf')).toBeNull();
  });

  it('uploads: types map, broken fails, soon kinds', async () => {
    const m = api();
    const kinds: [string, string, string][] = [['a.pdf', 'pdf', 'processing'], ['a.csv', 'csv', 'processing'], ['a.docx', 'doc', 'processing'],
      ['a.png', 'image', 'soon'], ['a.webp', 'image', 'soon'], ['a.mp3', 'audio', 'soon'], ['a.wav', 'audio', 'soon']];
    for (const [i, [name, type, status]] of kinds.entries()) {
      const c = await m.uploadFile('b_seed', { id: 'k' + i, file: new File(['x'], name), x: 0, y: 0, deskId: 'main', desc: 'd' });
      expect([c.sourceType, c.status, c.deskId]).toEqual([type, status, 'main']);
    }
    await m.uploadFile('b_seed', { id: 'bad', file: new File(['x'], 'broken.pdf'), x: 0, y: 0 });
    await sleep(30);
    const bad = (await m.getBoard('b_seed')).cards.find((c) => c.id === 'bad')!;
    expect(bad.status).toBe('failed');
    expect((bad.data as SourceData).error).toBe("Couldn't read this file.");
  });

  it('links: youtube is soon with ytid; private hosts are invalid', async () => {
    const m = api();
    const y = await m.addLink('b_seed', { id: 'l1', url: 'https://youtu.be/abc', x: 0, y: 0 });
    expect([y.sourceType, y.status, (y.data as SourceData).ytid, (y.data as SourceData).title]).toEqual(['video', 'soon', 'abc', 'YouTube video']);
    const y2 = await m.addLink('b_seed', { id: 'l2', url: 'https://www.youtube.com/watch?v=xyz', x: 0, y: 0 });
    expect((y2.data as SourceData).ytid).toBe('xyz');
    for (const [i, u] of ['http://localhost/x', 'http://127.0.0.1/', 'http://10.0.0.1/', 'http://192.168.1.1/', 'ftp://a.com/x', 'nope'].entries()) {
      await expect(m.addLink('b_seed', { id: 'bad' + i, url: u, x: 0, y: 0 })).rejects.toMatchObject({ status: 400, code: 'invalid' });
    }
    const w = await m.addLink('b_seed', { id: 'l3', url: 'https://example.com/a/b', x: 0, y: 0 });
    expect([w.sourceType, w.status, (w.data as SourceData).meta, (w.data as SourceData).title]).toEqual(['web', 'processing', 'example.com', 'example.com/a/b']);
    await sleep(30);
    const r = (await m.getBoard('b_seed')).cards.find((c) => c.id === 'l3')!;
    expect(r.status).toBe('ready');
    expect((r.data as SourceData).excerpts).toEqual([{ loc: '§ 1', text: 'Page read.', on: true }]);
  });

  it('streams the canned answer and stores <mid>_u/_a', async () => {
    const m = api();
    const ev: StreamEvent[] = [];
    await m.streamChat(req(), (e) => ev.push(e));
    const text = ev.filter((e) => e.type === 'delta').map((e) => (e as { text: string }).text).join('');
    const g = graphOf(await m.getBoard('b_seed'));
    const names = computeReads(g, 'side').items.filter(isRead).map((i) => nameOf(g, g.cards.get(i.cardId)!));
    expect(text).toBe(`(Teacher) Reading ${names[0]} and ${names[1]}: try $12 a month with ten real users before you decide, and ask what they'd pay before you show a number.`);
    expect(ev.at(-1)).toEqual({ type: 'done' });
    expect((await m.getMessages('b_seed', 'side')).slice(-2).map((x) => x.id)).toEqual(['m1_u', 'm1_a']);
    const side = (await m.getBoard('b_seed')).cards.find((c) => c.id === 'side')!;
    expect(side.messageCount).toBe(4);
    expect(side.lastMessage?.role).toBe('assistant');
  });

  it('stream wording: more than two reads, none, web search, regenerate', async () => {
    const m = api();
    const run = async (r: ChatRequest) => {
      const ev: StreamEvent[] = [];
      await m.streamChat(r, (e) => ev.push(e));
      return ev;
    };
    const joined = (ev: StreamEvent[]) => ev.filter((e) => e.type === 'delta').map((e) => (e as { text: string }).text).join('');
    const g = graphOf(await m.getBoard('b_seed'));
    const n = computeReads(g, 'second').items.filter(isRead).length;
    expect(joined(await run(req({ chatId: 'second', messageId: 'a' })))).toMatch(new RegExp(`^\\(Skeptic\\) Reading .+ and .+ plus ${n - 2} more: try`));
    await m.createCard('b_seed', { id: 'empty', kind: 'chat', x: 0, y: 0, data: { name: 'E' } });
    const ev = await run(req({ chatId: 'empty', messageId: 'b', webSearch: true }));
    expect(ev[0]).toEqual({ type: 'web', results: [{ title: 'Pricing pages compared', url: 'https://example.com/pricing' }] });
    expect(joined(ev)).toMatch(/^Nothing on this desk yet, so going on the conversation alone: try/);
    await run(req({ chatId: 'empty', messageId: 'c', regenerateLastUser: true }));
    const msgs = await m.getMessages('b_seed', 'empty');
    expect(msgs.map((x) => x.id)).toEqual(['b_u', 'c_a']);
    expect(msgs.map((x) => x.position)).toEqual([0, 1]);
  });

  it('abort stops the stream and stores no answer', async () => {
    const m = api({ wordMs: 5 });
    await m.streamChat(req({ messageId: 'm1' }), () => {});
    const ac = new AbortController();
    const got: StreamEvent[] = [];
    const p = m.streamChat(req({ messageId: 'm2' }), (e) => { got.push(e); ac.abort(); }, ac.signal);
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    expect(got).toHaveLength(1);
    await sleep(30);
    expect(got).toHaveLength(1);
    expect((await m.getMessages('b_seed', 'side')).at(-1)!.id).toBe('m2_u');
  });

  it('failNext rejects the next call only', async () => {
    const m = api();
    m.failNext('createEdge', new ApiError(500, 'boom'));
    const e = { id: 'e9', kind: 'wire' as const, from: 'csv', to: 'main' };
    await expect(m.createEdge('b_seed', e)).rejects.toMatchObject({ status: 500, code: 'boom' });
    await expect(m.createEdge('b_seed', e)).resolves.toMatchObject({ id: 'e9' });
    expect(m.calls.map((c) => c.method)).toEqual(['createEdge', 'createEdge']);
  });

  it('results are clones and createdAt strictly increases', async () => {
    const m = api();
    const b = await m.getBoard('b_seed');
    b.cards[0].x = 999;
    expect((await m.getBoard('b_seed')).cards[0].x).not.toBe(999);
    const a1 = await m.createCard('b_seed', note('t1'));
    const a2 = await m.createCard('b_seed', note('t2'));
    expect(a2.createdAt > a1.createdAt).toBe(true);
    expect(a1.createdAt > '2026-10-19T11:31:00.000Z').toBe(true);
  });

  // contract Clarifications
  it('a foreign id is a duplicate', async () => {
    const m = api({ foreignIds: ['c_x', 'b_f', 'e_f'] });
    await expect(m.createCard('b_seed', note('c_x'))).rejects.toMatchObject({ status: 409, code: 'duplicate' });
    await expect(m.createBoard({ id: 'b_f', title: 'T' })).rejects.toMatchObject({ status: 409, code: 'duplicate' });
    await expect(m.createEdge('b_seed', { id: 'e_f', kind: 'wire', from: 'csv', to: 'main' })).rejects.toMatchObject({ status: 409, code: 'duplicate' });
  });

  it('messages of a source are invalid; an edge to a missing card is 404', async () => {
    const m = api();
    await expect(m.getMessages('b_seed', 'pdf')).rejects.toMatchObject({ status: 400, code: 'invalid' });
    await expect(m.createEdge('b_seed', { id: 'e5', kind: 'wire', from: 'csv', to: 'nope' })).rejects.toMatchObject({ status: 404 });
    await m.createBoard({ id: 'b_o', title: 'O' });
    await expect(m.createEdge('b_o', { id: 'e6', kind: 'wire', from: 'csv', to: 'b_o_q1' })).rejects.toMatchObject({ status: 404 });
  });

  it('restore under a deleted parent is not allowed', async () => {
    const m = api();
    await m.deleteCard('b_seed', 'deep');
    await m.deleteCard('b_seed', 'second');
    await expect(m.restoreCard('b_seed', 'deep')).rejects.toMatchObject({ status: 409, code: 'not_allowed' });
  });

  it('restore past 50 live cards hits card_limit', async () => {
    const m = api();
    await m.deleteCard('b_seed', 'second');
    const live = (await m.getBoard('b_seed')).cards.length;
    for (let i = 0; i < 50 - live; i++) await m.createCard('b_seed', note('f' + i));
    await expect(m.restoreCard('b_seed', 'second')).rejects.toMatchObject({ status: 409, code: 'card_limit' });
  });

  it('re-posting a source id returns it without a second ingest', async () => {
    const m = api({ ingestMs: 20 });
    const f = new File(['hi'], 'n.md');
    const a = await m.uploadFile('b_seed', { id: 'c3', file: f, x: 0, y: 0 });
    await sleep(40);
    const ready = (await m.getBoard('b_seed')).cards.find((c) => c.id === 'c3')!;
    const b = await m.uploadFile('b_seed', { id: 'c3', file: f, x: 0, y: 0 });
    expect(a.status).toBe('processing');
    expect(b.status).toBe('ready');
    expect(b.updatedAt).toBe(ready.updatedAt);
    await sleep(40);
    expect((await m.getBoard('b_seed')).cards.find((c) => c.id === 'c3')!.updatedAt).toBe(ready.updatedAt);
    const l1 = await m.addLink('b_seed', { id: 'l9', url: 'https://example.com/', x: 0, y: 0 });
    const l2 = await m.addLink('b_seed', { id: 'l9', url: 'https://example.com/', x: 0, y: 0 });
    expect(l2).toEqual(l1);
    expect((await m.getBoard('b_seed')).cards.filter((c) => c.id === 'l9')).toHaveLength(1);
  });

  it('lineage edges only between live cards', async () => {
    const m = api();
    await m.deleteCard('b_seed', 'deep');
    expect((await m.getBoard('b_seed')).edges.find((e) => e.id === 'lin_deep')).toBeUndefined();
  });

  it('a stream on another board is refused', async () => {
    const m = api();
    await m.createBoard({ id: 'b_other', title: 'O' });
    await expect(m.streamChat(req({ boardId: 'b_other' }), () => {})).rejects.toMatchObject({ status: 404 });
    await expect(m.streamChat(req({ chatId: 'pdf' }), () => {})).rejects.toMatchObject({ status: 404 });
    await m.deleteCard('b_seed', 'side');
    await expect(m.streamChat(req(), () => {})).rejects.toMatchObject({ status: 404 });
  });

  it('switched-off members are never read', async () => {
    const m = api();
    expect((await m.getReads('b_seed', 'second')).items.some((i) => i.cardId === 'interviews_2')).toBe(true);
    await m.updateCard('b_seed', 'interviews_2', { data: { off: true } });
    expect((await m.getReads('b_seed', 'second')).items.some((i) => i.cardId === 'interviews_2')).toBe(false);
  });
  describe('board previews', () => {
    it('lists the seed board with a preview of its live cards minus pile members', async () => {
      const m = api();
      const board = await m.getBoard('b_seed');
      const [sum] = await m.listBoards();
      const members = board.cards.filter((c) => c.pileId).length;
      expect(members).toBeGreaterThan(0);
      expect(sum.preview!.cards).toHaveLength(board.cards.length - members);
      expect(sum.preview!.cards.some((c) => c.id.startsWith('interviews_'))).toBe(false);
      expect(sum.preview!.cards.some((c) => c.id === 'interviews')).toBe(true);
    });

    it('names chats (60 characters at most), not sources, and carries lineage by parentId', async () => {
      const m = api();
      await m.createCard('b_seed', { id: 'long', kind: 'chat', x: 0, y: 0, parentId: 'main', data: { name: 'x'.repeat(100) } });
      const cards = (await m.listBoards())[0].preview!.cards;
      const chat = cards.find((c) => c.id === 'long')!;
      expect(chat.name).toHaveLength(60);
      expect(chat.parentId).toBe('main');
      expect(cards.filter((c) => c.kind === 'source').every((c) => c.name === undefined)).toBe(true);
      expect(cards.filter((c) => c.kind === 'chat').every((c) => typeof c.name === 'string')).toBe(true);
    });

    it('has wire and answer edges only, and a created wire shows up', async () => {
      const m = api();
      const before = (await m.listBoards())[0].preview!.edges;
      expect(before.map((e) => e.kind).sort()).toEqual(['answer', 'wire']);
      await m.createEdge('b_seed', { id: 'w1', kind: 'wire', from: 'pdf', to: 'side' });
      const after = (await m.listBoards())[0].preview!.edges;
      expect(after).toHaveLength(before.length + 1);
      expect(after).toContainEqual({ kind: 'wire', from: 'pdf', to: 'side' });
      expect(after.every((e) => 'kind' in e && !('id' in e))).toBe(true);
    });

    it('drops edges whose end is a pile member or deleted, and cards deleted from the board', async () => {
      const m = api();
      await m.createEdge('b_seed', { id: 'w2', kind: 'wire', from: 'interviews_1', to: 'side' }).catch(() => undefined);
      const p = (await m.listBoards())[0].preview!;
      const ids = new Set(p.cards.map((c) => c.id));
      expect(p.edges.every((e) => ids.has(e.from) && ids.has(e.to))).toBe(true);
    });

    it('only the 24 most recently updated boards have a preview', async () => {
      const m = api({ seed: false });
      for (let i = 0; i < 25; i++) await m.createBoard({ id: `b${i}`, title: `B${i}` });
      const list = await m.listBoards();
      expect(list).toHaveLength(25);
      expect(list.slice(0, 24).every((b) => b.preview)).toBe(true);
      expect(list[24].id).toBe('b0');
      expect(list[24].preview).toBeUndefined();
    });
  });

  describe('BYOK keys', () => {
    const run = async (m: MockEngineApi, model: string) => {
      const ev: StreamEvent[] = [];
      await m.streamChat(req({ model }), (e) => ev.push(e));
      return ev;
    };

    it('a model whose provider has no key emits one missing_key error and no delta', async () => {
      const m = api();
      m.setKeys(['google']);
      expect(await run(m, MODELS.claude.engineId)).toEqual([
        { type: 'error', code: 'missing_key', provider: 'anthropic', message: 'No Anthropic key' },
      ]);
    });

    it('a keyed provider streams normally, and by default every provider is keyed', async () => {
      const m = api();
      m.setKeys(['google']);
      expect((await run(m, MODELS.gemini.engineId)).some((e) => e.type === 'delta')).toBe(true);
      m.setKeys('all');
      expect((await run(m, MODELS.claude.engineId)).some((e) => e.type === 'delta')).toBe(true);
      expect((await run(api(), MODELS.kimi.engineId)).some((e) => e.type === 'delta')).toBe(true);
    });

    it('a missing key stores no question, so the re-ask is clean', async () => {
      const m = api();
      m.setKeys([]);
      await run(m, MODELS.claude.engineId);
      expect((await m.getMessages('b_seed', 'side')).length).toBe(2);
    });

    it('a model the mock cannot place on a provider is not blocked', async () => {
      expect((await run(api(), 'z-ai/glm-5.2')).some((e) => e.type === 'delta')).toBe(true);
    });
  });
});
