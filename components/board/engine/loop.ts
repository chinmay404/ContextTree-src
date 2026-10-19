import type { SpringSystem } from './spring';

/** requestAnimationFrame driver: clamps dt to 50 ms and steps springs in 240 Hz substeps (prototype 1199-1202). */
export class FrameLoop {
  private last: number | null = null;
  private handle: number | null = null;
  private running = false;
  constructor(
    private readonly sys: SpringSystem,
    private readonly onFrame: (dt: number, now: number) => void,
    private readonly raf: (cb: FrameRequestCallback) => number = cb => requestAnimationFrame(cb),
    private readonly caf: (h: number) => void = h => cancelAnimationFrame(h),
  ) {}
  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = null;
    const run = (now: number) => { this.tick(now); if (this.running) this.handle = this.raf(run); };
    this.handle = this.raf(run);
  }
  stop(): void {
    this.running = false;
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
