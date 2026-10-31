'use client';
/** The board's pen: a button beside Add, and its tools while it is on. D toggles it, Esc leaves. */
import { useEffect, type ReactElement } from 'react';
import { useBoard, useSnapshot } from '../context';
import { typing } from '../lib/util';
import { Icon } from './Icon';
import { InkTools } from './InkTools';
import { useEscape } from './escape';

export function DrawBar(): ReactElement {
  const { store } = useBoard();
  const { ui } = useSnapshot();
  const draw = ui.draw;
  useEscape(!!draw, () => store.toggleDraw());
  useEffect(() => {
    if (!draw) return;
    const onKey = (e: KeyboardEvent): void => {
      if (typing(e.target) || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      store.undoMark(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [draw, store]);
  return (
    <>
      <button type="button" className={`float drawbtn${draw ? ' on' : ''}`} data-pb="draw" aria-pressed={!!draw} aria-label="Draw on the board (D)" title="Draw (D)" onClick={() => store.toggleDraw()}>
        <Icon name="pencil" />
      </button>
      <button type="button" className="float drawbtn drawhide" data-pb="draw-hide" aria-pressed={ui.marksHidden} aria-label={ui.marksHidden ? 'Show drawings' : 'Hide drawings'} title={ui.marksHidden ? 'Show drawings' : 'Hide drawings'} onClick={() => store.toggleMarksHidden()}>
        <Icon name={ui.marksHidden ? 'eye-off' : 'eye'} />
      </button>
      {draw && (
        <div className="float drawbar" data-pb="drawbar">
          <InkTools tool={draw.tool} color={draw.color} onTool={(tool) => store.setDraw({ tool })} onColor={(color) => store.setDraw({ color })} onUndo={() => store.undoMark(null)} />
        </div>
      )}
    </>
  );
}
