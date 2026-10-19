import { describe, it, expect } from 'vitest';
import { Spring } from './spring';
import type { Box } from './camera';
import { boxT, deskAt, deskBoxT, deskBounds, freeSpot, makeRoom, placeFor, separateDesks, spotOnDesk, type Layout, type LayoutItem } from './geometry';

interface Opt { w?: number; h?: number; isChat?: boolean; deskId?: string | null; isPile?: boolean }
const item = (id: string, x: number, y: number, o: Opt = {}): LayoutItem => ({
  id, isChat: !!o.isChat, isPile: !!o.isPile, deskId: o.deskId ?? null, w: o.w ?? 212, h: o.h ?? 90,
  px: new Spring(x, .4, 1, true), py: new Spring(y, .4, 1, true), rot: new Spring(0, .4, 1, true),
});
const layout = (xs: LayoutItem[]): Layout => ({ items: new Map(xs.map(m => [m.id, m])), chats: xs.filter(m => m.isChat).map(m => m.id), rand: () => .9 });
const hits = (a: Box, b: Box, g = 0) => a[0] < b[2] + g && a[2] + g > b[0] && a[1] < b[3] + g && a[3] + g > b[1];

describe('geometry', () => {
  it("a source dropped on a chat slides to the chat's left", () => {
    const c = item('c', 400, 0, { w: 320, h: 300, isChat: true }), s = item('s', 420, 50, { deskId: 'c' });
    const moved = makeRoom(layout([c, s]), s);
    expect(s.px.t).toBe(400 - 212 - 28); expect(c.px.t).toBe(400); expect(moved).toContain('s');
  });
  it("from the right side it goes to the chat's right", () => {
    const c = item('c', 400, 0, { w: 320, h: 300, isChat: true }), s = item('s', 600, 50, { deskId: 'c' });
    makeRoom(layout([c, s]), s); expect(s.px.t).toBe(400 + 320 + 28);
  });
  it('nudges cascade until nothing overlaps (gap 18)', () => {
    const xs = [item('a', 0, 0), item('b', 0, 0), item('c', 0, 10), item('d', 20, 20)];
    makeRoom(layout(xs), xs[0]);
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) expect(hits(boxT(xs[i]), boxT(xs[j]), 18)).toBe(false);
  });
  it('chats are never shoved by sources', () => {
    const a = item('a', 0, 0), c = item('c', 0, 100, { isChat: true, w: 100, h: 100 });
    makeRoom(layout([a, c]), a); expect([c.px.t, c.py.t]).toEqual([0, 100]);
  });
  it('desks push each other apart as a whole', () => {
    const A = item('A', 0, 0, { isChat: true, w: 320, h: 300 }), sa = item('sa', -240, 0, { deskId: 'A' });
    const B = item('B', 100, 50, { isChat: true, w: 320, h: 300 }), sb = item('sb', -140, 50, { deskId: 'B' });
    const l = layout([A, sa, B, sb]);
    const moved = separateDesks(l, 'A');
    expect(hits(deskBoxT(l, 'A'), deskBoxT(l, 'B'), 36)).toBe(false);
    expect(sb.px.t - -140).toBe(B.px.t - 100); expect(sb.py.t - 50).toBe(B.py.t - 50);
    expect(B.px.t !== 100 || B.py.t !== 50).toBe(true);
    expect(moved).toEqual(expect.arrayContaining(['B', 'sb']));
  });
  it('a loose card under a growing desk slides out', () => {
    const A = item('A', 0, 0, { isChat: true, w: 320, h: 300 }), s = item('s', 50, 50);
    const l = layout([A, s]); separateDesks(l, 'A');
    expect(hits(deskBoxT(l, 'A'), boxT(s), 20)).toBe(false);
  });
  it('a desk being dragged is not pushed', () => {
    const A = item('A', 0, 0, { isChat: true }), B = item('B', 100, 50, { isChat: true });
    B.dragging = true; separateDesks(layout([A, B]), 'A'); expect([B.px.t, B.py.t]).toEqual([100, 50]);
  });
  it('deskBoxT: padding 28, label 18, empty desk 300 wide +44 tall', () => {
    const A = item('A', 0, 0, { isChat: true, w: 320, h: 300 }); const l = layout([A]);
    expect(deskBoxT(l, 'A')).toEqual([-28, -46, 348, 372]);
    expect(deskBounds(l, 'A')).toEqual([-28, -28, 348, 372]);
  });
  it('freeSpot steps down 60px past occupied boxes', () => {
    const l = layout([item('o', 0, 0)]);
    const [x, y] = freeSpot(l, 0, 0, 212, 90);
    expect(x).toBe(0); expect(y % 60).toBe(0); expect(y).toBeGreaterThanOrEqual(150);
    const full = layout([item('o', 0, -100000, { w: 100, h: 200000 })]);
    expect(freeSpot(full, 0, 0, 10, 10)).toEqual([420, 0]);
  });
  it('spotOnDesk stacks 96px rows left of the chat', () => {
    const c = item('c', 500, 0, { isChat: true });
    expect(spotOnDesk(layout([c]), 'c')).toEqual([260, 0]);
    expect(spotOnDesk(layout([c, item('m', 260, 0, { deskId: 'c' })]), 'c')).toEqual([260, 96]);
  });
  it('deskAt finds the desk under a point', () => {
    const A = item('A', 0, 0, { isChat: true, w: 320, h: 300 }); const l = layout([A]);
    expect(deskAt(l, 100, 100)).toBe('A'); expect(deskAt(l, 5000, 5000)).toBeNull();
  });
  it('placeFor: drop point, desk spot, or view centre', () => {
    const c = item('c', 500, 0, { isChat: true }); const l = layout([c]);
    expect(placeFor(l, null, 1, [300, 200], [0, 0])).toEqual([218, 256]);
    expect(placeFor(l, 'c', 1, null, [0, 0])).toEqual([260, 96]);
    expect(placeFor(l, null, 0, null, [1000, 500])).toEqual([894, 460]);
  });
});
