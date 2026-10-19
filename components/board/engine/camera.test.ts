import { Camera, fitTransform } from './camera';
import { SpringSystem } from './spring';

const mk = () => new Camera(new SpringSystem(false));
describe('Camera', () => {
  it('s2w inverts the camera', () => { const c = mk(); c.snap(100, 50, 2); expect(c.s2w(300, 250)).toEqual([100, 100]); });
  it('zoomAt keeps the point under the cursor', () => { const c = mk(); c.snap(0, 0, 1); c.zoomAt(400, 300, 2, false); const [x, y] = c.s2w(400, 300); expect(x).toBeCloseTo(400); expect(y).toBeCloseTo(300); });
  it('zoom is clamped to .2..2', () => { const c = mk(); c.snap(0, 0, 1); c.zoomAt(0, 0, 5, false); expect(c.z.x).toBe(2); c.zoomAt(0, 0, .01, false); expect(c.z.x).toBe(.2); });
  it('animated zoomAt moves targets only', () => { const c = mk(); c.snap(0, 0, 1); c.zoomAt(400, 300, 2, true); expect(c.z.t).toBe(2); expect(c.z.x).toBe(1); });
  it('center reads targets', () => { const c = mk(); c.snap(0, 0, 1); c.z.to(2); c.x.to(0); c.y.to(0); expect(c.center(800, 600)).toEqual([200, 150]); });
  it('flyTo centres the card at no less than .9 zoom', () => { const c = mk(); c.snap(0, 0, .5); c.flyTo({ x: 100, y: 100, w: 200 }, 1000, 800); expect(c.z.t).toBe(.9); expect(c.x.t).toBeCloseTo(500 - 200 * .9); expect(c.y.t).toBeCloseTo(400 - 220 * .9); });
  it('fit with null bounds does nothing', () => { const c = mk(); c.snap(3, 4, 1); c.fit(null, 800, 600, false); expect(c.x.x).toBe(3); });
  it('fit snaps to the fit transform', () => { const c = mk(); c.fit([0, 0, 2000, 1000], 1440, 900, false); const t = fitTransform([0, 0, 2000, 1000], 1440, 900); expect(c.z.x).toBe(t.z); expect(c.x.x).toBe(t.x); });
});
describe('fitTransform', () => {
  it('fits and caps at 1.1', () => { expect(fitTransform([0, 0, 100, 100], 1440, 900).z).toBe(1.1); });
  it('uses margins l30 r30 pt90 pb96', () => { const t = fitTransform([0, 0, 1380, 100], 1440, 900); expect(t.z).toBeCloseTo(1); expect(t.x).toBeCloseTo(30); });
});
