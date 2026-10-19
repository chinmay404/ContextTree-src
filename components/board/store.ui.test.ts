import { ApiError } from './api/types';
import type { ChatData } from './api/types';
import { MockEngineApi } from './api/mock/mock-engine-api';
import { MODELS, defaultChatData } from './lib/catalog';
import { BoardStore, overlayOpen } from './store';

const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0)); };
let m: MockEngineApi;
let s: BoardStore;
const calls = (name: string) => m.calls.filter((c) => c.method === name);
const snap = () => s.getSnapshot();
const chat = (id: string) => snap().cards.get(id)!.data as ChatData;

beforeEach(async () => {
  m = new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
  s = new BoardStore(m, 'b_seed', { readsDebounceMs: 5, toastMs: 10000 });
  await s.load();
});
afterEach(() => { s.dispose(); vi.useRealTimers(); });

describe('branch dialog', () => {
  it('branch draft starts from the parent', () => {
    s.openDialog({ mode: 'branch', parentId: 'second' });
    expect(snap().ui.dialog!.draft).toMatchObject({ name: 'New question, same desk', model: MODELS.gemini.engineId, inheritDesk: true, carry: 'summary', persona: 'none' });
  });

  it('root draft uses the default model and name', () => {
    s.openDialog({ mode: 'root', at: [5, 6] });
    expect(snap().ui.dialog!.draft).toMatchObject({ name: 'A new question', model: MODELS.gpt.engineId });
    expect(snap().ui.dialog!.at).toEqual([5, 6]);
  });

  it('confirmDialog creates a branch with ChatData from the draft (persona custom when text edited)', () => {
    s.openDialog({ mode: 'branch', parentId: 'main' });
    s.setDraft({ persona: 'skeptic', personaText: 'Be blunt.' });
    const id = s.confirmDialog([10, 20])!;
    const c = snap().cards.get(id)!;
    expect([c.parentId, c.x, c.y]).toEqual(['main', 10, 20]);
    expect(c.data).toMatchObject({ persona: 'custom', systemPrompt: 'Be blunt.' });
    expect(c.forkedFromMessageId).toBe('seed_main_a');
    expect(snap().ui.dialog).toBeNull();
  });

  it('a preset persona keeps its key; empty text is none; blank name is Untitled', () => {
    s.openDialog({ mode: 'root' });
    s.setDraft({ name: '   ', persona: 'teacher', personaText: "  Explain step by step with one small example, as if I'm new to this. " });
    const a = s.confirmDialog([0, 0])!;
    expect(chat(a)).toMatchObject({ name: 'Untitled', persona: 'teacher' });
    s.openDialog({ mode: 'root' });
    s.setDraft({ persona: 'teacher', personaText: '' });
    expect(chat(s.confirmDialog([0, 0])!)).toMatchObject({ persona: 'none', systemPrompt: '' });
  });

  it('an explicit forkedFromMessageId wins over the parent last message', () => {
    s.openDialog({ mode: 'branch', parentId: 'main', forkedFromMessageId: 'seed_main_u' });
    const id = s.confirmDialog([0, 0])!;
    expect(snap().cards.get(id)!.forkedFromMessageId).toBe('seed_main_u');
  });

  it('edit mode patches the chat', async () => {
    s.openDialog({ mode: 'edit', chatId: 'side' });
    expect(snap().ui.dialog!.draft).toMatchObject({ name: chat('side').name, persona: 'teacher' });
    s.setDraft({ carry: 'whole' });
    expect(s.confirmDialog(null)).toBe('side');
    expect(chat('side').carry).toBe('whole');
    await flush();
    expect(calls('updateCard')).toHaveLength(1);
    expect(snap().ui.dialog).toBeNull();
  });

  it('overlayOpen reflects the overlays', () => {
    expect(overlayOpen(snap().ui)).toBe(false);
    s.openDialog({ mode: 'root' });
    expect(overlayOpen(snap().ui)).toBe(true);
    s.closeDialog();
    s.openCompare('main');
    expect(overlayOpen(snap().ui)).toBe(true);
    s.closeCompare();
    s.openMenu({ x: 1, y: 2, at: null, fromAdd: false });
    expect(overlayOpen(snap().ui)).toBe(true);
    s.closeMenu();
    expect(overlayOpen(snap().ui)).toBe(false);
  });
});

