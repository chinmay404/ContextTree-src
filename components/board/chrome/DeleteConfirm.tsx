'use client';
/** The one confirm for deleting a chat (naming its branches), and the board's Delete / Backspace key. */
import './delete-confirm.css';
import { useCallback, useEffect, useLayoutEffect, useRef, type ReactElement } from 'react';
import { useBoard, useSnapshot } from '../context';
import { overlayOpen } from '../store';
import { useEscape } from './escape';

const typing = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && !!t.closest('textarea, input, select, [contenteditable="true"]');

export function DeleteConfirm(): ReactElement {
  const { store } = useBoard();
  const snap = useSnapshot();
  const open = snap.ui.confirm;
  const boxRef = useRef<HTMLDivElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const shown = useRef<string>('');   // the text stays while the sheet fades out
  if (open) shown.current = open.text;

  const cancel = useCallback(() => { store.cancelConfirm(); }, [store]);
  const ok = useCallback(() => { void store.confirmDelete(); }, [store]);
  useEscape(!!open, cancel);

  const isOpen = !!open;
  useLayoutEffect(() => {
    if (isOpen) {
      if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      okRef.current?.focus({ preventScroll: true });
    } else if (opener.current) {
      const o = opener.current;
      opener.current = null;
      const a = document.activeElement;
      if (o.isConnected && (!a || a === document.body || boxRef.current?.contains(a))) o.focus({ preventScroll: true });
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const ui = store.getSnapshot().ui;
      if (ui.confirm) {
        // Enter confirms; on a focused button the browser's own click does the job.
        if (e.key === 'Enter' && !(e.target instanceof HTMLElement && e.target.closest('button'))) { e.preventDefault(); ok(); }
        return;
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (typing(e.target) || overlayOpen(ui)) return;
      if (e.target instanceof Element && e.target.closest('[data-pb="boardmenu"]')) return;
      if (!ui.selected || !store.graph().cards.has(ui.selected)) return;
      e.preventDefault();
      store.requestDelete(ui.selected);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [store, ok]);

  return (
    <div className={`wrap${open ? ' on' : ''}`} data-pb="confirm" inert={!open} aria-hidden={!open}
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}>
      <div ref={boxRef} className="sheetbox dconfirm" role="alertdialog" aria-modal="true" aria-labelledby="pb-confirm-h">
        <h2 id="pb-confirm-h">{shown.current}</h2>
        <div className="row">
          <button type="button" className="btn" onClick={cancel}>Cancel</button>
          <button type="button" ref={okRef} className="btn primary" onClick={ok}>Delete</button>
        </div>
      </div>
    </div>
  );
}
