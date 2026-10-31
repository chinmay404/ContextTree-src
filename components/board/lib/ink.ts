/** Pen marks, shared by the board and note pages: what a stroke looks like and what it lies over. */
import { getStroke } from 'perfect-freehand';
import type { InkPoint, Mark, MarkKind } from '../api/types';

export const PEN_SIZE = 3, HIGHLIGHT_SIZE = 18, ARROW_SIZE = 3;
const MAX_POINTS = 4000;

export const sizeFor = (kind: MarkKind, zoom = 1): number =>
  (kind === 'highlight' ? HIGHLIGHT_SIZE : kind === 'arrow' ? ARROW_SIZE : PEN_SIZE) / Math.max(zoom, .05);

const n = (v: number): string => (Math.round(v * 100) / 100).toString();

/** A closed SVG path for perfect-freehand's outline (the library leaves drawing to us). */
function outlinePath(outline: number[][]): string {
  if (!outline.length) return '';
  const [first, ...rest] = outline;
  let d = `M${n(first[0])} ${n(first[1])}Q`;
  rest.concat([first]).forEach((p, i, all) => {
    const next = all[(i + 1) % all.length];
    d += `${n(p[0])} ${n(p[1])} ${n((p[0] + next[0]) / 2)} ${n((p[1] + next[1]) / 2)} `;
  });
  return `${d}Z`;
}

function arrowPath(points: readonly InkPoint[], size: number): string {
  const a = points[0], b = points[points.length - 1];
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0]), head = size * 5;
  const wing = (turn: number): string => `${n(b[0] - head * Math.cos(angle + turn))} ${n(b[1] - head * Math.sin(angle + turn))}`;
  return `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}M${wing(.5)}L${n(b[0])} ${n(b[1])}L${wing(-.5)}`;
}

/** Pen and highlight are filled outlines; an arrow is a drawn line, so it reads differently from a string. */
export function markPath(kind: MarkKind, points: readonly InkPoint[], size: number): string {
  if (!points.length) return '';
  if (kind === 'arrow') return arrowPath(points, size);
  const pressured = points.some((p) => p[2] !== undefined);
  return outlinePath(getStroke(points.map((p) => [...p]), {
    size,
    thinning: kind === 'highlight' ? 0 : .5,
    smoothing: .5,
    streamline: .5,
    simulatePressure: kind === 'pen' && !pressured,
    last: true,
  }));
}

function distToSegment(p: readonly number[], a: readonly number[], b: readonly number[]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Ramer-Douglas-Peucker, then a hard cap: a long scribble must fit what the engine accepts. */
export function simplify(points: readonly InkPoint[], tolerance: number): InkPoint[] {
  if (points.length < 3) return [...points];
  const keep = new Set([0, points.length - 1]);
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop()!;
    let far = -1, worst = tolerance;
    for (let i = from + 1; i < to; i++) {
      const d = distToSegment(points[i], points[from], points[to]);
      if (d > worst) { worst = d; far = i; }
    }
    if (far >= 0) { keep.add(far); stack.push([from, far], [far, to]); }
  }
  const out = points.filter((_, i) => keep.has(i));
  if (out.length <= MAX_POINTS) return out;
  const step = out.length / MAX_POINTS;
  return Array.from({ length: MAX_POINTS }, (_, i) => out[Math.floor(i * step)]);
}

export interface InkBox { id: string; x: number; y: number; w: number; h: number }

const inside = (p: readonly number[], b: InkBox): boolean => p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y && p[1] <= b.y + b.h;

/** What the mark moves with: the smallest box holding most of it. A long line across the board has none. */
export function chooseAnchor(points: readonly InkPoint[], boxes: readonly InkBox[], share = .6): string | null {
  if (!points.length) return null;
  let best: InkBox | null = null;
  for (const box of boxes) {
    const hits = points.filter((p) => inside(p, box)).length;
    if (hits / points.length >= share && (!best || box.w * box.h < best.w * best.h)) best = box;
  }
  return best?.id ?? null;
}

/** The boxes any part of the mark lay over when it was drawn, for telling a model what was marked later. */
export function touchedBy(points: readonly InkPoint[], boxes: readonly InkBox[]): string[] {
  return boxes.filter((box) => points.some((p) => inside(p, box))).map((box) => box.id).slice(0, 50);
}

/** Is a point (in the mark's own coordinates) within `radius` of the mark? */
export function hitsMark(mark: Pick<Mark, 'points' | 'size'>, x: number, y: number, radius: number): boolean {
  const reach = radius + mark.size / 2, p = [x, y];
  if (mark.points.length === 1) return Math.hypot(x - mark.points[0][0], y - mark.points[0][1]) <= reach;
  for (let i = 1; i < mark.points.length; i++) if (distToSegment(p, mark.points[i - 1], mark.points[i]) <= reach) return true;
  return false;
}
