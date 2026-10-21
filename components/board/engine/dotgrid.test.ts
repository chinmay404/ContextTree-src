import { describe, it, expect } from 'vitest';
import { dotGrid } from './dotgrid';

describe('dotGrid', () => {
  it('is 24 px tiles at zoom 1, fully drawn', () => {
    const g = dotGrid(0, 0, 1);
    expect(g.size).toBe(24); expect(g.opacity).toBe(1); expect(g.dot).toBe(1.5);
  });
  it('scales the tile with zoom', () => { expect(dotGrid(0, 0, 2).size).toBe(48); expect(dotGrid(0, 0, .5).size).toBe(12); });
  it('puts a dot on world multiples of 24 (dot at tile centre)', () => {
    const g = dotGrid(100, -37, 1);
    expect((g.x + g.size / 2 - 100) % 24).toBeCloseTo(0);
    expect(((g.y + g.size / 2 + 37) % 24 + 24) % 24).toBeCloseTo(0);
  });
  it('keeps the offset within one tile', () => {
    const g = dotGrid(-99999, 99999, 1.3);
    expect(g.x).toBeGreaterThanOrEqual(-g.size / 2); expect(g.x).toBeLessThan(g.size / 2);
  });
  it('fades out below 35 percent and is gone by 30', () => {
    expect(dotGrid(0, 0, .3).opacity).toBe(0); expect(dotGrid(0, 0, .1).opacity).toBe(0);
    expect(dotGrid(0, 0, .35).opacity).toBeCloseTo(.5); expect(dotGrid(0, 0, .4).opacity).toBe(1);
  });
  it('never gets denser than 8 px', () => { expect(dotGrid(0, 0, .05).size).toBe(8); });
  it('clamps the dot diameter', () => { expect(dotGrid(0, 0, 3).dot).toBe(1.5); expect(dotGrid(0, 0, .2).dot).toBe(1); });
  it('survives bad input', () => { const g = dotGrid(NaN, Infinity, NaN); expect(Number.isFinite(g.size + g.x + g.y)).toBe(true); });
});
