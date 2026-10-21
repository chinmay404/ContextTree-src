/** The Miro-style dotted canvas: where the dots sit for a camera. Pure, so the frame loop only writes what changed. */
export const DOT_STEP = 24;       // world px between dots
export const DOT_MIN_GAP = 8;     // never denser than this many screen px
export const DOT_FADE_FROM = .3;  // zoom at which the dots are gone
export const DOT_FADE_TO = .4;    // zoom from which they are fully drawn

export interface DotGrid { size: number; x: number; y: number; opacity: number; dot: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** `size` is the tile in screen px; `x`/`y` the tile origin so a dot (at the tile's centre) lands on world multiples of 24. */
export function dotGrid(camX: number, camY: number, z: number): DotGrid {
  const zz = Number.isFinite(z) && z > 0 ? z : 1;
  const size = Math.max(DOT_MIN_GAP, DOT_STEP * zz);
  const mod = (v: number) => { const r = (Number.isFinite(v) ? v : 0) % size; return (r < 0 ? r + size : r) - size / 2; };
  return {
    size, x: mod(camX), y: mod(camY),
    opacity: clamp((zz - DOT_FADE_FROM) / (DOT_FADE_TO - DOT_FADE_FROM), 0, 1),
    dot: clamp(1.5 * zz, 1, 1.5),
  };
}