describe('send and stream', () => {
  it('send streams into the chat and ends with server messages <mid>_u and <mid>_a', async () => {
    await s.send('side', 'why?');
    const msgs = snap().messages.get('side')!;
    expect(msgs.at(-2)!.id).toMatch(/_u$/);
    expect(msgs.at(-1)!.id).toMatch(/_a$/);
    expect(snap().streaming.has('side')).toBe(false);
    expect(snap().cards.get('side')!.messageCount).toBe(msgs.length);
    expect(snap().cards.get('side')!.lastMessage!.role).toBe('assistant');
  });

  it('deltas append to streaming.text', async () => {
    const slow = new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 15 });
    const st = new BoardStore(slow, 'b_seed');
    await st.load();
    const p = st.send('side', 'q');
    await new Promise((r) => setTimeout(r, 40));
    const mid = st.getSnapshot().streaming.get('side')!;
    expect(mid.text.length).toBeGreaterThan(0);
    expect(st.isStreaming('side')).toBe(true);
    await p;
    st.dispose();
  });

  it('send on a fresh branch waits for the create, passes boardId, parentNodeId and forkedFromMessageId', async () => {
    const id = s.createChat({ parentId: 'main', x: 0, y: 0, data: defaultChatData('b'), forkedFromMessageId: 'seed_main_a' });
    await s.send(id, 'q');
    const req = calls('streamChat')[0].args[0];
    expect(req).toMatchObject({ boardId: 'b_seed', chatId: id, parentNodeId: 'main', forkedFromMessageId: 'seed_main_a', model: MODELS.gpt.engineId });
    const order = m.calls.map((c) => c.method).filter((x) => x === 'createCard' || x === 'streamChat');
    expect(order).toEqual(['createCard', 'streamChat']);
  });

  it('parent ids are sent only while the chat has no messages', async () => {
    await s.send('side', 'q');
    const req = calls('streamChat')[0].args[0] as Record<string, unknown>;
    expect(req.parentNodeId).toBeUndefined();
    expect(req.forkedFromMessageId).toBeUndefined();
  });

  it('maps persona, advanced settings and web search onto the request', async () => {
    s.patchCard('side', { data: { advanced: { ...chat('side').advanced, temperature: 0.7, maxOutputTokens: 900, historyMode: 'lastK', lastKMessages: 4, externalContextTopK: 3 } } });
    s.setWebSearch('side', true);
    await s.send('side', 'q');
    expect(calls('streamChat')[0].args[0]).toMatchObject({
      systemPrompt: chat('side').systemPrompt, temperature: 0.7, maxOutputTokens: 900, lastKMessages: 4, externalContextTopK: 3, webSearch: true,
    });
  });

  it('history mode auto sends lastKMessages null', async () => {
    await s.send('side', 'q');
    expect(calls('streamChat')[0].args[0]).toMatchObject({ lastKMessages: null, webSearch: false });
  });

  it('an error is kept until the next send; the composer is free again', async () => {
    m.failNext('streamChat', new ApiError(500, 'boom', 'The model is down'));
    await s.send('side', 'q');
    expect(snap().streaming.get('side')!.error).toBe('The model is down');
    expect(s.isStreaming('side')).toBe(false);
    await s.send('side', 'again');
    expect(snap().streaming.has('side')).toBe(false);
  });

  it('a second send while streaming is ignored', async () => {
    const slow = new MockEngineApi({ ingestMs: 10, firstTokenMs: 30, wordMs: 0 });
    const st = new BoardStore(slow, 'b_seed');
    await st.load();
    const a = st.send('side', 'one');
    await st.send('side', 'two');
    await a;
    expect(slow.calls.filter((c) => c.method === 'streamChat')).toHaveLength(1);
    st.dispose();
  });

  it('stop aborts the stream and leaves no answer', async () => {
    const slow = new MockEngineApi({ ingestMs: 10, firstTokenMs: 50, wordMs: 0 });
    const st = new BoardStore(slow, 'b_seed');
    await st.load();
    const p = st.send('side', 'q');
    await new Promise((r) => setTimeout(r, 10));
    st.stop('side');
    await p;
    expect(st.getSnapshot().streaming.has('side')).toBe(false);
    expect(st.getSnapshot().messages.get('side')!.some((x) => x.id.endsWith('_a') && x.id !== 'seed_side_a')).toBe(false);
    st.dispose();
  });
});

