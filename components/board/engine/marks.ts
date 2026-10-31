/** The board's pen layer: draws marks above the cards and takes the pointer only while the pen is on. */
import type { InkPoint, Mark } from '../api/types';
import { SIMPLIFY_PX, chooseAnchor, hitsMark, markPath, simplify, sizeFor, touchedBy, type InkBox } from '../lib/ink';
import { palmGuard, pointsOf } from '../lib/pen-input';
import { deskBounds } from './geometry';
import type { EngineContext, MarksModule } from './types';

const NS = 'http://www.w3.org/2000/svg';

export function paintMark(el: SVGPathElement, kind: Mark['kind'], color: Mark['color'], points: readonly InkPoint[], size: number): void {
  el.setAttribute('d', markPath(kind, points, size));
  el.setAttribute('class', `ink ink-${kind} ink-c-${color}`);
  if (kind === 'arrow') el.style.strokeWidth = String(size);
}

export function createMarks(ctx: EngineContext): MarksModule {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'inklayer');
  ctx.world.append(svg);
  const catcher = document.createElement('div');
  catcher.className = 'inkcatch';
  ctx.viewport.append(catcher);
  const drawn = new Map<string, SVGPathElement>();
  // The pointer in charge. `stroke` is null while it is erasing.
  let active: { id: number; type: string; stroke: { el: SVGPathElement; points: InkPoint[]; kind: Mark['kind']; size: number } | null } | null = null;
  let frame = 0;

  const boxes = (): InkBox[] => {
    const layout = ctx.layout(), out: InkBox[] = [];
    for (const n of ctx.nodes.values()) {
      out.push({ id: n.id, x: n.px.x, y: n.py.x, w: n.w, h: n.h });
      if (n.isChat) {
        const d = deskBounds(layout, n.id);
        if (d) out.push({ id: n.id, x: d[0], y: d[1], w: d[2] - d[0], h: d[3] - d[1] });
      }
    }
    return out;
  };

  /** A mark's origin on the board: its card's corner when it has one. */
  const origin = (mark: Mark): [number, number] | null => {
    if (!mark.anchorId) return [0, 0];
    const n = ctx.nodes.get(mark.anchorId);
    return n ? [n.px.x, n.py.x] : null;
  };

  const place = (mark: Mark, el: SVGPathElement): void => {
    const at = origin(mark);
    el.style.display = at ? '' : 'none';
    if (at) el.setAttribute('transform', `translate(${at[0]} ${at[1]})`);
  };

  const stop = (): void => {
    active?.stroke?.el.remove();
    active = null;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
  };

  const finish = (): void => {
    const stroke = active?.stroke;
    if (!stroke) { stop(); return; }
    const { kind, size } = stroke;
    const points = kind === 'arrow' ? [stroke.points[0], stroke.points[stroke.points.length - 1]] : simplify(stroke.points, SIMPLIFY_PX / ctx.camera.z.x);
    stop();
    if (points.length < 2) return;
    const all = boxes();
    const anchorId = chooseAnchor(points, all);
    const anchor = anchorId ? ctx.nodes.get(anchorId) : undefined;
    const stored: InkPoint[] = anchor ? points.map((p) => [p[0] - anchor.px.x, p[1] - anchor.py.x, ...p.slice(2)] as InkPoint) : points;
    const draw = ctx.store.getSnapshot().ui.draw;
    ctx.store.addMark({ kind, color: draw?.color ?? 'ink', size, points: stored, anchorId: anchor ? anchorId : null,
      touches: [...new Set(touchedBy(points, all))] });
  };

  const erase = (x: number, y: number): void => {
    const radius = 8 / ctx.camera.z.x;
    for (const mark of ctx.store.marksOn(null)) {
      const at = origin(mark);
      if (at && hitsMark(mark, x - at[0], y - at[1], radius)) ctx.store.eraseMark(mark.id);
    }
  };

  catcher.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const draw = ctx.store.getSnapshot().ui.draw;
    if (!draw || e.button !== 0) return;
    const verdict = palmGuard.down(e.pointerType, active?.type ?? null);
    if (verdict === 'ignore') return;
    if (verdict === 'replace') stop();   // a palm got there first: it was never a stroke
    catcher.setPointerCapture(e.pointerId);
    const [x, y] = ctx.s2w(e.clientX, e.clientY);
    if (draw.tool === 'eraser') {
      active = { id: e.pointerId, type: e.pointerType, stroke: null };
      erase(x, y);
      return;
    }
    const el = document.createElementNS(NS, 'path');
    svg.append(el);
    active = { id: e.pointerId, type: e.pointerType, stroke: {
      el, kind: draw.tool, size: sizeFor(draw.tool, ctx.camera.z.x), points: [e.pointerType === 'pen' ? [x, y, e.pressure] : [x, y]],
    } };
  });
  catcher.addEventListener('pointermove', (e) => {
    if (active?.id !== e.pointerId) return;
    const points = pointsOf(e, ctx.s2w);
    const stroke = active.stroke;
    if (!stroke) { for (const p of points) erase(p[0], p[1]); return; }
    stroke.points.push(...points);
    // At most once a frame, so the line stays under the pen however fast the stylus reports.
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      const now = active?.stroke;
      if (now) paintMark(now.el, now.kind, ctx.store.getSnapshot().ui.draw?.color ?? 'ink', now.points, now.size);
    });
  });
  catcher.addEventListener('pointerup', (e) => { if (active?.id === e.pointerId) finish(); });
  catcher.addEventListener('pointercancel', (e) => {
    if (active?.id !== e.pointerId) return;
    if (active.type === 'touch') stop();   // the system took a touch back: a palm, not a stroke
    else finish();
  });

  return {
    sync() {
      const { ui } = ctx.store.getSnapshot();
      svg.style.display = ui.marksHidden ? 'none' : '';
      catcher.classList.toggle('on', !!ui.draw && !ctx.showcase);
      catcher.dataset.tool = ui.draw?.tool ?? '';
      const marks = ctx.store.marksOn(null), keep = new Set(marks.map((m) => m.id));
      for (const [id, el] of drawn) if (!keep.has(id)) { el.remove(); drawn.delete(id); }
      for (const mark of marks) {
        let el = drawn.get(mark.id);
        if (!el) {
          el = document.createElementNS(NS, 'path');
          el.dataset.mark = mark.id;
          paintMark(el, mark.kind, mark.color, mark.points, mark.size);
          svg.append(el);
          drawn.set(mark.id, el);
        }
        place(mark, el);
      }
    },
    /** Marks on a card follow its spring. */
    frame() {
      for (const mark of ctx.store.marksOn(null)) {
        const el = drawn.get(mark.id);
        if (el && mark.anchorId) place(mark, el);
      }
    },
    penDown: () => active?.type === 'pen',
    dropTouchStroke() { if (active?.type === 'touch') stop(); },
    dispose() { stop(); svg.remove(); catcher.remove(); },
  };
}
