import type { SourceData } from '../api/types';
import { MockEngineApi } from '../api/mock/mock-engine-api';
import { BoardStore } from '../store';
import { chatStale } from './card-view';

const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0)); };
let m: MockEngineApi;
let s: BoardStore;

beforeEach(async () => {
  m = new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
  s = new BoardStore(m, 'b_seed', { readsDebounceMs: 5 });
  await s.load();
});
afterEach(() => { s.dispose(); });

describe('Source changed', () => {
  it('is off on the seed board', () => {
    for (const id of ['main', 'side', 'second', 'deep']) expect(chatStale(s, id)).toBe(false);
  });

  it('desc edits, excerpt toggles and desk moves do not count', async () => {
    s.patchDataDebounced('pdf', { desc: 'Changed why' }, 1);
    s.setExcerpt('pdf', 0, false);
    s.setDesk('csv', 'main');
    await new Promise((r) => setTimeout(r, 20)); await flush();
    expect((s.graph().cards.get('pdf')!.data as SourceData).textChangedAt).toBeUndefined();
    expect(chatStale(s, 'main')).toBe(false);
  });

  it('a note text edit after the last answer counts, and survives a reload', async () => {
    s.patchDataDebounced('note', { text: 'Costs went up to $0.60.' }, 1);
    expect((s.graph().cards.get('note')!.data as SourceData).textChangedAt).toEqual(expect.any(String));
    expect(chatStale(s, 'main')).toBe(true);
    expect(chatStale(s, 'side')).toBe(true);   // inherits main's desk
    await new Promise((r) => setTimeout(r, 20)); await flush();
    const sent = m.calls.filter((c) => c.method === 'updateCard' && c.args[1] === 'note');
    expect((sent.at(-1)!.args[2] as { data: SourceData }).data.textChangedAt).toEqual(expect.any(String));

    const fresh = new BoardStore(m, 'b_seed', { readsDebounceMs: 5 });
    await fresh.load();
    expect(chatStale(fresh, 'main')).toBe(true);
    fresh.dispose();
  });

  it('an unchanged text write does not stamp', () => {
    const t = (s.graph().cards.get('note')!.data as SourceData).text;
    s.patchCard('note', { data: { text: t } });
    expect((s.graph().cards.get('note')!.data as SourceData).textChangedAt).toBeUndefined();
  });
});
