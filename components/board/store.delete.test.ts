import { ApiError, type Reads, type SourceData } from './api/types';
import { tokensRead } from './lib/reads';
import { MockEngineApi } from './api/mock/mock-engine-api';
import { BoardStore } from './store';

const flush = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)); };
let m: MockEngineApi;
let s: BoardStore;
const snap = () => s.getSnapshot();
const calls = (name: string) => m.calls.filter((c) => c.method === name);
const live = () => [...snap().cards.values()];

beforeEach(async () => {
  m = new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
  s = new BoardStore(m, 'b_seed', { readsDebounceMs: 5, toastMs: 10000 });
  await s.load();
});
afterEach(() => { s.dispose(); vi.useRealTimers(); });

const server = async (id: string) => (await m.getBoard('b_seed')).cards.find((c) => c.id === id);

describe('delete flushes pending writes first (R1 item 1)', () => {
  it('a note typed just before Delete keeps its text through Undo, in the store and on the server', async () => {
    s.patchDataDebounced('note', { text: 'typed just now' });
    s.requestDelete('note');
    await flush();
    const order = m.calls.map((c) => c.method).filter((x) => x === 'updateCard' || x === 'deleteCard');
    expect(order).toEqual(['updateCard', 'deleteCard']);
    await s.undo();
    await flush();
    expect((snap().cards.get('note')!.data as SourceData).text).toBe('typed just now');
    expect(((await server('note'))!.data as SourceData).text).toBe('typed just now');
  });

  it('the DELETE waits for a patch that is still in flight', async () => {
    s.patchCard('pdf', { data: { desc: 'edited' } });
    s.requestDelete('pdf');
    await flush();
    const order = m.calls.map((c) => c.method).filter((x) => x === 'updateCard' || x === 'deleteCard');
    expect(order).toEqual(['updateCard', 'deleteCard']);
  });

  it('a card dragged and deleted before its position settled returns where it was dropped', async () => {
    s.setViewProbe({ front: () => 0, pos: (id) => (id === 'csv' ? [900, 640] : null) });
    s.requestDelete('csv');
    await flush();
    await s.undo();
    await flush();
    expect([snap().cards.get('csv')!.x, snap().cards.get('csv')!.y]).toEqual([900, 640]);
    const srv = await server('csv');
    expect([srv!.x, srv!.y]).toEqual([900, 640]);
  });
});

describe('deleting a pile asks which (R1 item 2)', () => {
  const members = () => live().filter((c) => c.pileId === 'interviews');

  it('requestDelete on a pile opens the confirm with the front file and the member count', () => {
    s.setViewProbe({ front: () => 1, pos: () => null });
    s.requestDelete('interviews');
    expect(snap().ui.confirm).toMatchObject({ cardId: 'interviews', pile: { frontId: 'interviews_2', front: 'Marco, agency lead', count: 4 } });
    expect(snap().cards.has('interviews')).toBe(true);
  });

  it('Delete one removes only the front member; the pile keeps the rest', async () => {
    s.requestDelete('interviews');
    await s.confirmDelete('one');
    await flush();
    expect(snap().cards.has('interviews_1')).toBe(false);
    expect(snap().cards.has('interviews')).toBe(true);
    expect(members().map((c) => c.id)).toEqual(['interviews_2', 'interviews_3', 'interviews_4']);
    expect(snap().ui.toast).toMatchObject({ text: 'Removed Priya, indie developer', undoCardId: 'interviews_1' });
    await s.undo();
    await flush();
    expect(members()).toHaveLength(4);
  });

  it('Delete one on a pile of two unpiles the one left, where the pile stood', async () => {
    s.requestDelete('interviews');
    await s.confirmDelete('one');
    await flush();
    s.requestDelete('interviews');
    await s.confirmDelete('one');
    await flush();
    s.requestDelete('interviews');
    await s.confirmDelete('one');
    await flush();
    expect(snap().cards.has('interviews')).toBe(false);
    const left = snap().cards.get('interviews_4')!;
    expect(left.pileId).toBeNull();
    expect([left.x, left.y]).toEqual([1140, 410]);
    expect(left.deskId).toBe('second');
  });

  it('Delete all removes the pile and every member; one Undo brings them back, still piled', async () => {
    s.requestDelete('interviews');
    await s.confirmDelete('all');
    await flush();
    expect(live().some((c) => c.id === 'interviews' || c.id.startsWith('interviews_'))).toBe(false);
    expect(snap().ui.toast).toMatchObject({ text: 'Removed Customer interviews and its 4 files', undoCardId: 'interviews' });
    await s.undo();
    await flush();
    expect(snap().cards.has('interviews')).toBe(true);
    expect(members().map((c) => c.id).sort()).toEqual(['interviews_1', 'interviews_2', 'interviews_3', 'interviews_4']);
    expect(snap().cards.get('interviews')!.deskId).toBe('second');
    const board = await m.getBoard('b_seed');
    expect(board.cards.filter((c) => c.pileId === 'interviews')).toHaveLength(4);
  });

  it('afterwards no two live cards share a position', async () => {
    for (const mode of ['one', 'all'] as const) {
      const st = new BoardStore(new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 }), 'b_seed');
      await st.load();
      st.requestDelete('interviews');
      await st.confirmDelete(mode);
      await flush();
      const seen = new Map<string, string>();
      for (const c of st.getSnapshot().cards.values()) {
        if (c.pileId) continue;   // members of a live pile are drawn as the pile
        const k = `${c.x},${c.y}`;
        expect(seen.has(k), `${c.id} stacked on ${seen.get(k)}`).toBe(false);
        seen.set(k, c.id);
      }
      st.dispose();
    }
  });

  it('a chat keeps its confirm and a plain source still deletes at once', () => {
    s.requestDelete('deep');
    expect(snap().ui.confirm!.pile).toBeUndefined();
    s.cancelConfirm();
    s.requestDelete('csv');
    expect(snap().ui.confirm).toBeNull();
    expect(snap().cards.has('csv')).toBe(false);
  });
});


