import { Spring, SpringSystem, clamp } from './spring';

/** [x0, y0, x1, y1] in world space, already padded by the caller. */
export type Box = [number, number, number, number];

export interface FitPad { l: number; r: number; t: number; b: number }
const APP_PAD: FitPad = { l: 30, r: 30, t: 90, b: 96 };   // room for the brand bar above and the chat bar below

export function fitTransform(b: Box, vw: number, vh: number, pad: FitPad = APP_PAD): { x: number; y: number; z: number } {
  const [x0, y0, x1, y1] = b, l = pad.l, r = pad.r, pt = pad.t, pb = pad.b;
  const z = Math.min(1.1, (vw - l - r) / (x1 - x0), (vh - pt - pb) / (y1 - y0));
  const x = l + (vw - l - r - (x1 - x0) * z) / 2 - x0 * z;
  const y = pt + (vh - pt - pb - (y1 - y0) * z) / 2 - y0 * z;
  return { x, y, z };
}

export class Camera {
  x: Spring; y: Spring; z: Spring;
  constructor(sys: SpringSystem) {
    this.x = sys.make(0, .5, 1);
    this.y = sys.make(0, .5, 1);
    this.z = sys.make(1, .45, 1);
  }
  s2w(cx: number, cy: number): [number, number] { return [(cx - this.x.x) / this.z.x, (cy - this.y.x) / this.z.x]; }
  snap(x: number, y: number, z?: number): void { this.x.snap(x); this.y.snap(y); if (z !== undefined) this.z.snap(z); }
  zoomAt(px: number, py: number, nz: number, anim: boolean): void {
    nz = clamp(nz, .2, 2);
    const z = anim ? this.z.t : this.z.x, bx = anim ? this.x.t : this.x.x, by = anim ? this.y.t : this.y.x;
    const nx = px - (px - bx) * nz / z, ny = py - (py - by) * nz / z;
    if (anim) { this.z.to(nz); this.x.to(nx); this.y.to(ny); } else this.snap(nx, ny, nz);
  }
  fit(bounds: Box | null, vw: number, vh: number, anim: boolean, pad?: FitPad): void {
    if (!bounds) return;
    const { x, y, z } = fitTransform(bounds, vw, vh, pad);
    if (anim) { this.x.to(x); this.y.to(y); this.z.to(z); } else this.snap(x, y, z);
  }
  flyTo(card: { x: number; y: number; w: number }, vw: number, vh: number): void {
    const z = Math.max(this.z.t, .9);
    this.z.to(z);
    this.x.to(vw / 2 - (card.x + card.w / 2) * z);
    this.y.to(vh / 2 - (card.y + 120) * z);
  }
  center(vw: number, vh: number): [number, number] {
    return [(vw / 2 - this.x.t) / this.z.t, (vh / 2 - this.y.t) / this.z.t];
  }
}
