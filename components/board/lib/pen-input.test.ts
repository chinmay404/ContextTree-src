import { describe, expect, it } from 'vitest';
import { PalmGuard, pointsOf } from './pen-input';

const memory = (initial: string | null = null) => {
  let value = initial;
  return { getItem: () => value, setItem: (_: string, v: string) => { value = v; } };
};

describe('PalmGuard', () => {
  it('a finger draws on a device that has never seen a stylus', () => {
    expect(new PalmGuard(() => memory()).down('touch', null)).toBe('draw');
  });

  it('once a stylus is seen, a palm does nothing', () => {
    const g = new PalmGuard(() => memory());
    expect(g.down('pen', null)).toBe('draw');
    expect(g.down('touch', null)).toBe('ignore');
    expect(g.down('touch', 'pen')).toBe('ignore');
  });

  it('a palm that lands first gives way when the pen arrives', () => {
    const g = new PalmGuard(() => memory());
    expect(g.down('touch', null)).toBe('draw');
    expect(g.down('pen', 'touch')).toBe('replace');
    expect(g.down('touch', null)).toBe('ignore');
  });

  it('remembers the stylus on the next visit, so the first palm is ignored too', () => {
    const store = memory();
    new PalmGuard(() => store).down('pen', null);
    expect(new PalmGuard(() => store).down('touch', null)).toBe('ignore');
  });

  it('a second finger does not start a stroke over the first', () => {
    expect(new PalmGuard(() => memory()).down('touch', 'touch')).toBe('ignore');
  });

  it('a mouse still draws after a stylus', () => {
    const g = new PalmGuard(() => memory());
    g.down('pen', null);
    expect(g.down('mouse', null)).toBe('draw');
  });

  it('a second pen event during a stroke is ignored', () => {
    expect(new PalmGuard(() => memory()).down('pen', 'pen')).toBe('ignore');
  });

  it('works where storage is blocked', () => {
    const blocked = () => { throw new Error('denied'); };
    const g = new PalmGuard(blocked);
    expect(g.down('pen', null)).toBe('draw');
    expect(g.down('touch', null)).toBe('ignore');
  });
});

describe('pointsOf', () => {
  const at = (x: number, y: number): [number, number] => [x + 1, y + 1];
  const ev = (over: object) => ({ pointerType: 'mouse', clientX: 0, clientY: 0, pressure: .5, ...over }) as unknown as PointerEvent;

  it('uses every point the stylus reported, with its pressure', () => {
    const e = ev({ pointerType: 'pen', getCoalescedEvents: () => [{ clientX: 1, clientY: 1, pressure: .2 }, { clientX: 2, clientY: 2, pressure: .8 }] });
    expect(pointsOf(e, at)).toEqual([[2, 2, .2], [3, 3, .8]]);
  });

  it('falls back to the event itself', () => {
    expect(pointsOf(ev({ clientX: 5, clientY: 6 }), at)).toEqual([[6, 7]]);
    expect(pointsOf(ev({ clientX: 5, clientY: 6, getCoalescedEvents: () => [] }), at)).toEqual([[6, 7]]);
  });
});
