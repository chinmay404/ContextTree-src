import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiError, type ChatData, type ContextTrace } from './api/types';
import { MockEngineApi } from './api/mock/mock-engine-api';
import { canPlug } from './lib/graph';
import { BoardStore, overlayOpen } from './store';

const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0)); };
let m: MockEngineApi;
let s: BoardStore;
const snap = () => s.getSnapshot();

beforeEach(async () => {
  m = new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
  s = new BoardStore(m, 'b_seed', { readsDebounceMs: 5, toastMs: 10000 });
  await s.load();
});
afterEach(() => { s.dispose(); });

describe('what a turn tells the board', () => {
  it('says so when documents were found by keyword only', async () => {
    m.nextStreamExtras = [{ type: 'context', embeddingFailed: true, agentSteps: [] }];
    await s.send('main', 'hello');
    await flush();
    expect(snap().ui.toast?.text).toMatch(/keyword/i);
  });

  it('says so when the agent read more of the sources', async () => {
    m.nextStreamExtras = [{ type: 'context', embeddingFailed: false, agentSteps: ['search', 'read_section'] }];
    await s.send('main', 'hello');
    await flush();
    expect(snap().ui.toast?.text).toMatch(/read more/i);
  });

  it('offers a branch for a side question without moving anything', async () => {
    const before = snap().cards.size;
    m.nextStreamExtras = [{ type: 'suggest', branch: true }];
    await s.send('main', 'something else');
    await flush();
    expect(snap().ui.toast?.text).toMatch(/branch/i);
    expect(snap().cards.size).toBe(before);
  });

  it('takes a suggested name only while the chat still has a default one', async () => {
    s.openDialog({ mode: 'root' });
    const id = s.confirmDialog([0, 0])!;
    m.nextStreamExtras = [{ type: 'suggest', name: 'Launch price' }];
    await s.send(id, 'hello');
    await flush();
    expect((snap().cards.get(id)!.data as ChatData).name).toBe('Launch price');
  });

  it('never replaces a name the user gave', async () => {
    const before = (snap().cards.get('main')!.data as ChatData).name;
    m.nextStreamExtras = [{ type: 'suggest', name: 'Something' }];
    await s.send('main', 'hello');
    await flush();
    expect((snap().cards.get('main')!.data as ChatData).name).toBe(before);
  });
});

describe('the context inspector', () => {
  const trace: ContextTrace = {
    messageId: 'm1', jev: 'ok', enough: true, estimatedTokens: 900, budgetTokens: 12000, embeddingFailed: false,
    sent: [{ n: 1, cardId: 'pdf', loc: 'p. 1', score: 0.9 }],
    dropped: [{ cardId: 'pdf', loc: 'p. 2', score: 0.1, reason: 'jev' }],
    agent: { ran: false, failed: false, steps: [] },
  };

  it('opens as an overlay, loads the last turn and closes', async () => {
    m.nextTrace = trace;
    s.openInspector('main');
    expect(overlayOpen(snap().ui)).toBe(true);
    await flush();
    expect(s.traceOf('main')).toEqual(trace);
    s.closeInspector();
    expect(snap().ui.inspector).toBeNull();
  });

  it('shows no trace for a chat that has not answered yet, without an error', async () => {
    m.nextTrace = null;
    s.openInspector('main');
    await flush();
    expect(s.traceOf('main')).toBeNull();
    expect(snap().ui.toast).toBeNull();
  });

  it('a failed load is said once and leaves the inspector usable', async () => {
    m.failNext('getContextTrace', new ApiError(503, 'engine_unavailable'));
    s.openInspector('main');
    await flush();
    expect(snap().ui.inspector).toEqual({ chatId: 'main' });
    expect(snap().ui.toast?.text).toMatch(/couldn.t load/i);
  });
});

describe('the why of a string', () => {
  const stringInto = async (): Promise<string> => {
    const edge = [...snap().edges.values()].find((e) => e.kind === 'wire' || e.kind === 'answer');
    expect(edge).toBeTruthy();
    return edge!.id;
  };

  it('saves what the user types and shows it straight away', async () => {
    const id = await stringInto();
    s.setEdgeWhy(id, 'my own reason');
    expect(snap().edges.get(id)!.why).toBe('my own reason');
    await flush();
    expect(m.calls.filter((c) => c.method === 'setEdgeWhy').at(-1)!.args).toEqual(['b_seed', id, 'my own reason']);
  });

  it('puts the old text back when saving fails', async () => {
    const id = await stringInto();
    s.setEdgeWhy(id, 'first');
    await flush();
    m.failNext('setEdgeWhy', new ApiError(503, 'engine_unavailable'));
    s.setEdgeWhy(id, 'second');
    await flush();
    expect(snap().edges.get(id)!.why).toBe('first');
  });

  it('does not write when nothing changed', async () => {
    const id = await stringInto();
    s.setEdgeWhy(id, 'same');
    await flush();
    const n = m.calls.filter((c) => c.method === 'setEdgeWhy').length;
    s.setEdgeWhy(id, 'same');
    await flush();
    expect(m.calls.filter((c) => c.method === 'setEdgeWhy').length).toBe(n);
  });
});

describe('following a parent', () => {
  it("a parent's answer may be strung to its own branch, never the other way", () => {
    const g = s.graph();
    expect(canPlug(g, 'main', 'chat', 'deep')).toBe(true);
    expect(canPlug(g, 'deep', 'chat', 'main')).toBe(false);
  });
});
