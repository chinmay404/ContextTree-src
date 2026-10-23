export const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/** True when the event came from a field the user is typing in: board shortcuts must leave it alone. */
export const typing = (t: EventTarget | null): t is HTMLElement =>
  t instanceof HTMLElement && !!t.closest('textarea, input, select, [contenteditable="true"], [contenteditable="plaintext-only"]');
