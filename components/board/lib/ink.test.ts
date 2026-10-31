import { describe, expect, it } from 'vitest';
import type { InkPoint } from '../api/types';
import { chooseAnchor, hitsMark, markPath, simplify, sizeFor, touchedBy } from './ink';

const line = (n: number): InkPoint[] => Array.from({ length: n }, (_, i) => [i, 0]);
const card = { id: 'card', x: 0, y: 0, w: 100, h: 100 };
const desk = { id: 'desk', x: -50, y: -50, w: 400, h: 400 };

describe('markPath', () => {
  it('a pen stroke is a closed outline', () => {
    expect(markPath('pen', [[0, 0], [10, 10], [20, 5]], 3)).toMatch(/^M.*Z$/);
  });

  it('an arrow is an open line with a head, unlike a string', () => {
    const d = markPath('arrow', [[0, 0], [100, 0]], 3);
    expect(d.startsWith('M0 0L100 0M')).toBe(true);
    expect(d.endsWith('Z')).toBe(false);
  });

  it('nothing drawn is nothing rendered', () => {
    expect(markPath('pen', [], 3)).toBe('');
  });
});

it('marks drawn zoomed out are thicker in world units, so they look the same on screen', () => {
  expect(sizeFor('pen', .5)).toBeGreaterThan(sizeFor('pen', 1));
  expect(sizeFor('highlight')).toBeGreaterThan(sizeFor('pen'));
});

it('a stroke follows the pen exactly: it passes through the last point, with no rubber band', () => {
  const path = markPath('pen', [[0, 0, .5], [40, 0, .5], [80, 0, .5]], 4);
  const xs = [...path.matchAll(/(-?\d+(?:\.\d+)?) -?\d+(?:\.\d+)?/g)].map((m) => Number(m[1]));
  expect(Math.max(...xs)).toBeGreaterThanOrEqual(79);
});

describe('simplify', () => {
  it('drops points on a straight run and keeps both ends', () => {
    expect(simplify(line(100), .5)).toEqual([[0, 0], [99, 0]]);
  });

  it('keeps a real corner', () => {
    expect(simplify([[0, 0], [5, 0], [10, 0], [10, 5], [10, 10]], .5)).toEqual([[0, 0], [10, 0], [10, 10]]);
  });

  it('keeps pressure with the points it keeps', () => {
    expect(simplify([[0, 0, .2], [5, 5, .9], [10, 0, .4]], .5)[1]).toEqual([5, 5, .9]);
  });

  it('never returns more than the engine accepts', () => {
    const zigzag: InkPoint[] = Array.from({ length: 9000 }, (_, i) => [i, i % 2 ? 50 : 0]);
    expect(simplify(zigzag, .1).length).toBeLessThanOrEqual(4000);
  });
});

describe('chooseAnchor', () => {
  it('a circle on a card moves with that card', () => {
    expect(chooseAnchor([[10, 10], [50, 10], [50, 50], [10, 50]], [card])).toBe('card');
  });

  it('prefers the card over the desk it sits on', () => {
    expect(chooseAnchor([[10, 10], [50, 50]], [desk, card])).toBe('card');
  });

  it('a mark on the desk but not on a card moves with the desk', () => {
    expect(chooseAnchor([[200, 200], [250, 250]], [card, desk])).toBe('desk');
  });

  it('a line across open board stays where it was drawn', () => {
    expect(chooseAnchor([[10, 10], [900, 900], [950, 950], [990, 990]], [card, desk])).toBeNull();
  });

  it('nothing drawn has no anchor', () => {
    expect(chooseAnchor([], [card])).toBeNull();
  });
});

it('touchedBy lists every box a mark crosses', () => {
  expect(touchedBy([[10, 10], [200, 200]], [card, desk]).sort()).toEqual(['card', 'desk']);
  expect(touchedBy([[900, 900]], [card, desk])).toEqual([]);
});

describe('hitsMark', () => {
  const mark = { points: [[0, 0], [100, 0]] as InkPoint[], size: 4 };

  it('finds a point on the line and misses one far away', () => {
    expect(hitsMark(mark, 50, 3, 2)).toBe(true);
    expect(hitsMark(mark, 50, 40, 2)).toBe(false);
  });

  it('counts a thick highlight by its width', () => {
    expect(hitsMark({ ...mark, size: 40 }, 50, 15, 2)).toBe(true);
  });

  it('works for a single dot', () => {
    expect(hitsMark({ points: [[5, 5]], size: 4 }, 6, 6, 2)).toBe(true);
  });
});
