import { MockEngineApi } from './api/mock/mock-engine-api';
import type { SourceData } from './api/types';
import { BoardStore } from './store';

const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0)); };
let m: MockEngineApi;
let s: BoardStore;
beforeEach(async () => {
  m = new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
  s = new BoardStore(m, 'b_seed', { readsDebounceMs: 5, toastMs: 5000 });
  await s.load();
});
afterEach(() => s.dispose());

const mkPad = (): string => s.createNote({ x: 0, y: 0, deskId: 'main', text: '', extra: { notepadFor: 'main', title: 'Notes · x' } });

it('a note made with notepadFor is found as that chat\'s notepad, and no other chat\'s', () => {
  expect(s.notepadOf('main')).toBeUndefined();
  const id = mkPad();
  expect(s.notepadOf('main')?.id).toBe(id);
  expect(s.notepadOf('side')).toBeUndefined();
  expect((s.getSnapshot().cards.get(id)!.data as SourceData).notepadFor).toBe('main');
});

it('appendToNote adds after a blank line, on top of text typed a moment ago, and writes once, in order', async () => {
  const id = mkPad();
  s.patchDataDebounced(id, { text: 'Why? ' }, 20);
  s.appendToNote(id, '> a\n\n');
  expect((s.getSnapshot().cards.get(id)!.data as SourceData).text).toBe('Why? \n\n> a\n\n');
  await s.settled(id);
  const writes = m.calls.filter((c) => c.method === 'updateCard');
  expect(writes).toHaveLength(1);
  expect(writes[0].args).toBeDefined();
});

it('the notepad panel state is per chat and closes with the focus view', () => {
  s.openFocus('main'); s.openNotepad('main');
  expect(s.getSnapshot().ui.notepad?.chatId).toBe('main');
  const seq = s.getSnapshot().ui.notepad!.seq;
  s.openNotepad('main');
  expect(s.getSnapshot().ui.notepad!.seq).toBeGreaterThan(seq);
  s.openFocus('side');
  expect(s.getSnapshot().ui.notepad).toBeNull();
  s.openNotepad('side'); s.closeFocus();
  expect(s.getSnapshot().ui.notepad).toBeNull();
});

it('a question sent right after typing in a note has the note written first', async () => {
  const id = mkPad();
  await flush();
  s.patchDataDebounced(id, { text: 'remember this' }, 10_000);
  const seen: string[] = [];
  const orig = m.streamChat.bind(m);
  m.streamChat = ((...a: Parameters<typeof orig>) => { seen.push(`stream after ${m.calls.filter((c) => c.method === 'updateCard').length} writes`); return orig(...a); }) as typeof orig;
  await s.send('main', 'and now?');
  expect(seen[0]).toBe('stream after 1 writes');
});
