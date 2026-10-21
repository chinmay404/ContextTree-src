'use client';
/** The Add button, the add / right-click menu, the link pop-up and the hidden file input (prototype 1155-1181). */
import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import { useBoard, useSnapshot } from '../context';
import type { UiState } from '../store';
import { clamp } from '../lib/util';
import { Icon } from './Icon';
import { useEscape } from './escape';

const MENU_H = 232;
type Item = { k: 'note' | 'chat' | 'file' | 'link'; label: string; icon: string; bg: string; fg: string; kbd: string };
const ITEMS: Item[] = [
  { k: 'note', label: 'Note', icon: 'sticky-note', bg: '#FFE1EA', fg: '#D1467E', kbd: 'N' },
  { k: 'chat', label: 'New question', icon: 'message-circle', bg: '#1D1D1F', fg: '#FFFFFF', kbd: 'Q' },
  { k: 'file', label: 'Upload files', icon: 'upload', bg: '#FFF0B3', fg: '#B8860B', kbd: '' },
  { k: 'link', label: 'Paste a link', icon: 'link', bg: '#C9ECFF', fg: '#2A86C4', kbd: '' },
];
const withScheme = (v: string): string => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

export function AddMenu(): ReactElement {
  const { store, engine } = useBoard();
  const { ui } = useSnapshot();
  const menu = ui.menu, pop = ui.linkPop;
  const addRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<{ at: [number, number] | null; deskId: string | null }>({ at: null, deskId: null });
  const shownMenu = useRef<NonNullable<UiState['menu']> | null>(null);
  const shownPop = useRef<NonNullable<UiState['linkPop']> | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  if (menu) shownMenu.current = menu;
  if (pop) shownPop.current = pop;
  const m = menu ?? shownMenu.current, lp = pop ?? shownPop.current;

  useEscape(!!menu || !!pop, () => { store.closeMenu(); store.closeLinkPop(); });

  // Outside presses close the menu and the link pop (the button and the menu themselves do not).
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t?.closest('[data-pb="menu"], [data-pb="add"]')) store.closeMenu();
      if (!t?.closest('[data-pb="linkpop"], [data-pb="menu"]')) store.closeLinkPop();
    };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, [store]);

  const pick = useCallback((at: [number, number] | null, deskId: string | null) => {
    target.current = { at, deskId };
    fileRef.current?.click();
  }, []);

  // The focus view's "Source" button asks for the file picker on its desk.
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<{ deskId?: string }>).detail?.deskId ?? null;
      pick(null, id);
    };
    window.addEventListener('pb:pickfiles', on);
    return () => window.removeEventListener('pb:pickfiles', on);
  }, [pick]);

  // Focus: into the menu when opened from the button, into the link field; back to the opener when closed and nothing took it.
  const menuOpen = !!menu, popOpen = !!pop, fromAdd = !!menu?.fromAdd;
  useLayoutEffect(() => {
    if (!menuOpen) return;
    if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (fromAdd) menuRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }, [menuOpen, fromAdd]);
  useLayoutEffect(() => {
    if (!popOpen) return;
    if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (inRef.current) { inRef.current.value = ''; inRef.current.focus({ preventScroll: true }); }
  }, [popOpen]);
  useLayoutEffect(() => {
    if (menuOpen || popOpen || !opener.current) return;
    const o = opener.current;
    opener.current = null;
    const a = document.activeElement;
    if (o.isConnected && !o.closest('[inert]') && (!a || a === document.body || menuRef.current?.contains(a) || a === inRef.current)) o.focus({ preventScroll: true });
  }, [menuOpen, popOpen]);

  const toggle = () => {
    if (menu) { store.closeMenu(); return; }
    const r = addRef.current!.getBoundingClientRect();
    store.openMenu({ x: r.left, y: r.top, at: null, fromAdd: true });
  };

  const choose = (k: Item['k']) => {
    const mm = menu;
    if (!mm || !engine) return;
    store.closeMenu();
    const at = mm.at, p = at ?? engine.ctx.s2w(innerWidth / 2, innerHeight / 2);
    if (k === 'note') {
      const [fx, fy] = at ? [p[0] - 106, p[1] - 30] : engine.freeSpot(p[0] - 106, p[1] - 30, 212, 90);
      engine.spawnNote(fx, fy);
    } else if (k === 'chat') store.openDialog({ mode: 'root', at: at ? [p[0] - 160, p[1] - 40] : null });
    else if (k === 'file') pick(at, at ? engine.deskAt(p[0], p[1]) : null);
    else store.openLinkPop({ x: mm.x, y: mm.fromAdd ? mm.y - 70 : mm.y, at });
  };

  const linkGo = () => {
    const v = inRef.current?.value.trim();
    if (!v || !pop || !engine) return;
    const deskId = pop.at ? engine.deskAt(pop.at[0], pop.at[1]) : engine.selectedDesk();
    if (engine.addLink(withScheme(v), deskId, pop.at)) store.closeLinkPop();
    else store.toast("That doesn't look like a link.");
  };

  const menuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus({ preventScroll: true });
    e.preventDefault();
  };

  const w = typeof window === 'undefined' ? 1280 : innerWidth, h = typeof window === 'undefined' ? 800 : innerHeight;
  const menuStyle: CSSProperties | undefined = m ? {
    left: clamp(m.x, 12, w - 270), top: clamp(m.fromAdd ? m.y - MENU_H - 8 : m.y, 12, h - MENU_H - 12),
    transformOrigin: m.fromAdd ? '0 100%' : '0 0',
  } : undefined;
  const popStyle: CSSProperties | undefined = lp ? { left: clamp(lp.x, 12, w - 440), top: clamp(lp.y, 12, h - 70) } : undefined;

  return (
    <>
      <button ref={addRef} type="button" className={`float${menu?.fromAdd ? ' on' : ''}`} data-pb="add" aria-haspopup="menu" aria-expanded={!!menu}
        aria-label="Add a note, question, file or link" onClick={toggle}>
        <span className="pl"><Icon name="plus" /></span>Add
      </button>
      <div ref={menuRef} className={`menu${menu ? ' on' : ''}`} data-pb="menu" role="menu" style={menuStyle} inert={!menu} aria-hidden={!menu} onKeyDown={menuKey}>
        {ITEMS.map((it, i) => (
          <span key={it.k} style={{ display: 'contents' }}>
            {i === 2 && <div className="sep" role="separator" />}
            <button type="button" role="menuitem" data-m={it.k} onClick={() => choose(it.k)}>
              <span className="c" style={{ background: it.bg }}><Icon name={it.icon} color={it.fg} /></span>{it.label}{it.kbd && <kbd>{it.kbd}</kbd>}
            </button>
          </span>
        ))}
      </div>
      <div className={`float${pop ? ' on' : ''}`} data-pb="linkpop" style={popStyle} inert={!pop} aria-hidden={!pop}>
        <input ref={inRef} placeholder="Paste a link to a page or a YouTube video" aria-label="Link" autoComplete="off"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); linkGo(); } }} />
        <button type="button" className="go" data-act="linkgo" onClick={linkGo}>Add</button>
      </div>
      <input ref={fileRef} type="file" multiple hidden data-pb="filein" tabIndex={-1} aria-hidden="true"
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = '';
          const t = target.current;
          target.current = { at: null, deskId: null };
          if (files.length) engine?.addFiles(files, t.at, t.deskId);
        }} />
    </>
  );
}
