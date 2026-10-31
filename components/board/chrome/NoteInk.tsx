'use client';
/** A note page: type on it, or switch the pen on and write on the same sheet, like Notability. */
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode } from 'react';
import type { DrawTool, InkPoint, MarkColor, MarkKind } from '../api/types';
import { useBoard, useSnapshot } from '../context';
import { hitsMark, markPath, simplify, sizeFor } from '../lib/ink';
import { Icon } from './Icon';
import { InkTools } from './InkTools';

interface Live { kind: MarkKind; size: number; points: InkPoint[]; id: number }

export function NoteInk({ noteId, children, scroller }: { noteId: string; children: ReactNode; scroller: () => HTMLElement | null }): ReactElement {
  const { store } = useBoard();
  useSnapshot();   // a saved or erased mark draws the page again
  const [tool, setTool] = useState<DrawTool | null>(null);
  const [color, setColor] = useState<MarkColor>('ink');
  const lastTool = useRef<DrawTool>('pen');
  const [live, setLive] = useState<Live | null>(null);
  const page = useRef<HTMLDivElement>(null);
  const penSeen = useRef(false);
  const marks = store.marksOn(noteId);

  const at = (e: ReactPointerEvent): [number, number] => {
    const box = page.current!.getBoundingClientRect(), s = scroller();
    return [e.clientX - box.left + (s?.scrollLeft ?? 0), e.clientY - box.top + (s?.scrollTop ?? 0)];
  };
  const erase = (x: number, y: number): void => {
    for (const m of store.marksOn(noteId)) if (hitsMark(m, x, y, 8)) store.eraseMark(m.id);
  };
  const add = (e: ReactPointerEvent, x: number, y: number): InkPoint => (e.pointerType === 'pen' ? [x, y, e.pressure] : [x, y]);

  const down = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (!tool || e.button !== 0) return;
    if (e.pointerType === 'pen') penSeen.current = true;
    else if (e.pointerType === 'touch' && penSeen.current) return;   // a resting palm
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = at(e);
    if (tool === 'eraser') { erase(x, y); return; }
    setLive({ kind: tool, size: sizeFor(tool), points: [add(e, x, y)], id: e.pointerId });
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (!tool || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const [x, y] = at(e);
    if (tool === 'eraser') { erase(x, y); return; }
    setLive((l) => (l && l.id === e.pointerId ? { ...l, points: [...l.points, add(e, x, y)] } : l));
  };
  const up = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (!live || live.id !== e.pointerId) return;
    const points = live.kind === 'arrow' ? [live.points[0], live.points[live.points.length - 1]] : simplify(live.points, .6);
    if (points.length >= 2) store.addMark({ kind: live.kind, color, size: live.size, points, noteId, touches: [] });
    setLive(null);
  };

  const scrollTop = scroller()?.scrollTop ?? 0;
  return (
    <div className={`notepage${tool ? ' penon' : ''}`} ref={page} data-pb="notepage">
      {children}
      <svg className="noteink" aria-hidden="true" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <g transform={`translate(0 ${-scrollTop})`}>
          {marks.map((m) => <path key={m.id} data-mark={m.id} d={markPath(m.kind, m.points, m.size)} className={`ink ink-${m.kind} ink-c-${m.color}`} style={m.kind === 'arrow' ? { strokeWidth: m.size } : undefined} />)}
          {live && <path d={markPath(live.kind, live.points, live.size)} className={`ink ink-${live.kind} ink-c-${color}`} style={live.kind === 'arrow' ? { strokeWidth: live.size } : undefined} />}
        </g>
      </svg>
      <div className="notetools" data-pb="notetools">
        <button type="button" className="inkbtn" data-act="type" aria-pressed={!tool} aria-label="Type" title="Type" onClick={() => setTool(null)}><Icon name="type" /></button>
        {!tool && <button type="button" className="inkbtn" data-act="write" aria-label="Write" title="Write" onClick={() => setTool(lastTool.current)}><Icon name="pencil" /></button>}
        {tool && <InkTools tool={tool} color={color} onTool={(t) => { lastTool.current = t; setTool(t); }} onColor={setColor} onUndo={() => store.undoMark(noteId)} />}
      </div>
    </div>
  );
}
