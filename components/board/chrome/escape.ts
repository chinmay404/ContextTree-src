'use client';
import { useEffect, useRef } from 'react';

type Entry = { run: () => void };
const stack: Entry[] = [];

/** Registers an Escape handler on top of the stack; returns its removal. */
export function pushEscape(run: () => void): () => void {
  const e: Entry = { run };
  stack.push(e);
  return () => { const i = stack.indexOf(e); if (i >= 0) stack.splice(i, 1); };
}

/** Runs the newest handler. False when the stack is empty (the board's own fallback then runs). */
export function runEscape(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.run();
  return true;
}

/** While `active`, Escape calls `onEscape` before anything opened earlier (LIFO). Board's one keydown listener calls the top. */
export function useEscape(active: boolean, onEscape: () => void): void {
  const ref = useRef(onEscape);
  useEffect(() => { ref.current = onEscape; });
  useEffect(() => (active ? pushEscape(() => ref.current()) : undefined), [active]);
}
