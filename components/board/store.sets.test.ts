import type { SourceData } from './api/types';
import { MockEngineApi } from './api/mock/mock-engine-api';
import { membersOf } from './lib/graph';
import { BoardStore } from './store';

const flush = async () => { for (let i = 0; i < 14; i++) await new Promise((r) => setTimeout(r, 0)); };
let m: MockEngineApi;
let s: BoardStore;
const calls = (name: string) => m.calls.filter((c) => c.method === name);
const snap = () => s.getSnapshot();
const card = (id: string) => snap().cards.get(id)!;
const data = (id: string) => card(id).data as SourceData;
const wired = (from: string, to: string) => [...snap().edges.values()].some((e) => e.kind === 'wire' && e.from === from && e.to === to);
const members = (id: string) => membersOf(s.graph(), id).map((c) => c.id).sort();

beforeEach(async () => {
  m = new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
  s = new BoardStore(m, 'b_seed', { readsDebounceMs: 5, toastMs: 5000 });
  await s.load();
});
afterEach(() => { s.dispose(); vi.useRealTimers(); });

describe('source sets', () => {
  it('a new set is an empty pile drawn open, with a name, where it was made', async () => {
    const id = s.makeSet([100, 200], null);
    expect(card(id)).toMatchObject({ kind: 'source', sourceType: 'pile', x: 100, y: 200, deskId: null, status: 'ready' });
    expect(data(id)).toMatchObject({ title: 'New set', layout: 'open', meta: 'Empty set' });
    expect(members(id)).toEqual([]);
    await flush();
    expect(calls('createCard').at(-1)!.args[1]).toMatchObject({ id, sourceType: 'pile', data: { layout: 'open', title: 'New set' } });
  });

  it('a set started from a source holds it, stands where it stood and takes its strings', async () => {
    const before = card('csv');
    const id = s.makeSet([before.x, before.y], before.deskId, 'csv');
    await flush();
    expect(members(id)).toEqual(['csv']);
    expect(card('csv')).toMatchObject({ pileId: id, deskId: null });
    expect(data(id).meta).toBe('1 source');
    expect(wired(id, 'deep')).toBe(true);        // the CSV was strung into Q1.2.1: the set now is
    expect(wired('csv', 'deep')).toBe(false);
  });

  it('dropping a source onto a set adds it and keeps the set open and named', async () => {
    const id = s.makeSet([0, 0], null);
    s.patchCard(id, { data: { title: 'Pricing papers' } });
    s.makePile('pdf', id, [0, 0]);
    s.makePile('web', id, [0, 0]);
    await flush();
    expect(members(id)).toEqual(['pdf', 'web']);
    expect(data(id)).toMatchObject({ title: 'Pricing papers', layout: 'open', meta: '2 sources' });
    expect(card('pdf').pileId).toBe(id);
  });

  it('a source can be taken back out: it is loose again beside the set, and the count follows', async () => {
    const id = s.makeSet([300, 300], null);
    s.makePile('pdf', id, [0, 0]); s.makePile('web', id, [0, 0]);
    await flush();
    s.takeOut('pdf');
    await flush();
    expect(card('pdf')).toMatchObject({ pileId: null, deskId: null });
    expect(card('pdf').x).toBeGreaterThan(300);
    expect(members(id)).toEqual(['web']);
    expect(data(id).meta).toBe('1 source');
    s.takeOut('web'); await flush();
    expect(data(id).meta).toBe('Empty set');
    expect(snap().cards.has(id)).toBe(true);          // an empty set stays: it is a box waiting for documents
  });

  it('collapse into a pile and open again: one PATCH of data.layout, members untouched', async () => {
    const id = s.makeSet([0, 0], null);
    s.makePile('pdf', id, [0, 0]); await flush();
    const n = calls('updateCard').length;
    s.setLayout(id, null);
    expect(data(id).layout ?? null).toBeNull();
    s.setLayout(id, 'open');
    expect(data(id).layout).toBe('open');
    await flush();
    expect(calls('updateCard').slice(n).map((c) => (c.args[2] as { data: object }).data)).toEqual([{ layout: null }, { layout: 'open' }]);
    expect(members(id)).toEqual(['pdf']);
    s.setLayout(id, 'open');                           // already open: nothing to send
    await flush();
    expect(calls('updateCard').length).toBe(n + 2);
  });

  it('a pile can be opened as a set, and a set closed into a pile', () => {
    expect(data('interviews').layout ?? null).toBeNull();
    s.setLayout('interviews', 'open');
    expect(data('interviews').layout).toBe('open');
    expect(members('interviews').length).toBe(4);
  });

  it('strung to two chats, both read every member', async () => {
    const id = s.makeSet([0, 0], null);
    s.makePile('pdf', id, [0, 0]); s.makePile('web', id, [0, 0]); await flush();
    expect(s.connect('wire', id, 'side')).toBeTruthy();
    expect(s.connect('wire', id, 'second')).toBeTruthy();
    await flush();
    for (const chat of ['side', 'second']) {
      const read = s.readsOf(chat).items.map((i) => i.cardId);
      expect(read, chat).toEqual(expect.arrayContaining(['pdf', 'web']));
    }
    expect(calls('createEdge').filter((c) => (c.args[1] as { from: string }).from === id).length).toBe(2);
  });

  it('a set that is dropped a new file keeps the file as a member while it is still being read', async () => {
    const id = s.makeSet([0, 0], null);
    const f = s.createSourceFromFile(new File(['x'], 'notes.txt', { type: 'text/plain' }), [10, 10], null, 'single');
    s.makePile(f, id, [0, 0]);
    await flush();
    expect(members(id)).toEqual([f]);
    expect(card(f).pileId).toBe(id);
  });

  describe('deleting a set', () => {
    it('an empty set is removed at once', async () => {
      const id = s.makeSet([0, 0], null); await flush();
      s.requestDelete(id);
      expect(snap().ui.confirm).toBeNull();
      await flush();
      expect(snap().cards.has(id)).toBe(false);
    });

    it('asks, and its first choice keeps the sources', async () => {
      const id = s.makeSet([0, 0], null);
      s.makePile('pdf', id, [0, 0]); s.makePile('web', id, [0, 0]); await flush();
      s.requestDelete(id);
      expect(snap().ui.confirm).toMatchObject({ cardId: id, text: 'Delete the set "New set"?', pile: { count: 2, set: true } });
      await s.confirmDelete('one'); await flush();
      expect(snap().cards.has(id)).toBe(false);
      expect(card('pdf').pileId).toBeNull();
      expect(card('web').pileId).toBeNull();
    });

    it('its second choice deletes the sources with it', async () => {
      const id = s.makeSet([0, 0], null);
      s.makePile('pdf', id, [0, 0]); s.makePile('web', id, [0, 0]); await flush();
      s.requestDelete(id);
      await s.confirmDelete('all'); await flush();
      for (const gone of [id, 'pdf', 'web']) expect(snap().cards.has(gone), gone).toBe(false);
    });
  });
});
