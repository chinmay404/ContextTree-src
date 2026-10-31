import { graphOf } from './graph';
import { branchPath, lineX, rowY, timelineSections, treeHeight } from './timeline';
import type { Board, Card } from '../api/types';

const chat = (id: string, parentId: string | null, n: number): Card =>
  ({ id, kind: 'chat', parentId, createdAt: `2026-10-0${n}T00:00:00Z`, data: { name: id }, status: null } as unknown as Card);
const board = (...cards: Card[]): ReturnType<typeof graphOf> => graphOf({ id: 'b', cards, edges: [] } as unknown as Board);

// r1 ─ a ─ a1
//    └ b
// r2
const G = () => board(chat('r1', null, 1), chat('a', 'r1', 2), chat('b', 'r1', 3), chat('a1', 'a', 4), chat('r2', null, 5));

describe('timelineSections', () => {
  it('gives one section per root question, in board order, with its whole family depth first', () => {
    const s = timelineSections(G(), 'a1');
    expect(s.map((x) => x.rootId)).toEqual(['r1', 'r2']);
    expect(s[0].rows.map((r) => [r.id, r.depth, r.parentRow])).toEqual([['a', 1, -1], ['a1', 2, 0], ['b', 1, -1]]);
    expect(s[1].rows).toEqual([]);
  });
  it('marks the way to the current chat, and only that way', () => {
    const [one, two] = timelineSections(G(), 'a1');
    expect(one.here).toBe(true);
    expect(two.here).toBe(false);
    expect(one.rows.filter((r) => r.onPath).map((r) => r.id)).toEqual(['a', 'a1']);
    expect(one.rows.filter((r) => r.here).map((r) => r.id)).toEqual(['a1']);
  });
  it('a root that is current has no path rows', () => {
    const [one] = timelineSections(G(), 'r1');
    expect(one.here).toBe(true);
    expect(one.rows.some((r) => r.onPath || r.here)).toBe(false);
  });
  it('a chat whose parent is gone still shows, as its own section', () => {
    const s = timelineSections(board(chat('r1', null, 1), chat('lost', 'nope', 2)), 'lost');
    expect(s.map((x) => x.rootId)).toEqual(['r1', 'lost']);
    expect(s[1].here).toBe(true);
  });
  it('survives a parent cycle in bad data', () => {
    const s = timelineSections(board(chat('r', null, 1), chat('x', 'y', 2), chat('y', 'x', 3)), 'r');
    expect(s.map((x) => x.rootId)).toEqual(['r']);
  });
});

describe('branch geometry', () => {
  it('a first-level branch leaves the head at the top of the tree and ends before the row icon', () => {
    const y = rowY(2);
    expect(branchPath({ depth: 1, parentRow: -1 }, 2)).toBe(`M ${lineX(0)} 0 V ${y - 8} A 8 8 0 0 0 ${lineX(0) + 8} ${y} H ${lineX(1) - 11}`);
  });
  it('a nested branch leaves from under its parent row', () => {
    expect(branchPath({ depth: 2, parentRow: 0 }, 1)).toBe(
      `M ${lineX(1)} ${rowY(0) + 11} V ${rowY(1) - 8} A 8 8 0 0 0 ${lineX(1) + 8} ${rowY(1)} H ${lineX(2) - 11}`,
    );
  });
  it('very deep branches stop indenting but keep a real connector', () => {
    expect(lineX(50)).toBe(lineX(5));
    const d = branchPath({ depth: 50, parentRow: 0 }, 1);
    expect(d.startsWith(`M ${lineX(4)} `)).toBe(true);
    expect(d.endsWith(`H ${lineX(5) - 11}`)).toBe(true);
  });
  it('an empty tree takes no height', () => {
    expect(treeHeight(0)).toBe(0);
    expect(treeHeight(2)).toBe(rowY(1) + 18 + 6);
  });
});
