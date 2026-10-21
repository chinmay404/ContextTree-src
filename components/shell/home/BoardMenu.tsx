'use client';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

/** The "…" button of a board and its small menu: Rename, Delete board. */
export function BoardMenu({ title, onRename, onDelete }: { title: string; onRename(): void; onDelete(): void }): ReactElement {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      btnRef.current?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    const n = items.length;
    items[(i + (e.key === 'ArrowDown' ? 1 : n - 1) + n) % n]?.focus();
  };

  const pick = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <span ref={wrapRef} className="bmenu-wrap" onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        className={`more${open ? ' on' : ''}`}
        aria-label={`Options for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal size={18} strokeWidth={2} />
      </button>
      {open && (
        <div ref={menuRef} role="menu" className="menu bmenu">
          <button type="button" role="menuitem" className="mi" onClick={pick(onRename)}>
            <span className="c"><Pencil size={16} strokeWidth={2} /></span>Rename
          </button>
          <div className="sep" role="separator" />
          <button type="button" role="menuitem" className="mi danger" onClick={pick(onDelete)}>
            <span className="c"><Trash2 size={16} strokeWidth={2} /></span>Delete board
          </button>
        </div>
      )}
    </span>
  );
}