describe('delete and undo', () => {
  it('requestDelete on a chat asks first; on a source deletes at once with an Undo toast', () => {
    s.requestDelete('second');
    expect(snap().ui.confirm!.text).toBe('Delete Q1.2 and its 1 branch? Sources on their desks stay on the board.');
    s.cancelConfirm();
    expect(snap().ui.confirm).toBeNull();
    s.requestDelete('csv');
    expect(snap().cards.has('csv')).toBe(false);
    expect(snap().ui.toast!.undoCardId).toBe('csv');
  });

  it('confirm copy without branches, and with several', () => {
    s.requestDelete('deep');
    expect(snap().ui.confirm!.text).toBe('Delete Q1.2.1? Sources on its desk stay on the board.');
    s.requestDelete('main');
    expect(snap().ui.confirm!.text).toBe('Delete Q1 and its 3 branches? Sources on their desks stay on the board.');
  });

  it('confirmDelete removes the set, detaches desk sources, hides edges and toasts', async () => {
    s.requestDelete('second');
    const p = s.confirmDelete();
    expect(snap().cards.has('second')).toBe(false);
    expect(snap().cards.has('deep')).toBe(false);
    expect(snap().cards.get('web')!.deskId).toBeNull();
    expect(snap().edges.has('e_seed_csv_deep')).toBe(false);
    expect(snap().ui.confirm).toBeNull();
    expect(snap().ui.toast).toMatchObject({ text: 'Deleted Q1.2 and 1 branch', undoCardId: 'second' });
    await p;
    expect(calls('deleteCard')).toHaveLength(1);
  });

  it('toast text for a branchless chat and a source', async () => {
    s.requestDelete('deep');
    await s.confirmDelete();
    expect(snap().ui.toast!.text).toBe('Deleted Q1.2.1');
    s.requestDelete('csv');
    expect(snap().ui.toast!.text).toBe('Removed Competitor prices');
  });

  it('deleting a streaming chat aborts its stream', async () => {
    const slow = new MockEngineApi({ ingestMs: 10, firstTokenMs: 50, wordMs: 0 });
    const st = new BoardStore(slow, 'b_seed');
    await st.load();
    const p = st.send('side', 'q');
    await new Promise((r) => setTimeout(r, 10));
    st.requestDelete('side');
    await st.confirmDelete();
    await p;
    expect(st.getSnapshot().streaming.has('side')).toBe(false);
    st.dispose();
  });

  it('undo restores the deleted set', async () => {
    s.requestDelete('second');
    await s.confirmDelete();
    await flush();
    await s.undo();
    expect(snap().cards.has('second')).toBe(true);
    expect(snap().cards.has('deep')).toBe(true);
    expect(snap().cards.get('web')!.deskId).toBe('second');
    expect(snap().edges.has('e_seed_csv_deep')).toBe(true);
    expect(snap().ui.toast).toBeNull();
    expect(calls('restoreCard')).toHaveLength(1);
  });

  it('undo of a source restores it', async () => {
    s.requestDelete('csv');
    await flush();
    await s.undo();
    expect(snap().cards.has('csv')).toBe(true);
  });

  it('a failed delete brings everything back with a toast', async () => {
    m.failNext('deleteCard', new ApiError(500, 'boom'));
    s.requestDelete('second');
    await s.confirmDelete();
    await flush();
    expect(snap().cards.has('second')).toBe(true);
    expect(snap().cards.get('web')!.deskId).toBe('second');
    expect(snap().ui.toast!.text).toBe("Couldn't save that. Try again.");
  });

  it('a new toast replaces the old one, which can no longer be undone', async () => {
    s.requestDelete('csv');
    s.toast('something else');
    await s.undo();
    expect(calls('restoreCard')).toHaveLength(0);
    expect(snap().cards.has('csv')).toBe(false);
  });

  it('the toast expires after toastMs', async () => {
    vi.useFakeTimers();
    const q = new BoardStore(m, 'b_seed', { toastMs: 10000 });
    q.toast('x');
    await vi.advanceTimersByTimeAsync(9999);
    expect(q.getSnapshot().ui.toast).not.toBeNull();
    await vi.advanceTimersByTimeAsync(2);
    expect(q.getSnapshot().ui.toast).toBeNull();
    q.dispose();
  });
});

