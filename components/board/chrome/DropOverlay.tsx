'use client';
import type { ReactElement } from 'react';
import { useSnapshot } from '../context';

/** The full-window "Drop to add" veil while files or links are dragged over the board (prototype 1141-1146, #drop). */
export function DropOverlay(): ReactElement {
  const on = useSnapshot().ui.dropping;
  return (
    <div className={on ? 'on' : undefined} data-pb="drop" aria-hidden="true">
      <div>
        <b>Drop to add</b>
        <span>Drop on a desk to give it to that question. We&apos;ll work out what each file is.</span>
      </div>
    </div>
  );
}
