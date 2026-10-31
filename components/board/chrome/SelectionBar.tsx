'use client';
/**
 * The bar over a passage selected in an answer (S6): "Add to note" and "Ask in a new branch". It works in the focus view and
 * the compare sheet; a selection anywhere else (a question, the title, a field) shows nothing. It appears with a 120 ms fade
 * and nothing else (it can show up many times in a reading); Esc hides it before anything underneath, and Tab reaches it.
 */
import './selection-bar.css';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { useBoard } from '../context';
import { quoteBlock } from '../lib/selection-quote';
import { Icon } from './Icon';
import { useEscape } from './escape';

interface Pick { chatId: string; text: string; messageId: string | null; compare: boolean }

const BODY = '.art .body';

/** The passage selected inside one answer body, or null. */
function readPick(focusId: string | null): (Pick & { rect: DOMRect }) | null {
  const s = getSelection();
  if (!s || s.rangeCount === 0 || s.isCollapsed) return null;
  const r = s.getRangeAt(0);
  const n = r.commonAncestorContainer;
  const el = n instanceof Element ? n : n.parentElement;
  const body = el?.closest<HTMLElement>(BODY);
  if (!body || body.closest('[inert], .live, .fx-out')) return null;
  const col = body.closest<HTMLElement>('.cmp-col[data-id]');
  const chatId = col ? col.dataset.id! : focusId;
  const text = s.toString().trim();
  if (!chatId || !text) return null;
  const rect = r.getBoundingClientRect();
  if (!rect.width && !rect.height) return null;
  return { chatId, text, messageId: body.closest<HTMLElement>('[data-mid]')?.dataset.mid ?? null, compare: !!col, rect };
}

export function SelectionBar(): ReactElement {
  const { store, engine } = useBoard();
  const [pick, setPick] = useState<Pick | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);   // where the cursor was before Tab moved it into the bar
  const down = useRef(false);                          // a drag-selection in progress shows nothing until it ends

  const place = useCallback(() => {
    const bar = barRef.current, rect = rectRef.current;
    if (!bar || !rect) return;
    const w = bar.offsetWidth, h = bar.offsetHeight;
    const x = Math.round(Math.max(8, Math.min(innerWidth - w - 8, rect.left + rect.width / 2 - w / 2)));
    const above = rect.top - h - 8;
    bar.style.left = `${x}px`;
    bar.style.top = `${Math.round(above >= 8 ? above : Math.min(innerHeight - h - 8, rect.bottom + 8))}px`;
  }, []);

  const read = useCallback(() => {
    const p = readPick(store.getSnapshot().ui.focus);
    rectRef.current = p?.rect ?? rectRef.current;
    setPick((cur) => {
      if (!p) return cur ? null : cur;
      return cur && cur.chatId === p.chatId && cur.text === p.text && cur.messageId === p.messageId && cur.compare === p.compare ? cur : { chatId: p.chatId, text: p.text, messageId: p.messageId, compare: p.compare };
    });
    if (p) place();
  }, [store, place]);

  useEffect(() => {
    const onSel = (): void => { if (!down.current) read(); };
    const onDown = (e: PointerEvent): void => { if (!(e.target as Element | null)?.closest?.('[data-pb="selbar"]')) down.current = true; };
    const onUp = (): void => { if (down.current) { down.current = false; read(); } };
    const onMove = (): void => { if (rectRef.current && !down.current) read(); };
    document.addEventListener('selectionchange', onSel);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onUp, true);
    document.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('selectionchange', onSel);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onUp, true);
      document.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [read]);

  useLayoutEffect(() => { if (pick) place(); }, [pick, place]);

  const visible = !!pick;
  const dismiss = useCallback(() => {
    const bar = barRef.current, a = document.activeElement;
    const back = bar && a && bar.contains(a) ? returnTo.current ?? document.querySelector<HTMLElement>('[data-pb="compare"] [role="dialog"], [data-pb="focus"]') : null;
    getSelection()?.removeAllRanges();
    setPick(null);
    returnTo.current = null;
    back?.focus({ preventScroll: true });
  }, []);
  useEscape(visible, dismiss);

  // Tab from the passage goes to the bar first; from its ends it returns to where it came from.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent): void => {
      const bar = barRef.current;
      if (e.key !== 'Tab' || !bar || e.altKey || e.ctrlKey || e.metaKey) return;
      const btns = Array.from(bar.querySelectorAll<HTMLButtonElement>('button'));
      const a = document.activeElement;
      if (!bar.contains(a)) {
        if (e.shiftKey) return;
        e.preventDefault(); e.stopPropagation();
        returnTo.current = a instanceof HTMLElement ? a : null;
        btns[0]?.focus({ preventScroll: true });
      } else if ((a === btns[btns.length - 1] && !e.shiftKey) || (a === btns[0] && e.shiftKey)) {
        e.preventDefault(); e.stopPropagation();
        returnTo.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [visible]);

  const done = (): void => { getSelection()?.removeAllRanges(); setPick(null); returnTo.current = null; };

  const addNote = (): void => {
    if (!pick || !engine) return;
    const id = engine.addToNotepad(pick.chatId, pick.text, !pick.compare);
    const anchor = pick.compare;
    done();
    if (id && anchor) store.toast('Added to this question’s notes');
  };
  const askBranch = (): void => {
    if (!pick) return;
    const r = barRef.current?.getBoundingClientRect() ?? null;
    const first = quoteBlock(pick.text);
    done();
    if (pick.compare) store.closeCompare();
    store.openDialog({ mode: 'branch', parentId: pick.chatId, first, forkedFromMessageId: pick.messageId, anchor: r });
  };

  return (
    <div ref={barRef} className={`float selbar${visible ? ' on' : ''}`} data-pb="selbar" role="toolbar" aria-label="Selected text"
      inert={!visible} aria-hidden={!visible}
      onMouseDown={(e) => e.preventDefault()}>   {/* pressing the bar must not take the selection away; a pointerdown preventDefault would swallow the click */}
      <button type="button" data-sel="note" onClick={addNote}><Icon name="sticky-note" />Add to note</button>
      <button type="button" data-sel="branch" onClick={askBranch}><Icon name="git-branch" />Ask in a new branch</button>
    </div>
  );
}
