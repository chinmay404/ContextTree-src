import { clamp } from '../lib/util';
/** Damped springs ported from the prototype (lines 384-396). Period r (s), damping ratio d. */
export class Spring {
  x: number;
  t: number;
  v = 0;
  k = 0;
  c = 0;
  readonly rm: boolean;
  constructor(v: number, r = .4, d = 1, rm = false) {
    this.x = v; this.t = v; this.rm = rm;
    this.cfg(r, d);
  }
  cfg(r: number, d: number): this { this.k = (2 * Math.PI / r) ** 2; this.c = 4 * Math.PI * d / r; return this; }
  to(t: number, vel?: number): this { this.t = t; if (vel !== undefined) this.v = vel; if (this.rm) this.snap(t); return this; }
  snap(v: number): this { this.x = this.t = v; this.v = 0; return this; }
  kick(v: number): this { if (!this.rm) this.v += v; return this; }
  step(dt: number): void {
    const f = -this.k * (this.x - this.t) - this.c * this.v;
    this.v += f * dt;
    this.x += this.v * dt;
  }
  settled(eps = .5): boolean { return Math.abs(this.x - this.t) < eps && Math.abs(this.v) < eps; }
}

export class SpringSystem {
  private readonly springs = new Set<Spring>();
  constructor(readonly rm: boolean) {}
  make(v: number, r?: number, d?: number): Spring {
    const s = new Spring(v, r, d, this.rm);
    this.springs.add(s);
    return s;
  }
  remove(s: Spring): void { this.springs.delete(s); }
  step(dt: number): void { this.springs.forEach(s => s.step(dt)); }
  get size(): number { return this.springs.size; }
}

export const project = (v: number, d = .99): number => (v / 1000) * d / (1 - d);
export { clamp };

/** Pointer velocity (px/s) from recent history; zero when the last sample is older than 90 ms. */
export function velocity(hist: { x: number; y: number; t: number }[], now: number): [number, number] {
  const L = hist[hist.length - 1];
  if (!L || now - L.t > 90) return [0, 0];
  let i = hist.length - 1;
  while (i > 0 && L.t - hist[i - 1].t < 70) i--;
  const F = hist[Math.max(0, i - 1)], dt = (L.t - F.t) / 1000 || 1;
  return [(L.x - F.x) / dt, (L.y - F.y) / dt];
}
