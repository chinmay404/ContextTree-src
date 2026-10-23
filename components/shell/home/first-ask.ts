import type { Id } from '@/components/board/api/types';

const FIRST = 'ct-first-ask';
const PENDING = 'ct-pending-ask';

const ss = (s?: Storage | null): Storage | null => {
  if (s !== undefined) return s;
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; }
};

/** Hands the first question to the board that was just made for it. */
export function writeFirstAsk(boardId: Id, text: string, s?: Storage | null): void {
  try { ss(s)?.setItem(FIRST, JSON.stringify({ boardId, text })); } catch { /* storage blocked */ }
}

function read(boardId: Id, s?: Storage | null): { store: Storage; text: string } | null {
  try {
    const store = ss(s);
    const raw = store?.getItem(FIRST);
    if (!store || !raw) return null;
    const v = JSON.parse(raw) as { boardId?: string; text?: string };
    return v.boardId === boardId && typeof v.text === 'string' && v.text ? { store, text: v.text } : null;
  } catch { return null; }
}

/** Reads without clearing (a render may run twice). */
export function peekFirstAsk(boardId: Id, s?: Storage | null): string | null {
  return read(boardId, s)?.text ?? null;
}

/** Returns the question and clears it, only for the board it was written for. */
export function takeFirstAsk(boardId: Id, s?: Storage | null): string | null {
  const r = read(boardId, s);
  if (!r) return null;
  try { r.store.removeItem(FIRST); } catch { /* storage blocked */ }
  return r.text;
}

/** A question typed before any key was saved: kept across a reload. */
export function writePendingAsk(text: string, s?: Storage | null): void {
  try { ss(s)?.setItem(PENDING, text); } catch { /* storage blocked */ }
}

export function takePendingAsk(s?: Storage | null): string | null {
  try {
    const store = ss(s);
    const v = store?.getItem(PENDING) ?? null;
    if (v !== null) store?.removeItem(PENDING);
    return v || null;
  } catch { return null; }
}

/** A board title from the first question: one line, at most 80 characters. */
export function cutTitle(text: string, max = 80): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max - 1) + '…';
}
