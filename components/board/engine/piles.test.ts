import { wheelStep, wheelFor } from './piles';

it('small deltas add up before a flip', () => {
  const s = { acc: 0, t: 0 };
  let r = wheelStep(s, 0, 30);
  expect(r.flip).toBe(0);
  r = wheelStep(r.state, 50, 40);
  expect(r.flip).toBe(1);
  expect(r.state.acc).toBe(0);
});

it('a pause resets the count', () => {
  const r = wheelStep({ acc: 50, t: 0 }, 400, 20);
  expect(r.flip).toBe(0);
  expect(r.state.acc).toBe(20);
});

it('scrolling the other way flips backwards', () => {
  expect(wheelStep({ acc: 0, t: 0 }, 10, -70).flip).toBe(-1);
});

it('the accumulator is per pile: scrolling another pile starts from zero', () => {
  const w = new Map();
  expect(wheelFor(w, 'a', 0, 40).flip).toBe(0);
  expect(wheelFor(w, 'b', 20, 40).flip).toBe(0);   // would flip at 80 if shared
  expect(wheelFor(w, 'b', 40, 30).flip).toBe(1);
});
