import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api/types';
import { MockEngineApi } from './api/mock/mock-engine-api';
import { BoardStore, overlayOpen } from './store';

const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0)); };
let m: MockEngineApi;
let s: BoardStore;
const snap = () => s.getSnapshot();
const calls = (name: string) => m.calls.filter((c) => c.method === name);
const input = { kind: 'pen' as const, color: 'ink' as const, size: 3, points: [[0, 0], [5, 5]] as [number, number][], touches: [] };

beforeEach(async () => {
  m = new MockEngineApi({ ingestMs: 10, firstTokenMs: 0, wordMs: 0 });
  s = new BoardStore(m, 'b_seed', { readsDebounceMs: 5, toastMs: 10000 });
  await s.load();
});
afterEach(() => { s.dispose(); vi.useRealTimers(); });

describe('draw mode', () => {
  it('starts off, opens on the pen in ink, and closes', () => {
    expect(snap().ui.draw).toBeNull();
    s.toggleDraw();
    expect(snap().ui.draw).toEqual({ tool: 'pen', color: 'ink' });
    s.toggleDraw();
    expect(snap().ui.draw).toBeNull();
  });

  it('keeps the colour when the tool changes', () => {
    s.setDraw({ tool: 'pen', color: 'red' });
    s.setDraw({ tool: 'highlight' });
    expect(snap().ui.draw).toEqual({ tool: 'highlight', color: 'red' });
  });

  it('does not count as an overlay: the board stays usable behind it', () => {
    s.toggleDraw();
    expect(overlayOpen(snap().ui)).toBe(false);
  });

  it('marks can be hidden and shown', () => {
    s.toggleMarksHidden();
    expect(snap().ui.marksHidden).toBe(true);
    s.toggleMarksHidden();
    expect(snap().ui.marksHidden).toBe(false);
  });
});

describe('saving marks', () => {
  it('shows a mark at once and saves it', async () => {
    const id = s.addMark(input)!;
    expect(snap().marks.get(id)).toMatchObject({ kind: 'pen', noteId: null });
    await flush();
    expect(calls('createMark').at(-1)!.args[1]).toMatchObject({ id, kind: 'pen' });
  });

  it('marks saved earlier come back when the board loads', async () => {
    const id = s.addMark(input)!;
    await flush();
    const again = new BoardStore(m, 'b_seed', { readsDebounceMs: 5 });
    await again.load();
    expect(again.getSnapshot().marks.has(id)).toBe(true);
    again.dispose();
  });

  it('a failed save takes the mark off and says so', async () => {
    m.failNext('createMark', new ApiError(503, 'unavailable'));
    const id = s.addMark(input)!;
    await flush();
    expect(snap().marks.has(id)).toBe(false);
    expect(snap().ui.toast?.text).toMatch(/drawing/i);
  });

  it('a failed load says so and the board still opens', async () => {
    m.failNext('listMarks', new ApiError(503, 'unavailable'));
    const other = new BoardStore(m, 'b_seed', { readsDebounceMs: 5 });
    await other.load();
    expect(other.getSnapshot().status).toBe('ready');
    expect(other.getSnapshot().ui.toast?.text).toMatch(/drawing/i);
    other.dispose();
  });

  it('a mark on a note stays apart from the board', () => {
    const onNote = s.addMark({ ...input, noteId: 'note' })!;
    const onBoard = s.addMark(input)!;
    expect(s.marksOn('note').map((x) => x.id)).toEqual([onNote]);
    expect(s.marksOn(null).map((x) => x.id)).toEqual([onBoard]);
  });
});

describe('erasing', () => {
  it('removes a whole mark', async () => {
    const id = s.addMark(input)!;
    await flush();
    s.eraseMark(id);
    expect(snap().marks.has(id)).toBe(false);
    await flush();
    expect(calls('deleteMark').at(-1)!.args).toEqual(['b_seed', id]);
  });

  it('puts it back if the delete fails', async () => {
    const id = s.addMark(input)!;
    await flush();
    m.failNext('deleteMark', new ApiError(503, 'unavailable'));
    s.eraseMark(id);
    await flush();
    expect(snap().marks.has(id)).toBe(true);
    expect(snap().ui.toast?.text).toMatch(/drawing/i);
  });

  it('erasing twice sends one delete', async () => {
    const id = s.addMark(input)!;
    await flush();
    s.eraseMark(id);
    s.eraseMark(id);
    await flush();
    expect(calls('deleteMark').length).toBe(1);
  });
});

describe('undo', () => {
  it('takes back the last mark on that surface, then the one before', async () => {
    const a = s.addMark(input)!;
    const b = s.addMark(input)!;
    const n = s.addMark({ ...input, noteId: 'note' })!;
    await flush();
    s.undoMark(null);
    expect([snap().marks.has(a), snap().marks.has(b), snap().marks.has(n)]).toEqual([true, false, true]);
    s.undoMark(null);
    expect(snap().marks.has(a)).toBe(false);
    s.undoMark(null);   // nothing left: nothing happens
    expect(snap().marks.has(n)).toBe(true);
  });
});

it('a deleted anchor hides its mark, and restoring the card brings it back', async () => {
  const id = s.addMark({ ...input, anchorId: 'csv' })!;
  await flush();
  expect(s.marksOn(null).map((x) => x.id)).toEqual([id]);
  s.requestDelete('csv');
  await s.confirmDelete('one');
  await flush();
  expect(s.marksOn(null)).toEqual([]);
  await s.undo();
  await flush();
  expect(s.marksOn(null).map((x) => x.id)).toEqual([id]);
});
