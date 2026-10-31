'use client';
/** A note page: type on it, or switch the pen on and write on the same sheet, like Notability. */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode } from 'react';
import type { DrawTool, InkPoint, MarkColor, MarkKind } from '../api/types';
import { useBoard, useSnapshot } from '../context';
import { SIMPLIFY_PX, hitsMark, markPath, simplify, sizeFor } from '../lib/ink';
import { palmGuard, pointsOf } from '../lib/pen-input';
import { Icon } from './Icon';
import { InkTools } from './InkTools';

// The pointer in charge. `points` is null while it is erasing. Kept out of React state: a stylus
// reports hundreds of points a second, and a render for each would drag the line behind the pen.
interface Active { id: number; type: string; kind: MarkKind | null; size: number; points: InkPoint[] | null }

export function NoteInk({ noteId, children, scroller }: { noteId: string; children: ReactNode; scroller: () => HTMLElement | null }): ReactElement {
  const { store } = useBoard();
  useSnapshot();   // a saved or erased mark draws the page again
  const [tool, setTool] = useState<DrawTool | null>(null);
  const [color, setColor] = useState<MarkColor>('ink');
  const lastTool = useRef<DrawTool>('pen');
  const page = useRef<HTMLDivElement>(null);
  const livePath = useRef<SVGPathElement>(null);
  const active = useRef<Active | null>(null);
  const frame = useRef(0);
  const marks = store.marksOn(noteId);

  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);

  const at = (clientX: number, clientY: number): [number, number] => {
    const box = page.current!.getBoundingClientRect(), s = scroller();
    return [clientX - box.left + (s?.scrollLeft ?? 0), clientY - box.top + (s?.scrollTop ?? 0)];
  };
  const erase = (x: number, y: number): void => {
    for (const m of store.marksOn(noteId)) if (hitsMark(m, x, y, 8)) store.eraseMark(m.id);
  };
  const paint = (): void => {
    frame.current = 0;
    const a = active.current, el = livePath.current;
    if (!el) return;
    if (!a?.points || !a.kind) { el.setAttribute('d', ''); return; }
    el.setAttribute('d', markPath(a.kind, a.points, a.size));
    el.setAttribute('class', `ink ink-${a.kind} ink-c-${color}`);
    el.style.strokeWidth = a.kind === 'arrow' ? String(a.size) : '';
  };
  const stop = (): void => {
    active.current = null;
    paint();
  };
  const finish = (): void => {
    const a = active.current;
    if (a?.points && a.kind) {
      const points = a.kind === 'arrow' ? [a.points[0], a.points[a.points.length - 1]] : simplify(a.points, SIMPLIFY_PX);
      if (points.length >= 2) store.addMark({ kind: a.kind, color, size: a.size, points, noteId, touches: [] });
    }
    stop();
  };

  const down = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (!tool || e.button !== 0) return;
    const verdict = palmGuard.down(e.pointerType, active.current?.type ?? null);
    if (verdict === 'ignore') return;
    if (verdict === 'replace') stop();   // a palm got there first: it was never a stroke
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = at(e.clientX, e.clientY);
    if (tool === 'eraser') {
      active.current = { id: e.pointerId, type: e.pointerType, kind: null, size: 0, points: null };
      erase(x, y);
      return;
    }
    active.current = { id: e.pointerId, type: e.pointerType, kind: tool, size: sizeFor(tool), points: [e.pointerType === 'pen' ? [x, y, e.pressure] : [x, y]] };
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>): void => {
    const a = active.current;
    if (a?.id !== e.pointerId) return;
    const points = pointsOf(e.nativeEvent, at);
    if (!a.points) { for (const p of points) erase(p[0], p[1]); return; }
    a.points.push(...points);
    frame.current ||= requestAnimationFrame(paint);
  };
  const up = (e: ReactPointerEvent<SVGSVGElement>): void => { if (active.current?.id === e.pointerId) finish(); };
  const cancel = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (active.current?.id !== e.pointerId) return;
    if (active.current.type === 'touch') stop();   // the system took a touch back: a palm, not a stroke
    else finish();
  };
  const write = (): void => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();   // no keyboard over the page, and a palm can't type
    setTool(lastTool.current);
  };

  const scrollTop = scroller()?.scrollTop ?? 0;
  return (
    <div className={`notepage${tool ? ' penon' : ''}`} ref={page} data-pb="notepage">
      {children}
      <svg className="noteink" aria-hidden="true" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
        <g transform={`translate(0 ${-scrollTop})`}>
          {marks.map((m) => <path key={m.id} data-mark={m.id} d={markPath(m.kind, m.points, m.size)} className={`ink ink-${m.kind} ink-c-${m.color}`} style={m.kind === 'arrow' ? { strokeWidth: m.size } : undefined} />)}
          <path ref={livePath} />
        </g>
      </svg>
      <div className="notetools" data-pb="notetools">
        <button type="button" className="inkbtn" data-act="type" aria-pressed={!tool} aria-label="Type" title="Type" onClick={() => setTool(null)}><Icon name="type" /></button>
        {!tool && <button type="button" className="inkbtn" data-act="write" aria-label="Write" title="Write" onClick={write}><Icon name="pencil" /></button>}
        {tool && <InkTools tool={tool} color={color} onTool={(t) => { lastTool.current = t; setTool(t); }} onColor={setColor} onUndo={() => store.undoMark(noteId)} />}
      </div>
    </div>
  );
}
