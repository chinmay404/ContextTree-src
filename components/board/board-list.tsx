'use client';
import './pebble.css';
import './board-list.css';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { bricolage } from './fonts';
import { newId } from './api/ids';
import { ApiError, type BoardSummary, type EngineApi } from './api/types';

const UNDO_MS = 10_000;

const newestFirst = (a: BoardSummary, b: BoardSummary): number =>
  a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;

const ago = (iso: string): string => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
};

const hasKeepalive = (a: EngineApi): a is EngineApi & { deleteBoardKeepalive(id: string): void } =>
  typeof (a as { deleteBoardKeepalive?: unknown }).deleteBoardKeepalive === 'function';

type Pending = { board: BoardSummary; timer: ReturnType<typeof setTimeout> };

/** The user's boards, newest first. Delete is deferred client-side: the DELETE is sent when the Undo toast expires. */
export function BoardList({ api, query = '' }: { api: EngineApi; query?: string }): ReactElement {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<BoardSummary | null>(null);
  const [toasts, setToasts] = useState<BoardSummary[]>([]);
  const pending = useRef(new Map<string, Pending>());

  const load = useCallback(async () => {
    setError(false);
    try {
      const list = await api.listBoards();
      // Boards waiting on their Undo window stay hidden even if the server still lists them.
      setBoards(list.filter((b) => !pending.current.has(b.id)).sort(newestFirst));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace('/auth/signin?callbackUrl=%2Fboards');
        return;
      }
      setError(true);
    }
  }, [api, router]);

  useEffect(() => { void load(); }, [load]);

  // Leaving the page sends any deletes still waiting on their Undo window.
  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const p of map.values()) { clearTimeout(p.timer); void api.deleteBoard(p.board.id).catch(() => {}); }
      map.clear();
    };
  }, [api]);

  // Closing the tab inside the Undo window still deletes: a keepalive DELETE survives unload.
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

  // Confirm sheet: focus goes in, Escape and Tab stay inside, focus returns to where it was.
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const open = confirm !== null;
  useEffect(() => {
    if (!open) return;
    const from = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setConfirm(null); return; }
      if (e.key !== 'Tab') return;
      const first = cancelRef.current, last = confirmRef.current;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); from?.focus?.(); };
  }, [open]);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    const id = newId('b');
    try {
      await api.createBoard({ id, title: 'Untitled board' });
      router.push(`/b/${id}${query}`);
    } catch {
      setCreating(false);
      setError(true);
    }
  };

  const rename = async (b: BoardSummary, raw: string) => {
    setRenaming(null);
    const title = raw.trim();
    if (!title || title === b.title) return;
    setBoards((l) => l && l.map((x) => (x.id === b.id ? { ...x, title } : x)));
    try { await api.updateBoard(b.id, { title }); } catch { void load(); }
  };

  const remove = (b: BoardSummary) => {
    setConfirm(null);
    setBoards((l) => l && l.filter((x) => x.id !== b.id));
    setToasts((t) => [...t, b]);
    const timer = setTimeout(() => {
      pending.current.delete(b.id);
      setToasts((t) => t.filter((x) => x.id !== b.id));
      api.deleteBoard(b.id).catch(() => { void load(); });
    }, UNDO_MS);
    pending.current.set(b.id, { board: b, timer });
  };

  const undo = (b: BoardSummary) => {
    const p = pending.current.get(b.id);
    if (!p) return;
    clearTimeout(p.timer);
    pending.current.delete(b.id);
    setToasts((t) => t.filter((x) => x.id !== b.id));
    setBoards((l) => (l ? [...l, b].sort(newestFirst) : l));
  };

  return (
    <div className={`pb-root bl-root ${bricolage.variable}`}>
      <main className="bl-main">
        <header className="bl-head">
          <h1>Your boards</h1>
          <button className="btn primary" onClick={() => void create()} disabled={creating}>New board</button>
        </header>

        {error && (
          <div className="bl-note" role="alert">
            <span>Couldn&apos;t reach your boards.</span>
            <button className="btn" onClick={() => void load()}>Try again</button>
          </div>
        )}
        {!error && boards === null && <p className="bl-empty">Loading…</p>}
        {boards && boards.length === 0 && <p className="bl-empty">No boards yet. Start one with &ldquo;New board&rdquo;.</p>}

        <ul className="bl-rows">
          {boards?.map((b) => (
            <li key={b.id} className="bl-row" data-board-row={b.id}>
              {renaming === b.id ? (
                <input
                  className="bl-input"
                  aria-label="Board name"
                  autoFocus
                  defaultValue={b.title}
                  maxLength={120}
                  onBlur={(e) => void rename(b, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') { e.currentTarget.value = b.title; e.currentTarget.blur(); }
                  }}
                />
              ) : (
                <button className="bl-open" onClick={() => router.push(`/b/${b.id}${query}`)}>
                  <span className="bl-title">{b.title}</span>
                  <span className="bl-meta">{b.cardCount} {b.cardCount === 1 ? 'card' : 'cards'} · {ago(b.updatedAt)}</span>
                </button>
              )}
              <button className="btn" aria-label="Rename" onClick={() => setRenaming(b.id)}>Rename</button>
              <button className="btn" aria-label="Delete" onClick={() => setConfirm(b)}>Delete</button>
            </li>
          ))}
        </ul>
      </main>

      {confirm && (
        <div className="bl-scrim" onClick={() => setConfirm(null)}>
          <div className="bl-sheet" role="dialog" aria-modal="true" aria-label="Delete board" onClick={(e) => e.stopPropagation()}>
            <p>Delete &ldquo;{confirm.title}&rdquo;? You can undo for 10 seconds.</p>
            <div className="bl-sheet-actions">
              <button ref={cancelRef} className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button ref={confirmRef} className="btn primary" onClick={() => remove(confirm)}>Delete board</button>
            </div>
          </div>
        </div>
      )}

      <div className="bl-toasts" aria-live="polite">
        {toasts.map((b) => (
          <div key={b.id} className="bl-toast" role="status">
            <span>Board deleted</span>
            <button className="bl-undo" onClick={() => undo(b)}>Undo</button>
          </div>
        ))}
      </div>
    </div>
  );
}
