'use client';
import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { BoardProps } from './Board';
import type { BoardEngine } from './engine/board-engine';
import type { BoardSnapshot, BoardStore } from './store';

export interface BoardContextValue { store: BoardStore; engine: BoardEngine | null; props: BoardProps }

export const BoardContext = createContext<BoardContextValue | null>(null);

/** The board's store, engine and props; only inside <Board>. */
export function useBoard(): BoardContextValue {
  const v = useContext(BoardContext);
  if (!v) throw new Error('useBoard() is only available inside <Board>');
  return v;
}

/** The store snapshot; re-renders on every store change. */
export function useSnapshot(): BoardSnapshot {
  const { store } = useBoard();
  const subscribe = useCallback((fn: () => void) => store.subscribe(fn), [store]);
  const get = useCallback(() => store.getSnapshot(), [store]);
  return useSyncExternalStore(subscribe, get, get);
}
