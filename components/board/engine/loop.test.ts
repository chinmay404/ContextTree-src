import { FrameLoop } from './loop';
import { SpringSystem } from './spring';

describe('FrameLoop', () => {
  it('steps springs in 240 Hz substeps and clamps dt', () => {
    const sys = new SpringSystem(false); const step = vi.spyOn(sys, 'step'); const dts: number[] = [];
    const l = new FrameLoop(sys, dt => dts.push(dt), () => 1, () => {});
    l.tick(0); l.tick(1000);
    expect(dts[1]).toBe(.05);
    expect(step).toHaveBeenCalledTimes(1 + 12);
  });
  it('start schedules via raf and stop cancels', () => {
    let cb: FrameRequestCallback | null = null; const caf = vi.fn(); const frames: number[] = [];
    const l = new FrameLoop(new SpringSystem(false), (_d, n) => frames.push(n), c => { cb = c; return 7; }, caf);
    l.start(); cb!(16); expect(frames).toEqual([16]); l.stop(); expect(caf).toHaveBeenCalledWith(7);
  });
});
