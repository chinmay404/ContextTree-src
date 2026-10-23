'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardSummary, EngineApi } from '@/components/board/api/types';

export const UNDO_MS = 10_000;

const hasKeepalive = (a: EngineApi): a is EngineApi & { deleteBoardKeepalive(id: string): void } =>
  typeof (a as { deleteBoardKeepalive?: unknown }).deleteBoardKeepalive === 'function';

type Pending<B> = { board: B; timer: ReturnType<typeof setTimeout> };

/**
 * Delete is deferred client-side: the DELETE is sent when the Undo toast expires (10 s), when the page is left,
 * or, as a keepalive request, when the tab is closed inside the window.
 */
export function useDeferredDelete<B extends BoardSummary>(
  api: EngineApi,
  cb: { onRemoved(b: B): void; onRestored(b: B): void; onFailed(): void },
) {
  const pending = useRef(new Map<string, Pending<B>>());
  const [toasts, setToasts] = useState<B[]>([]);
  const cbRef = useRef(cb);
  useEffect(() => { cbRef.current = cb; });

  const isPending = useCallback((id: string) => pending.current.has(id), []);

  const remove = useCallback((b: B) => {
    cbRef.current.onRemoved(b);
    setToasts((t) => [...t, b]);
    const timer = setTimeout(() => {
      pending.current.delete(b.id);
      setToasts((t) => t.filter((x) => x.id !== b.id));
      api.deleteBoard(b.id).catch(() => cbRef.current.onFailed());
    }, UNDO_MS);
    pending.current.set(b.id, { board: b, timer });
  }, [api]);

  const undo = useCallback((b: B) => {
    const p = pending.current.get(b.id);
    if (!p) return;
    clearTimeout(p.timer);
    pending.current.delete(b.id);
    setToasts((t) => t.filter((x) => x.id !== b.id));
    cbRef.current.onRestored(b);
  }, []);

  // Leaving the page sends any deletes still waiting on their Undo window.
  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const p of map.values()) { clearTimeout(p.timer); void api.deleteBoard(p.board.id).catch(() => {}); }
      map.clear();
    };
  }, [api]);

  // Closing the tab inside the window still deletes: a keepalive DELETE survives unload.
  useEffect(() => {
    const onHide = () => {
      for (const p of pending.current.values()) {
        clearTimeout(p.timer);
        if (hasKeepalive(api)) api.deleteBoardKeepalive(p.board.id);
        else void api.deleteBoard(p.board.id).catch(() => {});
      }
      pending.current.clear();
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [api]);

  return { toasts, isPending, remove, undo };
}
