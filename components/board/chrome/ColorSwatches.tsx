'use client';
import { useRef, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import { CARD_COLORS, COLOR_LABEL, COLOR_SWATCH, type CardColor } from '../lib/colors';

/** The colour row: Default and the eight tones as a radio group. Arrow keys move between swatches, Enter or Space picks. */
export function ColorSwatches(p: { value: CardColor | null; onPick: (c: CardColor | null) => void; autoFocus?: boolean }): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const all: (CardColor | null)[] = [null, ...CARD_COLORS];
  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const btns = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    let to = -1;
    if (e.key in keys) to = (i + keys[e.key] + btns.length) % btns.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = btns.length - 1;
    if (to < 0) return;
    e.preventDefault(); e.stopPropagation();
    btns[to]?.focus({ preventScroll: true });
  };
  return (
    <div ref={ref} className="swatches" role="radiogroup" aria-label="Colour" onKeyDown={onKey}>
      {all.map((c) => {
        const on = (p.value ?? null) === c;
        return (
          <button key={c ?? 'none'} type="button" role="radio" aria-checked={on} aria-label={c ? COLOR_LABEL[c] : 'Default'} title={c ? COLOR_LABEL[c] : 'Default'}
            data-color={c ?? 'none'} className={c ? '' : 'none'} style={c ? ({ '--sw': COLOR_SWATCH[c] } as CSSProperties) : undefined}
            tabIndex={on ? 0 : -1} autoFocus={p.autoFocus && on} onClick={() => p.onPick(c)} />
        );
      })}
    </div>
  );
}
