import { Spring } from './spring';
import { SettleTimer, collectMoved } from './persistence';
import type { Card } from '../api/types';

const card = (id: string, x: number, y: number) => ({ id, x, y }) as Card;
const node = (id: string, x: number, y: number) => ({ id, px: new Spring(x), py: new Spring(y) });

it('fires once, 600 ms after the springs settle', () => {
  let t = 0, n = 0; const s = new SettleTimer(600, () => n++, () => t);
  s.frame(true); t = 100; s.frame(false); t = 699; s.frame(false); expect(n).toBe(0);
  t = 700; s.frame(false); expect(n).toBe(1);
  t = 2000; s.frame(false); expect(n).toBe(1);
});
it('never fires without activity', () => {
  let t = 0, n = 0; const s = new SettleTimer(600, () => n++, () => t);
  s.frame(false); t = 5000; s.frame(false); expect(n).toBe(0);
});
it('activity restarts the wait', () => {
  let t = 0, n = 0; const s = new SettleTimer(600, () => n++, () => t);
  s.frame(true); t = 100; s.frame(false); t = 500; s.frame(true); t = 600; s.frame(false);
  t = 1100; s.frame(false); expect(n).toBe(0);
  t = 1200; s.frame(false); expect(n).toBe(1);
});
it('fires again after later activity', () => {
  let t = 0, n = 0; const s = new SettleTimer(600, () => n++, () => t);
  s.frame(true); t = 10; s.frame(false); t = 700; s.frame(false);
  t = 800; s.frame(true); t = 810; s.frame(false); t = 1500; s.frame(false);
  expect(n).toBe(2);
});
it('collectMoved returns only moved cards, rounded', () => {
  const cards = new Map([['a', card('a', 10, 20)], ['b', card('b', 40, 50)], ['c', card('c', 0, 0)]]);
  const a = node('a', 0, 20); a.px.t = 10.04;
  const b = node('b', 0, 50); b.px.t = 50.27;
  const c = node('c', 0, 0); c.py.t = -30.06;
  expect(collectMoved([a, b, c], cards)).toEqual([{ id: 'b', x: 50.3, y: 50 }, { id: 'c', x: 0, y: -30.1 }]);
});
it('collectMoved skips nodes the store does not know', () => {
  expect(collectMoved([node('zz', 5, 5)], new Map())).toEqual([]);
});
