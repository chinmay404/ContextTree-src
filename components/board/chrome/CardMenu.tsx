'use client';
/** The right-click menu on a card: its colour. */
import { useEffect, useLayoutEffect, useRef, type ReactElement } from 'react';
import { useBoard, useSnapshot } from '../context';
import { colorOf } from '../lib/colors';
import { clamp } from '../lib/util';
import { ColorSwatches } from './ColorSwatches';
import { useEscape } from './escape';

const W = 290, H = 84;

export function CardMenu(): ReactElement {
  const { store } = useBoard();
  const { ui, cards } = useSnapshot();
  const open = ui.cardMenu;
  const shown = useRef(open);
  const boxRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  if (open) shown.current = open;
  const m = open ?? shown.current;
  const card = m ? cards.get(m.cardId) : undefined;

  useEscape(!!open, () => store.closeCardMenu());
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!(e.target instanceof Element && e.target.closest('[data-pb="cardmenu"]'))) store.closeCardMenu(); };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [open, store]);
  // Focus goes to the current swatch; back to where it was when the menu closes.
  useLayoutEffect(() => {
    if (open) {
      if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      boxRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    } else if (opener.current) {
      const o = opener.current; opener.current = null;
      const a = document.activeElement;
      if (o.isConnected && !o.closest('[inert]') && (!a || a === document.body || boxRef.current?.contains(a))) o.focus({ preventScroll: true });
    }
  }, [open]);

  const w = typeof window === 'undefined' ? 1280 : innerWidth, h = typeof window === 'undefined' ? 800 : innerHeight;
  return (
    <div ref={boxRef} className={`menu${open ? ' on' : ''}`} data-pb="cardmenu" role="menu" aria-label="Card" inert={!open} aria-hidden={!open}
      style={m ? { left: clamp(m.x, 12, w - W - 12), top: clamp(m.y, 12, h - H - 12), transformOrigin: '0 0' } : undefined}>
      <div className="swl">Colour</div>
      {card && m ? <ColorSwatches value={colorOf(card.data)} onPick={(c) => { store.setColor(m.cardId, c); store.closeCardMenu(); }} /> : null}
    </div>
  );
}
