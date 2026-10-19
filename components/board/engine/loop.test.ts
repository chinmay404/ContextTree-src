import { FrameLoop } from './loop';
import { SpringSystem } from './spring';

describe('FrameLoop', () => {
  it('steps springs in 240 Hz substeps and clamps dt', () => {
    const sys = new SpringSystem(false); const step = vi.spyOn(sys, 'step'); const dts: number[] = [];
    const l = new FrameLoop(sys, dt => dts.push(dt), () => 1, () => {});
    l.tick(0); l.tick(1000);
    expect(dts[1]).toBe(.05);
    expect(step).toHaveBeenCalledTimes(1 + 12);
    for (const c of step.mock.calls.slice(1)) expect(c[0]).toBeCloseTo(.05 / 12, 10);
  });
  it('start schedules via raf and stop cancels', () => {
    let cb: FrameRequestCallback | null = null; const caf = vi.fn(); const frames: number[] = [];
    const l = new FrameLoop(new SpringSystem(false), (_d, n) => frames.push(n), c => { cb = c; return 7; }, caf);
    l.start(); cb!(16); expect(frames).toEqual([16]); l.stop(); expect(caf).toHaveBeenCalledWith(7);
  });
  it('stop() inside onFrame is not overridden by rescheduling', () => {
    const raf = vi.fn((_c: FrameRequestCallback) => 1); let l!: FrameLoop;
    l = new FrameLoop(new SpringSystem(false), () => l.stop(), raf, () => {});
    l.start(); const cb = raf.mock.calls[0][0]; cb(16);
    expect(raf).toHaveBeenCalledTimes(1);
  });
  it('start() after stop() restarts with dt 0', () => {
    let cb!: FrameRequestCallback; const dts: number[] = [];
    const l = new FrameLoop(new SpringSystem(false), dt => dts.push(dt), c => { cb = c; return 1; }, () => {});
    l.start(); cb(0); cb(100); l.stop(); l.start(); cb(5000);
    expect(dts).toEqual([0, .05, 0]);
  });
  it('start() twice schedules once', () => {
    const raf = vi.fn((_c: FrameRequestCallback) => 1);
    const l = new FrameLoop(new SpringSystem(false), () => {}, raf, () => {});
    l.start(); l.start(); expect(raf).toHaveBeenCalledTimes(1);
  });
  it('stop() then start() inside onFrame keeps a single rAF chain', () => {
    const cbs: FrameRequestCallback[] = []; const raf = vi.fn((c: FrameRequestCallback) => { cbs.push(c); return cbs.length; });
    let restart = true; let l!: FrameLoop;
    l = new FrameLoop(new SpringSystem(false), () => { if (restart) { restart = false; l.stop(); l.start(); } }, raf, () => {});
    l.start(); cbs[0](16);
    expect(raf).toHaveBeenCalledTimes(2);          // the first start + the restart, not a third from the old chain
    cbs[1](32); expect(raf).toHaveBeenCalledTimes(3);
  });
});
