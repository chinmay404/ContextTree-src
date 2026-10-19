import { Spring, SpringSystem, project, velocity, clamp } from './spring';

describe('Spring', () => {
  it('settles on target', () => { const s = new Spring(0, .4, 1).to(100); for (let i = 0; i < 480; i++) s.step(1 / 240); expect(s.x).toBeCloseTo(100, 1); expect(s.settled()).toBe(true); });
  it('underdamped springs overshoot (wobble)', () => { const s = new Spring(0, .5, .3).to(100); let max = 0; for (let i = 0; i < 480; i++) { s.step(1 / 240); max = Math.max(max, s.x); } expect(max).toBeGreaterThan(105); });
  it('cfg sets k and c from period and damping', () => { const s = new Spring(0).cfg(.5, .8); expect(s.k).toBeCloseTo((2 * Math.PI / .5) ** 2); expect(s.c).toBeCloseTo(4 * Math.PI * .8 / .5); });
  it('snaps instead of animating when reduced motion is on', () => { const s = new Spring(0, .4, 1, true).to(50); expect(s.x).toBe(50); s.kick(10); expect(s.v).toBe(0); });
  it('to(t, vel) sets velocity; kick adds', () => { const s = new Spring(0).to(10, 5); expect(s.v).toBe(5); s.kick(2); expect(s.v).toBe(7); });
  it('is not settled while moving', () => { expect(new Spring(0).to(100).settled()).toBe(false); });
});
describe('SpringSystem', () => {
  it('steps every made spring and forgets removed ones', () => {
    const sys = new SpringSystem(false); const a = sys.make(0).to(10); const b = sys.make(0).to(10);
    expect(sys.size).toBe(2); sys.remove(b); expect(sys.size).toBe(1);
    sys.step(1 / 240); expect(a.x).not.toBe(0); expect(b.x).toBe(0);
  });
  it('passes reduced motion to its springs', () => { expect(new SpringSystem(true).make(0).to(9).x).toBe(9); });
});
describe('helpers', () => {
  it('project throws a flick forward', () => { expect(project(1000)).toBeCloseTo(99); });
  it('clamp', () => { expect(clamp(5, 0, 3)).toBe(3); expect(clamp(-1, 0, 3)).toBe(0); });
  it('velocity ignores stale history', () => { expect(velocity([{ x: 0, y: 0, t: 0 }], 200)).toEqual([0, 0]); });
  it('velocity measures recent motion', () => { expect(velocity([{ x: 0, y: 0, t: 0 }, { x: 10, y: 20, t: 50 }], 60)).toEqual([200, 400]); });
});
