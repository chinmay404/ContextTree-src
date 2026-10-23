'use client';
/** The one confirm for deleting a chat (naming its branches), and the board's Delete / Backspace key. */
import './delete-confirm.css';
import { useCallback, useEffect, useLayoutEffect, useRef, type ReactElement } from 'react';
import { useBoard, useSnapshot } from '../context';
import { typing } from '../lib/util';
import { overlayOpen } from '../store';
import { useEscape } from './escape';

export function DeleteConfirm(): ReactElement {
  const { store } = useBoard();
  const snap = useSnapshot();
  const open = snap.ui.confirm;
  const boxRef = useRef<HTMLDivElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const allRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const shown = useRef<{ text: string; pile?: { front: string; count: number; set?: boolean } }>({ text: '' });   // the text stays while the sheet fades out
  if (open) shown.current = { text: open.text, pile: open.pile };

  const cancel = useCallback(() => { store.cancelConfirm(); }, [store]);
  const ok = useCallback(() => { void store.confirmDelete('one'); }, [store]);
  const all = useCallback(() => { void store.confirmDelete('all'); }, [store]);
  useEscape(!!open, cancel);

  const isOpen = !!open;
  const cardId = open?.cardId ?? null;
  const cardRef = useRef<string | null>(null);
  if (cardId) cardRef.current = cardId;
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (isOpen) {
      if (!opener.current) opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      okRef.current?.focus({ preventScroll: true });
    } else if (box && (opener.current || cardRef.current)) {
      const o = opener.current, id = cardRef.current;
      opener.current = null; cardRef.current = null;
      const a = document.activeElement;
      const gone = !!id && !store.getSnapshot().cards.has(id);   // the deleted card's own element may still hold focus
      if (a && a !== document.body && !box.contains(a) && !a.closest('[inert]') && !(gone && a.closest(`.card[data-id="${CSS.escape(id)}"]`))) return;   // something else took focus
      const root = box.closest<HTMLElement>('.pb-root');
      const live = store.getSnapshot().cards;
      // An element inside a card that is no longer on the board is dying (its fade keeps it connected a moment).
      const usable = (el: HTMLElement | null | undefined): el is HTMLElement => {
        if (!el || !el.isConnected || el.closest('[inert]')) return false;
        const host = el.closest<HTMLElement>('.card[data-id]');
        return !host || live.has(host.dataset.id!);
      };
      const hasFocus = !!store.getSnapshot().ui.focus;
      const more = hasFocus ? root?.querySelector<HTMLElement>('[data-pb="focus"] [data-act="more"]') : null;
      const focusEl = more ?? (hasFocus ? root?.querySelector<HTMLElement>('[data-pb="focus"]') : null);
      const card = id && !gone ? root?.querySelector<HTMLElement>(`.card[data-id="${CSS.escape(id)}"]`) : null;
      const toRoot = (): void => { if (root) { if (!root.hasAttribute('tabindex')) root.tabIndex = -1; root.focus({ preventScroll: true }); } };
      const target = [o, focusEl, card].find(usable);
      if (target) target.focus({ preventScroll: true }); else toRoot();
      // The focus view's close or a card's fade can take the focus away a moment later; check once more next frame.
      requestAnimationFrame(() => { const x = document.activeElement; if (!x || x === document.body || !usable(x as HTMLElement)) toRoot(); });
    }
  }, [isOpen, store]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const ui = store.getSnapshot().ui;
      if (ui.confirm) {
        if (ui.confirm.pile && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {   // between "Delete <front>" and "Delete all"
          e.preventDefault();
          (e.key === 'ArrowRight' ? allRef : okRef).current?.focus({ preventScroll: true });
          return;
        }
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

  const pile = shown.current.pile;
  return (
    <div className={`wrap${open ? ' on' : ''}`} data-pb="confirm" inert={!open} aria-hidden={!open}
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}>
      <div ref={boxRef} className={`sheetbox dconfirm${pile ? ' wide' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="pb-confirm-h">
        <h2 id="pb-confirm-h">{shown.current.text}</h2>
        <div className="row">
          <button type="button" className="btn" onClick={cancel}>Cancel</button>
          {pile ? (
            <>
              <button type="button" ref={okRef} className="btn primary" onClick={ok}>{pile.set ? `Keep the ${pile.count} ${pile.count === 1 ? 'source' : 'sources'}` : `Delete "${pile.front}"`}</button>
              <button type="button" ref={allRef} className="btn primary" onClick={all}>{`Delete all ${pile.count}`}</button>
            </>
          ) : <button type="button" ref={okRef} className="btn primary" onClick={ok}>Delete</button>}
        </div>
      </div>
    </div>
  );
}
