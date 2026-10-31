/**
 * Two fingers on the board zoom and pan, as on any tablet. It listens in the capture phase, so it sees
 * touches before a card drag, a board pan or the pen layer does, and takes over from them.
 */
import { clampZoom } from './camera';
import type { EngineContext } from './types';

interface Touch { x: number; y: number }

/** While the pen is on, two contacts close together are a palm, not a pinch. */
const PALM_SPREAD_PX = 70;

export const spread = (a: Touch, b: Touch): number => Math.hypot(a.x - b.x, a.y - b.y);
export const midpoint = (a: Touch, b: Touch): Touch => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function attachPinch(ctx: EngineContext, vp: HTMLElement): () => void {
  const cam = ctx.camera;
  const touches = new Map<number, Touch>();
  // The board point between the fingers when they came down stays between them, so nothing drifts.
  let pinch: { dist: number; zoom: number; worldX: number; worldY: number } | null = null;
  // Fingers that were part of a pinch stay out of the first finger's pan until they lift, or the board would jump back.
  const held = new Set<number>();

  const pair = (): [Touch, Touch] => { const [a, b] = touches.values(); return [a, b]; };

  const onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'pen') { pinch = null; return; }   // writing outranks zooming
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size !== 2 || ctx.modules.marks.penDown()) return;
    const [a, b] = pair();
    const drawing = !!ctx.store.getSnapshot().ui.draw;
    if (drawing && spread(a, b) < PALM_SPREAD_PX) return;
    ctx.modules.marks.dropTouchStroke();   // the first finger's stroke was the start of a pinch
    const mid = midpoint(a, b), [worldX, worldY] = ctx.s2w(mid.x, mid.y);
    pinch = { dist: Math.max(spread(a, b), 1), zoom: cam.z.x, worldX, worldY };
    for (const id of touches.keys()) held.add(id);
    e.stopPropagation();
  };

  const onMove = (e: PointerEvent): void => {
    const touch = touches.get(e.pointerId);
    if (!touch) return;
    touch.x = e.clientX;
    touch.y = e.clientY;
    if (held.has(e.pointerId)) e.stopPropagation();   // the first finger's drag or pan must not move as well
    if (!pinch || touches.size !== 2) return;
    const [a, b] = pair();
    const mid = midpoint(a, b), zoom = clampZoom(pinch.zoom * spread(a, b) / pinch.dist);
    cam.snap(mid.x - pinch.worldX * zoom, mid.y - pinch.worldY * zoom, zoom);
  };

  const onEnd = (e: PointerEvent): void => {
    touches.delete(e.pointerId);
    held.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
  };

  // iPad Safari would otherwise zoom the whole page.
  const noPageZoom = (e: Event): void => e.preventDefault();

  vp.addEventListener('pointerdown', onDown, true);
  vp.addEventListener('pointermove', onMove, true);
  vp.addEventListener('pointerup', onEnd, true);
  vp.addEventListener('pointercancel', onEnd, true);
  vp.addEventListener('gesturestart', noPageZoom);
  return () => {
    vp.removeEventListener('pointerdown', onDown, true);
    vp.removeEventListener('pointermove', onMove, true);
    vp.removeEventListener('pointerup', onEnd, true);
    vp.removeEventListener('pointercancel', onEnd, true);
    vp.removeEventListener('gesturestart', noPageZoom);
  };
}
