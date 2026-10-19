import { ApiError } from './api/types';
import type { SourceData } from './api/types';
import { MockEngineApi } from './api/mock/mock-engine-api';
import { BoardStore, type StoreChange } from './store';

const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0)); };
let m: MockEngineApi;
let s: BoardStore;
const calls = (name: string) => m.calls.filter((c) => c.method === name);

beforeEach(async () => {
  m = new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
  s = new BoardStore(m, 'b_seed', { readsDebounceMs: 5, toastMs: 5000 });
  await s.load();
});
afterEach(() => { s.dispose(); vi.useRealTimers(); });

const data = (id: string) => s.getSnapshot().cards.get(id)!.data as SourceData;

it('load fills cards, edges, messages and reads', () => {
  expect(s.getSnapshot().status).toBe('ready');
  expect(s.getSnapshot().cards.size).toBe(16);
  expect(s.getSnapshot().edges.size).toBe(5);
  expect(s.getSnapshot().messages.get('main')).toHaveLength(2);
  expect(calls('getReads')).toHaveLength(4);
  expect(s.readsOf('main').items.length).toBe(3);
});

it('createNote shows the card at once and pins it', async () => {
  const seen: StoreChange[] = [];
  s.onChange((c) => seen.push(...c));
  const id = s.createNote({ x: 0, y: 0, deskId: 'main' });
  expect(seen).toContainEqual({ kind: 'card', id, fields: expect.any(Array) });
  expect(seen.find((c) => c.kind === 'card' && c.id === id && c.fields.includes('created'))).toBeTruthy();
  expect(s.getSnapshot().cards.get(id)!.status).toBe('ready');
  await flush();
  expect(calls('createCard')).toHaveLength(1);
});

it('stale snapshot keeps pending patch and pinned create', async () => {
  const stale = await m.getBoard('b_seed');
  const id = s.createNote({ x: 0, y: 0, deskId: null });
  s.patchCard('pdf', { data: { desc: 'new' } });
  s.applyBoard(stale);
  expect(s.getSnapshot().cards.has(id)).toBe(true);
  expect(data('pdf').desc).toBe('new');
  await flush();
  s.applyBoard(stale);                                    // still absent from this snapshot: still pinned
  expect(s.getSnapshot().cards.has(id)).toBe(true);
  expect(data('pdf').desc).toBe('new');
  await s.refresh();                                      // a snapshot that has it unpins it
  expect(s.getSnapshot().cards.has(id)).toBe(true);
  s.applyBoard(stale);
  expect(s.getSnapshot().cards.has(id)).toBe(false);
});

it('a local drag survives a snapshot where the server did not move the card', async () => {
  const stale = await m.getBoard('b_seed');
  s.savePositions([{ id: 'pdf', x: 999, y: 888 }]);
  s.applyBoard(stale);
  expect(s.getSnapshot().cards.get('pdf')!.x).toBe(999);
  await flush();
  expect(calls('savePositions')).toHaveLength(1);
});

it("a failed patch restores only that card's server copy", async () => {
  m.failNext('updateCard', new ApiError(400, 'invalid'));
  s.patchCard('pdf', { data: { desc: 'x' } });
  s.patchCard('note', { data: { text: 'kept' } });
  await flush();
  expect(data('pdf').desc).toBe('Our main benchmark. Trust it over blog posts.');
  expect(data('note').text).toBe('kept');
  expect(s.getSnapshot().ui.toast!.text).toBe("Couldn't save that. Try again.");
});

it('card_limit removes the optimistic card with the full-board toast', async () => {
  for (let i = 0; i < 34; i++) await m.createCard('b_seed', { id: `f${i}`, kind: 'source', sourceType: 'note', x: 0, y: 0, data: { text: 'f' } });
  const id = s.createNote({ x: 0, y: 0, deskId: null });
  expect(s.getSnapshot().cards.has(id)).toBe(true);
  await flush();
  expect(s.getSnapshot().cards.has(id)).toBe(false);
  expect(s.getSnapshot().ui.toast!.text).toBe('This board is full (50 cards). Remove something to add more.');
});

it('upload errors map to their toasts', async () => {
  m.failNext('uploadFile', new ApiError(413, 'too_large'));
  s.createSourceFromFile(new File(['x'], 'a.pdf'), [0, 0], null, 'single');
  await flush();
  expect(s.getSnapshot().ui.toast!.text).toBe('That file is over 4 MB.');
  m.failNext('uploadFile', new ApiError(415, 'unsupported_type'));
  s.createSourceFromFile(new File(['x'], 'a.xyz'), [0, 0], null, 'single');
  await flush();
  expect(s.getSnapshot().ui.toast!.text).toBe("Can't read that kind of file yet.");
  m.failNext('addLink', new ApiError(400, 'invalid'));
  s.createSourceFromLink('https://example.com/a', [0, 0], null);
  await flush();
  expect(s.getSnapshot().ui.toast!.text).toBe("That link can't be read.");
  expect(s.createSourceFromLink('not a url', [0, 0], null)).toBeNull();
  expect(s.getSnapshot().cards.size).toBe(16);
});

it('toast expires after toastMs', async () => {
  const quick = new BoardStore(m, 'b_seed', { toastMs: 30 });
  quick.toast('hi');
  expect(quick.getSnapshot().ui.toast!.text).toBe('hi');
  await new Promise((r) => setTimeout(r, 120));
  expect(quick.getSnapshot().ui.toast).toBeNull();
  quick.dispose();
});

