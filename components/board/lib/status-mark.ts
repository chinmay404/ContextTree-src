/** A source's reading status on its card: a ring with a turning arc, which closes into a check or an exclamation. */
export type MarkState = 'reading' | 'done' | 'failed';

export const SPIN_MS = 900;
/** How long a finished source shows its check before its type icon comes back. */
export const DONE_MS = 1200;

const GLYPH: Partial<Record<MarkState, string>> = { done: 'M7.6 12.4l3 3 5.8-6.6', failed: 'M12 7.4v5.8M12 16.5v.1' };

/**
 * Cards re-render whole, so the animation takes its place from `elapsedMs` (a negative delay)
 * rather than starting again on every poll.
 */
export function statusMark(state: MarkState, elapsedMs: number): string {
  const at = Math.round(state === 'reading' ? elapsedMs % SPIN_MS : Math.min(elapsedMs, DONE_MS));
  const glyph = GLYPH[state];
  return `<svg class="smark" data-state="${state}" style="--sm-at:-${at}ms" viewBox="0 0 24 24" aria-hidden="true">`
    + '<circle class="sm-ring" cx="12" cy="12" r="9"/><circle class="sm-arc" cx="12" cy="12" r="9" pathLength="1"/>'
    + (glyph ? `<path class="sm-glyph" pathLength="1" d="${glyph}"/>` : '') + '</svg>';
}
