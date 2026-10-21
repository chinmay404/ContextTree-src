'use client';
/** Logo, name and board title (click to rename), plus the board switcher menu (prototype 179-181, 362). */
import './brand.css';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import type { BoardSummary } from '../api/types';
import { newId } from '../api/ids';
import { useBoard, useSnapshot } from '../context';
import { Icon } from './Icon';
import { useEscape } from './escape';

export function BrandBar(): ReactElement {
  const { store, props } = useBoard();
  const { board } = useSnapshot();
  const { api, boardId, onOpenBoard, onOpenSettings, defaultModel } = props;
  const title = board?.title ?? '';

  const [editing, setEditing] = useState(false);
  const inRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLButtonElement>(null);
  const refocusTitle = useRef(false);
  const done = useRef(false);

  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const logoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(false);
  const openRef = useRef(false);
  openRef.current = open;

  useEscape(editing, () => { done.current = true; refocusTitle.current = true; setEditing(false); });
  useEscape(open, () => { returnFocus.current = true; setOpen(false); });

  useLayoutEffect(() => {
    if (!editing) {
      if (refocusTitle.current) { refocusTitle.current = false; titleRef.current?.focus({ preventScroll: true }); }
      return;
    }
    done.current = false;
    inRef.current?.focus({ preventScroll: true });
    inRef.current?.select();
  }, [editing]);

  const commit = (viaKey = false) => {
    if (done.current) return;
    if (viaKey) refocusTitle.current = true;
    done.current = true;
    const v = inRef.current?.value.trim() ?? '';
    setEditing(false);
    if (v && v !== title) store.renameBoard(v);
  };

  // Load the board list each time the menu opens; close on an outside press.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setBoards(null);
    api.listBoards().then((b) => { if (alive) setBoards(b); }).catch(() => { if (alive) setBoards([]); });
    const down = (e: PointerEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t?.closest('[data-pb="boardmenu"], [data-pb="brand"] .lg')) setOpen(false);
    };
    document.addEventListener('pointerdown', down);
    return () => { alive = false; document.removeEventListener('pointerdown', down); };
  }, [open, api]);

  useLayoutEffect(() => {
    if (open) { returnFocus.current = false; menuRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true }); return; }
    if (!returnFocus.current) return;
    returnFocus.current = false;
    const a = document.activeElement;
    if (!a || a === document.body || menuRef.current?.contains(a)) logoRef.current?.focus({ preventScroll: true });
  }, [open, boards]);

  const close = () => { returnFocus.current = true; setOpen(false); };
  const openBoard = (id: string) => { close(); if (id !== boardId) onOpenBoard?.(id); };
  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = newId('b');
      await api.createBoard({ id, title: 'Untitled board' });
      if (defaultModel) await api.updateCard(id, `${id}_q1`, { data: { model: defaultModel } }).catch(() => undefined);   // best effort: q1 keeps the catalog default
      if (openRef.current) close();
      onOpenBoard?.(id);
    } catch {
      store.toast("Couldn't create a board. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const menuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus({ preventScroll: true });
    e.preventDefault();
  };

  return (
    <>
      <div className="float" data-pb="brand">
        <button ref={logoRef} type="button" className="lg" aria-label="Switch board" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <Icon name="git-fork" />
        </button>
        <b>Context Tree</b>
        {editing ? (
          <input ref={inRef} className="bt" defaultValue={title} aria-label="Board title" maxLength={120} autoComplete="off"
            onBlur={() => commit()} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(true); } }} />
        ) : (
          <button ref={titleRef} type="button" className="bt" disabled={!board} title="Rename this board" onClick={() => setEditing(true)}>{title}</button>
        )}
      </div>
      <div ref={menuRef} className={`menu${open ? ' on' : ''}`} data-pb="boardmenu" role="menu" style={{ left: 16, top: 72 }}
        inert={!open} aria-hidden={!open} onKeyDown={menuKey}>
        {boards?.map((b) => (
          <button key={b.id} type="button" role="menuitem" data-board={b.id} data-current={b.id === boardId ? 'true' : undefined}
            aria-current={b.id === boardId ? 'true' : undefined} onClick={() => openBoard(b.id)}>
            <span className="c"><Icon name="layers" /></span><span className="nm">{b.title || 'Untitled board'}</span>
            {b.id === boardId && <kbd>Current</kbd>}
          </button>
        ))}
        {boards && boards.length === 0 && <div className="empty">No boards yet.</div>}
        <div className="sep" role="separator" />
        {onOpenBoard && (
          <button type="button" role="menuitem" data-m="new" disabled={busy} onClick={() => { void create(); }}>
            <span className="c"><Icon name="plus" /></span>New board
          </button>
        )}
        {onOpenSettings && (
          <button type="button" role="menuitem" data-m="keys" onClick={() => { close(); onOpenSettings(); }}>
            <span className="c"><Icon name="sliders-horizontal" /></span>API keys
          </button>
        )}
        <button type="button" role="menuitem" data-m="tour" onClick={() => { close(); store.openTour(); }}>
          <span className="c"><Icon name="sparkles" /></span>Take the tour
        </button>
      </div>
    </>
  );
}
