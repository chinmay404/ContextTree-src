'use client';
/** The latest toast only; Undo while the store still holds the deletion (10 s). */
import './toast.css';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useBoard, useSnapshot } from '../context';
import type { UiState } from '../store';

export function Toast(): ReactElement {
  const { store } = useBoard();
  const open = useSnapshot().ui.toast;
  const shown = useRef<UiState['toast']>(null);   // the text stays while the toast fades out
  if (open) shown.current = open;
  const t = open ?? shown.current;
  const [fading, setFading] = useState(false);   // the pill keeps its Undo while it fades, so it does not shrink
  useEffect(() => {
    if (open) { setFading(false); return; }
    if (!shown.current) return;
    setFading(true);
    const h = setTimeout(() => { setFading(false); shown.current = null; }, 260);
    return () => clearTimeout(h);
  }, [open]);
  return (
    <div className={`pb-toast${open ? ' on' : ''}`} role="status" aria-live="polite" inert={!open} aria-hidden={!open}>
      <span>{t?.text ?? ''}</span>
      {(open || fading) && t?.undoCardId ? <button type="button" data-act="undo" onClick={() => { void store.undo(); }}>Undo</button> : null}
    </div>
  );
}