it('connect refuses what canPlug refuses without calling the API', () => {
  expect(s.connect('answer', 'main', 'deep')).toBeNull();
  expect(calls('createEdge')).toHaveLength(0);
});

it('connect adds the edge at once and rolls back with the strung toast', async () => {
  const id = s.connect('wire', 'podcast', 'main')!;
  expect(s.getSnapshot().edges.has(id)).toBe(true);
  await flush();
  expect(calls('createEdge')).toHaveLength(1);
  m.failNext('createEdge', new ApiError(409, 'not_allowed'));
  const id2 = s.connect('wire', 'csv', 'main')!;
  await flush();
  expect(s.getSnapshot().edges.has(id2)).toBe(false);
  expect(s.getSnapshot().ui.toast!.text).toBe("Those two can't be strung together.");
});

it("setDesk drops the wire into the new desk's chat", async () => {
  s.setDesk('csv', 'deep');
  expect(s.getSnapshot().edges.has('e_seed_csv_deep')).toBe(false);
  expect(s.getSnapshot().cards.get('csv')!.deskId).toBe('deep');
  await flush();
  expect(calls('deleteEdge')).toHaveLength(1);
  expect((await m.getBoard('b_seed')).edges.some((e) => e.id === 'e_seed_csv_deep')).toBe(false);
});

it('readsOf uses the local rules while the server copy is stale', async () => {
  s.setDesk('podcast', 'side');
  expect(s.readsOf('side').items.find((i) => i.cardId === 'podcast')).toMatchObject({ state: 'soon' });
  await new Promise((r) => setTimeout(r, 60));
  expect(calls('getReads').length).toBeGreaterThan(4);
  expect(s.readsOf('side').items.some((i) => i.cardId === 'podcast')).toBe(true);
});

it('reads refetch in one debounced batch', async () => {
  s.setHidden('main', 'pdf', true);
  s.setHidden('main', 'note', true);
  await new Promise((r) => setTimeout(r, 60));
  const main = calls('getReads').slice(4).filter((c) => c.args[1] === 'main');
  expect(main).toHaveLength(1);
});

it('makePile and unstack round-trip', async () => {
  const pile = s.makePile('web', 'pdf', [10, 20]);
  const c = s.getSnapshot().cards;
  expect(c.get(pile)).toMatchObject({ sourceType: 'pile', deskId: 'main', x: 10, y: 20 });
  expect(c.get('web')).toMatchObject({ pileId: pile, deskId: null });
  expect(c.get('pdf')).toMatchObject({ pileId: pile, deskId: null });
  await flush();
  const srv = await m.getBoard('b_seed');
  expect(srv.cards.find((x) => x.id === 'pdf')!.pileId).toBe(pile);
  const ids = s.unstack(pile, [[0, 0], [50, 50]]);
  expect(ids.sort()).toEqual(['pdf', 'web']);
  expect(s.getSnapshot().cards.has(pile)).toBe(false);
  expect(s.getSnapshot().cards.get('web')).toMatchObject({ pileId: null, deskId: 'main' });
  await flush();
  const after = await m.getBoard('b_seed');
  expect(after.cards.some((x) => x.id === pile)).toBe(false);
  expect(after.cards.find((x) => x.id === 'web')).toMatchObject({ pileId: null, deskId: 'main' });
});

it('an action on a card whose create is in flight waits for the create', async () => {
  const id = s.createNote({ x: 0, y: 0, deskId: null });
  s.patchCard(id, { data: { text: 'edited' } });
  await flush();
  const order = m.calls.map((c) => c.method).filter((x) => x === 'createCard' || x === 'updateCard');
  expect(order.slice(-2)).toEqual(['createCard', 'updateCard']);
});

it('polls every 2 s while a card is processing, then stops', async () => {
  vi.useFakeTimers();
  const slow = new MockEngineApi({ ingestMs: 5000, firstTokenMs: 0, wordMs: 0 });
  const st = new BoardStore(slow, 'b_seed');
  const loaded = st.load();
  await vi.advanceTimersByTimeAsync(10);
  await loaded;
  st.createSourceFromFile(new File(['%PDF'], 'a.pdf'), [0, 0], null, 'single');
  const n0 = slow.calls.filter((c) => c.method === 'getBoard').length;
  await vi.advanceTimersByTimeAsync(4100);
  expect(slow.calls.filter((c) => c.method === 'getBoard').length - n0).toBeGreaterThanOrEqual(2);
  await vi.advanceTimersByTimeAsync(4000);               // ingest done at 5 s; the poll at 6 s sees it and stops
  const n = slow.calls.filter((c) => c.method === 'getBoard').length;
  await vi.advanceTimersByTimeAsync(6000);
  expect(slow.calls.filter((c) => c.method === 'getBoard').length).toBe(n);
  st.dispose();
});

it('patchDataDebounced shows each keystroke and sends one patch', async () => {
  s.patchDataDebounced('note', { text: 'a' }, 20);
  s.patchDataDebounced('note', { text: 'ab' }, 20);
  expect(data('note').text).toBe('ab');
  expect(calls('updateCard')).toHaveLength(0);
  await new Promise((r) => setTimeout(r, 150));
  expect(calls('updateCard')).toHaveLength(1);
  expect(data('note').text).toBe('ab');
});
