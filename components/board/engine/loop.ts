import type { SpringSystem } from './spring';

/** requestAnimationFrame driver: clamps dt to 50 ms and steps springs in 240 Hz substeps (prototype 1199-1202). */
export class FrameLoop {
  private last: number | null = null;
  private handle: number | null = null;
  constructor(
    private readonly sys: SpringSystem,
    private readonly onFrame: (dt: number, now: number) => void,
    private readonly raf: (cb: FrameRequestCallback) => number = cb => requestAnimationFrame(cb),
    private readonly caf: (h: number) => void = h => cancelAnimationFrame(h),
  ) {}
  start(): void {
    if (this.handle !== null) return;
    this.last = null;
    const run = (now: number) => { this.tick(now); this.handle = this.raf(run); };
    this.handle = this.raf(run);
  }
  stop(): void {
    if (this.handle !== null) this.caf(this.handle);
    this.handle = null;
  }
  tick(now: number): void {
    const dt = this.last === null ? 0 : Math.min(.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const steps = Math.max(1, Math.ceil(dt * 240)), h = dt / steps;
    for (let i = 0; i < steps; i++) this.sys.step(h);
    this.onFrame(dt, now);
  }
}
