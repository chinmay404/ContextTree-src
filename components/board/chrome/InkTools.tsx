'use client';
/** Pen, arrow, highlight, eraser and three colours: the same row on the board and on a note page. */
import './ink.css';
import type { ReactElement } from 'react';
import type { DrawTool, MarkColor } from '../api/types';
import { Icon } from './Icon';

const TOOLS: { id: DrawTool; icon: string; label: string }[] = [
  { id: 'pen', icon: 'pencil', label: 'Pen' },
  { id: 'arrow', icon: 'arrow-up-right', label: 'Arrow' },
  { id: 'highlight', icon: 'highlighter', label: 'Highlight' },
  { id: 'eraser', icon: 'eraser', label: 'Eraser' },
];
const COLORS: { id: MarkColor; label: string }[] = [{ id: 'ink', label: 'Ink' }, { id: 'red', label: 'Red' }, { id: 'blue', label: 'Blue' }];

export function InkTools({ tool, color, onTool, onColor, onUndo, tools = TOOLS.map((t) => t.id) }: {
  tool: DrawTool; color: MarkColor; onTool: (t: DrawTool) => void; onColor: (c: MarkColor) => void; onUndo: () => void;
  tools?: DrawTool[];
}): ReactElement {
  return (
    <div className="inktools" role="toolbar" aria-label="Drawing tools">
      {TOOLS.filter((t) => tools.includes(t.id)).map((t) => (
        <button key={t.id} type="button" className="inkbtn" data-tool={t.id} aria-label={t.label} title={t.label} aria-pressed={tool === t.id} onClick={() => onTool(t.id)}>
          <Icon name={t.icon} />
        </button>
      ))}
      <span className="inksep" />
      {COLORS.map((c) => (
        <button key={c.id} type="button" className={`inkdot ink-c-${c.id}`} data-color={c.id} aria-label={c.label} title={c.label} aria-pressed={color === c.id} onClick={() => onColor(c.id)} />
      ))}
      <span className="inksep" />
      <button type="button" className="inkbtn" data-act="undo" aria-label="Undo" title="Undo" onClick={onUndo}><Icon name="undo-2" /></button>
    </div>
  );
}