describe('compare, selection and small state', () => {
  it('promote folds the siblings', async () => {
    s.openCompare('side');
    s.promote('side');
    expect((snap().cards.get('second')!.data as ChatData).demoted).toBe(true);
    expect((snap().cards.get('side')!.data as ChatData).demoted).toBe(false);
    expect(snap().ui.toast!.text).toBe('Kept Q1.1 · 1 sibling folded');
    expect(snap().ui.compare).toBeNull();
    await flush();
    expect(calls('updateCard').length).toBeGreaterThanOrEqual(2);
  });

  it('setDemoted patches the chat', () => {
    s.setDemoted('deep', true);
    expect(chat('deep').demoted).toBe(true);
  });

  it('select, viewer, focus, menus, drop and web search are plain state', () => {
    s.select('main');
    expect(snap().ui.selected).toBe('main');
    s.openViewer('pdf', null, null);
    expect(snap().ui.viewer).toEqual({ cardId: 'pdf', memberId: null, anchor: null });
    s.closeViewer();
    s.openFocus('main');
    expect(snap().ui.focus).toBe('main');
    s.closeFocus();
    s.openLinkPop({ x: 1, y: 2, at: null });
    expect(snap().ui.linkPop).not.toBeNull();
    s.closeLinkPop();
    s.setDropping(true);
    expect(snap().ui.dropping).toBe(true);
    s.setWebSearch('main', true);
    expect(snap().ui.webSearch).toEqual({ main: true });
  });
});

describe('fix round 1', () => {
  it('createChat shows the lineage edge at once and keeps its id after the snapshot', async () => {
    const id = s.createChat({ parentId: 'main', x: 0, y: 0, data: defaultChatData('b'), forkedFromMessageId: null });
    expect(snap().edges.get(`lin_${id}`)).toMatchObject({ kind: 'lineage', from: 'main', to: id });
    await flush();
    await s.refresh();
    expect(snap().edges.get(`lin_${id}`)).toMatchObject({ kind: 'lineage', from: 'main', to: id });
  });

  it('a failed create removes the lineage edge too', async () => {
    m.failNext('createCard', new ApiError(400, 'invalid'));
    const id = s.createChat({ parentId: 'main', x: 0, y: 0, data: defaultChatData('b'), forkedFromMessageId: null });
    expect(snap().edges.has(`lin_${id}`)).toBe(true);
    await flush();
    expect(snap().edges.has(`lin_${id}`)).toBe(false);
    expect(snap().cards.has(id)).toBe(false);
  });

  it('a retry after a failed first send still sends the parent ids and drops the stale question', async () => {
    const id = s.createChat({ parentId: 'main', x: 0, y: 0, data: defaultChatData('b'), forkedFromMessageId: 'seed_main_a' });
    await flush();
    m.failNext('streamChat', new ApiError(500, 'boom', 'down'));
    await s.send(id, 'q');
    expect(snap().messages.get(id)).toHaveLength(0);
    await s.send(id, 'q');
    const reqs = calls('streamChat').map((c) => c.args[0]);
    expect(reqs).toHaveLength(2);
    for (const r of reqs) expect(r).toMatchObject({ parentNodeId: 'main', forkedFromMessageId: 'seed_main_a' });
  });

  it('openDialog loads the parent messages when they are missing', async () => {
    (s as unknown as { messages: Map<string, unknown> }).messages.delete('main');
    s.openDialog({ mode: 'branch', parentId: 'main' });
    await flush();
    const id = s.confirmDialog([0, 0])!;
    expect(snap().cards.get(id)!.forkedFromMessageId).toBe('seed_main_a');
  });

  it('undo when restoreCard fails toasts and leaves the card deleted', async () => {
    s.requestDelete('csv');
    await flush();
    m.failNext('restoreCard', new ApiError(409, 'card_limit'));
    await s.undo();
    expect(snap().cards.has('csv')).toBe(false);
    expect(snap().ui.toast!.text).toBe('This board is full (50 cards). Remove something to add more.');
  });

  it('undo after the toast expired does nothing', async () => {
    vi.useFakeTimers();
    s.requestDelete('csv');
    await vi.advanceTimersByTimeAsync(10001);
    expect(snap().ui.toast).toBeNull();
    await s.undo();
    expect(calls('restoreCard')).toHaveLength(0);
  });
});