describe('R1 review round 1', () => {
  it('I2: token figures come from the engine only: kept through a stale window and after a failed getReads', async () => {
    class Eng extends MockEngineApi {
      async getReads(b: string, c: string): Promise<Reads> { const r = await super.getReads(b, c); return { ...r, items: r.items.map((i) => ({ ...i, tokens: 777 })) }; }
    }
    const e = new Eng({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
    const st = new BoardStore(e, 'b_seed', { readsDebounceMs: 5 });
    await st.load();
    const figure = () => tokensRead(st.graph(), st.engineReads('main')?.items ?? [], st.graph().cards.get('pdf')!);
    expect(figure()).toBe(777);
    st.patchCard('pdf', { data: { desc: 'typing' } });
    expect(figure()).toBe(777);                       // stale window: the last engine figure, not the mock estimate
    await flush();
    expect(figure()).toBe(777);
    e.failNext('getReads', new ApiError(500, 'internal'));
    st.patchCard('pdf', { data: { desc: 'again' } });
    await flush();
    expect(figure()).toBe(777);                       // failed refresh: still the engine's
    expect(new BoardStore(e, 'b_seed').engineReads('main')).toBeNull();   // nothing loaded: no figure at all
    st.dispose();
  });

  const reduceToTwo = async () => {
    for (let i = 0; i < 2; i++) { s.requestDelete('interviews'); await s.confirmDelete('one'); await flush(); }
  };

  it('M1: Undo of "Delete one" on a pile of two restores the pile, with its title, spot and both members', async () => {
    await reduceToTwo();
    s.requestDelete('interviews'); await s.confirmDelete('one'); await flush();
    expect(snap().cards.has('interviews')).toBe(false);
    await s.undo(); await flush();
    const pile = snap().cards.get('interviews')!;
    expect([pile.x, pile.y, (pile.data as SourceData).title]).toEqual([1140, 410, 'Customer interviews']);
    expect(live().filter((c) => c.pileId === 'interviews').map((c) => c.id).sort()).toEqual(['interviews_3', 'interviews_4']);
    const board = await m.getBoard('b_seed');
    expect(board.cards.filter((c) => c.pileId === 'interviews')).toHaveLength(2);
    expect(board.cards.some((c) => c.id === 'interviews')).toBe(true);
  });

  it('M2: Undo tries every root and keeps an Undo toast for the ones that failed', async () => {
    class Eng extends MockEngineApi {
      failRestore = '';
      async restoreCard(b: string, id: string): Promise<string[]> { if (id === this.failRestore) { this.failRestore = ''; throw new ApiError(500, 'internal'); } return super.restoreCard(b, id); }
    }
    const e = new Eng({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
    const st = new BoardStore(e, 'b_seed', { readsDebounceMs: 5, toastMs: 10000 });
    await st.load();
    st.requestDelete('interviews'); await st.confirmDelete('all'); await flush();
    e.failRestore = 'interviews_2';
    await st.undo(); await flush();
    const ids = () => [...st.getSnapshot().cards.keys()].filter((k) => k.startsWith('interviews'));
    expect(ids().sort()).toEqual(['interviews', 'interviews_1', 'interviews_3', 'interviews_4']);   // the others came back
    expect(st.getSnapshot().ui.toast!.undoCardId).toBe('interviews_2');
    await st.undo(); await flush();
    expect(ids()).toHaveLength(5);
    st.dispose();
  });

  it('M3: if the unpile fails, the front member is not deleted', async () => {
    await reduceToTwo();
    m.failNext('updateCard', new ApiError(500, 'internal'));
    s.requestDelete('interviews'); await s.confirmDelete('one'); await flush();
    expect(calls('deleteCard').filter((c) => String(c.args[1]).startsWith('interviews_'))).toHaveLength(2);   // only the first two deletes
    const board = await m.getBoard('b_seed');
    expect(board.cards.filter((c) => c.id.startsWith('interviews_'))).toHaveLength(2);
    expect(live().filter((c) => c.id.startsWith('interviews_'))).toHaveLength(2);
    expect(live().filter((c) => c.pileId === 'interviews')).toHaveLength(2);
  });
});
